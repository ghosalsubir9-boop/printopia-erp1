/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Layers, 
  DollarSign, 
  ShieldAlert, 
  Activity, 
  Calculator, 
  ArrowRight, 
  CheckCircle, 
  HardDrive, 
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { ERPState, Machine, Paper, RateConfig } from '../types';

interface DashboardProps {
  state: ERPState;
  onNavigate: (view: string) => void;
}

export default function Dashboard({ state, onNavigate }: DashboardProps) {
  // Calculator playground state
  const [selectedMachineId, setSelectedMachineId] = useState(state.machines[0]?.id || '');
  const [selectedPaperId, setSelectedPaperId] = useState(state.papers[0]?.id || '');
  const [sheetQuantity, setSheetQuantity] = useState(1000);
  const [platesNeeded, setPlatesNeeded] = useState(4);
  const [enableLamination, setEnableLamination] = useState(true);
  const [enableBinding, setEnableBinding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active counts
  const activeMachines = state.machines.filter(m => m.status === 'active').length;
  const inStockPapers = state.papers.filter(p => p.status === 'in_stock').length;
  const lowStockPapers = state.papers.filter(p => p.status === 'low_stock').length;

  const currentMachine = useMemo(() => {
    return state.machines.find(m => m.id === selectedMachineId);
  }, [state.machines, selectedMachineId]);

  const currentPaper = useMemo(() => {
    return state.papers.find(p => p.id === selectedPaperId);
  }, [state.papers, selectedPaperId]);

  // Live calculation based on admin configured parameters
  const calculationResult = useMemo(() => {
    if (!currentMachine || !currentPaper) return null;

    let paperCost = 0;
    let paperWeightKg = 0;

    // Standard paper weight calculation: (GSM * Length_Inches * Width_Inches) / 15500000 * RatePerKg * TotalSheets
    if (currentPaper.ratePerKg > 0) {
      // Parse sizes e.g. "23x36"
      const dimensions = currentPaper.size.toLowerCase().split('x');
      const length = parseFloat(dimensions[0]) || 23;
      const width = parseFloat(dimensions[1]) || 36;
      
      const singleSheetWeightKg = (currentPaper.gsm * length * width) / 1550000; // factor
      paperWeightKg = singleSheetWeightKg * sheetQuantity;
      paperCost = Math.round(paperWeightKg * currentPaper.ratePerKg);
    } else {
      // Flat rate per sheet
      paperCost = currentPaper.ratePerSheet * sheetQuantity;
    }

    // Plate cost
    const totalPlateCost = currentMachine.type === 'offset' 
      ? (currentMachine.plateCost * platesNeeded)
      : 0;

    // Printing charge
    let printingCharge = 0;
    if (currentMachine.type === 'offset') {
      const runCost = (sheetQuantity / 1000) * 150 * currentMachine.colorCapacity;
      printingCharge = Math.max(currentMachine.minimumCharge, runCost);
    } else if (currentMachine.type === 'digital') {
      printingCharge = Math.max(currentMachine.minimumCharge, sheetQuantity * currentMachine.clickCharge);
    } else {
      printingCharge = currentMachine.minimumCharge;
    }

    // Post-press calculations based on configured rates
    let postPressCost = 0;
    const laminationRate = state.rates.find(r => r.activity === 'lamination');
    const bindingRate = state.rates.find(r => r.activity === 'binding');

    let laminationCost = 0;
    if (enableLamination && laminationRate) {
      const dimensions = currentPaper.size.toLowerCase().split('x');
      const length = parseFloat(dimensions[0]) || 23;
      const width = parseFloat(dimensions[1]) || 36;
      const area = length * width;
      laminationCost = Math.max(
        laminationRate.minimumCharge,
        sheetQuantity * area * laminationRate.standardRate + laminationRate.setupCost
      );
      postPressCost += laminationCost;
    }

    let bindingCost = 0;
    if (enableBinding && bindingRate) {
      bindingCost = Math.max(
        bindingRate.minimumCharge,
        (sheetQuantity / 1000) * bindingRate.standardRate + bindingRate.setupCost
      );
      postPressCost += bindingCost;
    }

    const totalCost = paperCost + totalPlateCost + printingCharge + postPressCost;

    return {
      paperWeightKg: paperWeightKg.toFixed(2),
      paperCost,
      totalPlateCost,
      printingCharge,
      laminationCost,
      bindingCost,
      totalCost
    };
  }, [currentMachine, currentPaper, sheetQuantity, platesNeeded, enableLamination, enableBinding, state.rates]);

  const handleSaveJobCard = () => {
    if (!calculationResult) return;
    setToastMessage(`Job Card saved! Est. cost Rs. ${calculationResult.totalCost.toLocaleString()} queued for background synchronization.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white p-2.5 rounded text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in border border-emerald-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-150" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[10px] bg-emerald-700 hover:bg-emerald-800 px-1.5 py-0.5 rounded uppercase">
            Close
          </button>
        </div>
      )}

      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3.5 rounded border border-slate-200 shadow-xs">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900 leading-tight">
            Printopia ERP Workplace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise Management Engine for High-Capacity Commercial Presses & Medical Imagers
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${state.isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state.isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {state.isOnline ? 'CLOUD SYNC' : 'LOCAL ENGINE ACTIVE'}
          </span>
          <button 
            id="btn-nav-admin"
            onClick={() => onNavigate('admin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
          >
            Configure Admin Rates
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <Printer className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Press Machinery</p>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">{activeMachines} / {state.machines.length} Active</h3>
            <p className="text-[10px] text-emerald-600 font-medium">All units operational</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Paper Stocks</p>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">{state.papers.length} Formats</h3>
            <p className="text-[10px] text-slate-500">
              <span className="font-bold text-amber-600">{lowStockPapers} low stock</span> alerts
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Configured Rates</p>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">{state.rates.length} Activities</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Dynamic math formulas</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <Activity className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Media</p>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">{state.hospitalSpecs.length} Specifications</h3>
            <p className="text-[10px] text-slate-500">Medical Blue/Clear Films</p>
          </div>
        </div>
      </div>

      {/* Main Core Section: Interactive Live Estimation Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Estimation Calculator Inputs (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded border border-slate-200 shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h2 className="font-display text-sm font-bold text-slate-900">
                Formula Validation & Estimate Playground
              </h2>
            </div>
            <span className="text-[10px] text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              LIVE MATH ENGINE
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            This module dynamically computes production estimates in real-time by linking selected machines, standard paper stocks, color options, and bindery rates straight from the <strong>Admin Control Panel</strong>. Modify variables below to verify custom mathematical formulas offline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Press & Paper */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Select Press Machine (Hourly & Plate Rates)
                </label>
                <select
                  id="calc-machine-select"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {state.machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type.toUpperCase()})
                    </option>
                  ))}
                </select>
                {currentMachine && (
                  <div className="mt-1 text-[10px] text-slate-500 flex flex-col gap-0.5 font-mono px-0.5">
                    <span>• Min Charge: Rs. {currentMachine.minimumCharge} | Colors: {currentMachine.colorCapacity}</span>
                    {currentMachine.type === 'offset' && <span>• Plate Cost: Rs. {currentMachine.plateCost}/plate</span>}
                    {currentMachine.type === 'digital' && <span>• Click Charge: Rs. {currentMachine.clickCharge}/page</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Select Paper Stock (GSM, Size, Rates)
                </label>
                <select
                  id="calc-paper-select"
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {state.papers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.gsm}GSM ({p.size})
                    </option>
                  ))}
                </select>
                {currentPaper && (
                  <div className="mt-1 text-[10px] text-slate-500 flex flex-col gap-0.5 font-mono px-0.5">
                    <span>• Rate: {currentPaper.ratePerKg ? `Rs. ${currentPaper.ratePerKg}/Kg` : `Rs. ${currentPaper.ratePerSheet}/Sheet`}</span>
                    <span>• Status: <span className={currentPaper.status === 'in_stock' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>{currentPaper.status.toUpperCase().replace('_', ' ')}</span></span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Impressions / Quantity (Sheets)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="calc-qty-range"
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={sheetQuantity}
                    onChange={(e) => setSheetQuantity(parseInt(e.target.value))}
                    className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <input
                    id="calc-qty-input"
                    type="number"
                    value={sheetQuantity}
                    onChange={(e) => setSheetQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-20 bg-slate-50 border border-slate-250 rounded px-2 py-1 text-center text-xs font-bold text-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Color, Binding & Post Press */}
            <div className="space-y-3.5">
              {currentMachine?.type === 'offset' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Plates Needed (Depends on Job Colors)
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 4, 8].map(n => (
                      <button
                        key={n}
                        id={`btn-plates-${n}`}
                        onClick={() => setPlatesNeeded(n)}
                        className={`flex-1 py-1 rounded text-[11px] font-bold border transition-all ${platesNeeded === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {n} {n === 1 ? 'Plate' : 'Plates'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">1 plate per color. Double for front/back.</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded border border-slate-150 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Finishing Operations:</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      id="checkbox-lamination"
                      type="checkbox"
                      checked={enableLamination}
                      onChange={(e) => setEnableLamination(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <label htmlFor="checkbox-lamination" className="text-xs font-medium text-slate-700">
                      Thermal Lamination (Sq. Inch)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {state.rates.find(r => r.activity === 'lamination')?.standardRate ? `Rs. ${state.rates.find(r => r.activity === 'lamination')?.standardRate}/sq.in` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      id="checkbox-binding"
                      type="checkbox"
                      checked={enableBinding}
                      onChange={(e) => setEnableBinding(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <label htmlFor="checkbox-binding" className="text-xs font-medium text-slate-700">
                      Perfect Cover Binding (k books)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {state.rates.find(r => r.activity === 'binding')?.standardRate ? `Rs. ${state.rates.find(r => r.activity === 'binding')?.standardRate}/k` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Formula display */}
              <div className="p-2 bg-blue-50/50 rounded border border-blue-100">
                <span className="text-[9px] uppercase font-bold text-blue-700 tracking-wider block">Formula Applied</span>
                <p className="text-[10px] text-blue-950 font-mono mt-0.5 line-clamp-2" title={state.formulas[0]?.formulaExpression}>
                  {currentMachine?.type === 'offset' ? state.formulas[0]?.formulaExpression : 'Digital print click calculations'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estimation Output Ticket Breakdown (1 col) */}
        <div className="bg-slate-900 text-slate-100 rounded p-4 flex flex-col justify-between shadow-xs border border-slate-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Estimate Docket</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Automated Job Card</p>
              </div>
              <div className="p-1.5 bg-slate-800 text-blue-400 rounded">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>

            {/* Values details */}
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>Paper Weight:</span>
                <span className="text-white font-bold">{calculationResult?.paperWeightKg} Kg</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/60 pb-1.5">
                <span>Paper Cost:</span>
                <span className="text-emerald-400 font-bold">Rs. {calculationResult?.paperCost}</span>
              </div>

              {currentMachine?.type === 'offset' && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Plate Charge ({platesNeeded} plates):</span>
                  <span className="text-white">Rs. {calculationResult?.totalPlateCost}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-400">
                <span>Press Print Charge:</span>
                <span className="text-white">Rs. {calculationResult?.printingCharge}</span>
              </div>

              {enableLamination && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Finishing Lamination:</span>
                  <span className="text-white">Rs. {calculationResult?.laminationCost}</span>
                </div>
              )}

              {enableBinding && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Bindery Finish:</span>
                  <span className="text-white">Rs. {calculationResult?.bindingCost}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-800 space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Est. Production Cost</span>
                <div className="text-2xl font-bold font-display text-emerald-400 leading-tight">
                  Rs. {calculationResult?.totalCost?.toLocaleString()}
                </div>
              </div>
              <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                EX-TAX
              </span>
            </div>

            <button
              id="btn-print-estimate"
              onClick={handleSaveJobCard}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Save Job Card
            </button>
          </div>
        </div>
      </div>

      {/* Database Schema Sync & Offline Status */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-slate-500" />
            <h3 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider">
              Offline Storage Engine (SQLite / IndexedDB Schema Map)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <HardDrive className="w-3.5 h-3.5" />
            Sync Status: 100% Ok
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <p className="leading-relaxed text-[11px]">
              Printopia ERP operates with a smart hybrid local storage cache that models SQL tables. Under offline conditions, calculations run immediately via client-side scripts. When network connectivity is restored, operations are queued and written back to the central PostgreSQL cloud storage.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-1.5 font-mono text-[9px]">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                print_machines ({state.machines.length} cols)
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                paper_inventory ({state.papers.length} cols)
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                rate_cards ({state.rates.length} cols)
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                diagnostic_specs ({state.hospitalSpecs.length} cols)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Restoration Queue logs</h4>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {state.syncHistory.map((log) => (
                <div key={log.id} className="p-2 bg-slate-50 border border-slate-150 rounded flex items-start gap-2 text-[10px]">
                  <div className={`p-0.5 rounded-sm mt-0.5 ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <CheckCircle className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-700">{log.action}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5 text-[9px] font-mono leading-tight">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
