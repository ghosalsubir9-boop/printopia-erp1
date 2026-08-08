/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings2, 
  Wifi, 
  WifiOff, 
  Database, 
  CloudLightning,
  Menu,
  X,
  Bell,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldAlert,
  ServerCrash,
  FileText
} from 'lucide-react';
import { ERPState, SyncLog } from '../types';

import { AuthService } from '../services/authService';

interface ERPShellProps {
  state: ERPState;
  currentView: string;
  onNavigate: (view: string) => void;
  onToggleConnection: () => void;
  onTriggerBackup: () => void;
  children: React.ReactNode;
}

export default function ERPShell({
  state,
  currentView,
  onNavigate,
  onToggleConnection,
  onTriggerBackup,
  children,
}: ERPShellProps) {
  const currentUser = AuthService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Workplace Dashboard', icon: LayoutDashboard },
    { id: 'quotation', label: 'Quotation System', icon: FileText },
    { id: 'proforma-invoices', label: 'Proforma Invoice', icon: FileText },
    { id: 'admin', label: 'Admin Configuration', icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-slate-400 shrink-0 border-r border-slate-800 shadow-xs">
        
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-white tracking-tight">Printopia ERP</h1>
              <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase block">Enterprise Node</span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-2 py-1">Operations</div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white font-semibold shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-250'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </nav>

        {/* Connection status and actions footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-3">
          
          {/* Connection Toggler */}
          <div className="p-2 bg-slate-900 rounded border border-slate-805">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Connection Engine</span>
              <button
                id="btn-toggle-conn"
                onClick={onToggleConnection}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${state.isOnline ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${state.isOnline ? 'translate-x-3' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
              {state.isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span className="text-emerald-500 font-bold">SQL CENTRAL: ON</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500">LOCAL SQLITE: ON</span>
                </>
              )}
            </div>
          </div>

          {/* Database Admin Actions */}
          <button
            id="btn-db-backup"
            onClick={onTriggerBackup}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            Backup database
          </button>

          {/* Copyright/Credits */}
          <div className="text-[9px] text-slate-600 text-center font-mono">
            Printopia ERP v1.0.0
          </div>
        </div>
      </aside>

      {/* --- MOBILE CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile top navbar header */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CloudLightning className="w-4 h-4 text-blue-400" />
            <span className="font-display font-bold text-sm">Printopia ERP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-mobile-toggle-conn"
              onClick={onToggleConnection}
              className={`p-1 rounded border transition-colors ${state.isOnline ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'}`}
              title="Toggle Online/Offline State"
            >
              {state.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            </button>
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-slate-300 border-b border-slate-800 py-3 px-5 space-y-3 shadow-inner">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  id={`mobile-link-${item.id}`}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium ${currentView === item.id ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  {React.createElement(item.icon, { className: 'w-3.5 h-3.5' })}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-2.5 flex flex-col gap-2">
              <button
                id="btn-mobile-backup"
                onClick={() => {
                  onTriggerBackup();
                  setMobileMenuOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                Backup database
              </button>
              <div className="text-center text-[9px] text-slate-500 font-mono mt-1">
                Offline Mode: {state.isOnline ? 'DISABLED' : 'ENABLED'}
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN HEADER (DESKTOP AND SHARED CONTAINER) --- */}
        <header className="hidden md:flex bg-white h-14 border-b border-slate-200 px-6 items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Node ID</span>
            <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 text-slate-600 rounded border border-slate-200">
              node-0972c21b-df9d-4182-a00e-11d65e270ec4
            </span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Quick Status Ticker */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
              <span className={`w-1.5 h-1.5 rounded-full ${state.isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {state.isOnline ? 'CLOUD CONNECTED' : 'LOCAL HOST ACTIVE'}
              </span>
            </div>

            {/* Notifications panel toggle */}
            <div className="relative">
              <button
                id="btn-bell"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white rounded border border-slate-200 shadow-md p-3.5 z-50 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Notifications</span>
                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded-sm">1 Alert</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] leading-snug">
                      <p className="font-semibold text-slate-800">PostgreSQL Schema Synced</p>
                      <p className="text-slate-400 mt-0.5">Admin rate configurations successfully mirrored back to production cloud.</p>
                      <span className="text-[9px] text-slate-400 block mt-1">Just now</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center uppercase tracking-wider border border-slate-800 shadow-xs">
                {currentUser ? getInitials(currentUser.userName) : '??'}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-800">{currentUser?.userName || 'Unauthenticated'}</p>
                <p className="text-[9px] font-semibold text-slate-400">{currentUser?.role || 'Guest'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE VIEW CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-4 w-full mx-auto space-y-4">
          {children}
        </main>
      </div>
    </div>
  );
}
