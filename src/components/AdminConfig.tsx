/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Printer, 
  Layers, 
  DollarSign, 
  FileCode, 
  Activity, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Settings2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  Machine, 
  Paper, 
  RateConfig, 
  FormulaConfig, 
  HospitalConfig,
  MachineType,
  PaperType,
  ActivityType,
  ActivityUnit
} from '../types';

interface AdminConfigProps {
  machines: Machine[];
  papers: Paper[];
  rates: RateConfig[];
  formulas: FormulaConfig[];
  hospitalSpecs: HospitalConfig[];
  onUpdateMachines: (machines: Machine[]) => void;
  onUpdatePapers: (papers: Paper[]) => void;
  onUpdateRates: (rates: RateConfig[]) => void;
  onUpdateFormulas: (formulas: FormulaConfig[]) => void;
  onUpdateHospitalSpecs: (specs: HospitalConfig[]) => void;
  triggerSyncLog: (action: string, module: string, details: string) => void;
}

type TabType = 'machines' | 'papers' | 'rates' | 'formulas' | 'hospital';

export default function AdminConfig({
  machines,
  papers,
  rates,
  formulas,
  hospitalSpecs,
  onUpdateMachines,
  onUpdatePapers,
  onUpdateRates,
  onUpdateFormulas,
  onUpdateHospitalSpecs,
  triggerSyncLog,
}: AdminConfigProps) {
  const [activeTab, setActiveTab] = useState<TabType>('machines');

  // Generic editing states
  const [editingId, setEditingId] = useState<string | null>(null);

  // Machine forms
  const [machineForm, setMachineForm] = useState<Partial<Machine>>({});
  const [showMachineForm, setShowMachineForm] = useState(false);

  // Paper forms
  const [paperForm, setPaperForm] = useState<Partial<Paper>>({});
  const [showPaperForm, setShowPaperForm] = useState(false);

  // Rate forms
  const [rateForm, setRateForm] = useState<Partial<RateConfig>>({});
  const [showRateForm, setShowRateForm] = useState(false);

  // Formula forms
  const [formulaForm, setFormulaForm] = useState<Partial<FormulaConfig>>({});

  // Hospital forms
  const [hospitalForm, setHospitalForm] = useState<Partial<HospitalConfig>>({});
  const [showHospitalForm, setShowHospitalForm] = useState(false);

  // --- MACHINE HANDLERS ---
  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineForm.name || !machineForm.type) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingId) {
      // Edit
      const updated = machines.map(m => m.id === editingId ? { ...m, ...machineForm } as Machine : m);
      onUpdateMachines(updated);
      triggerSyncLog('Update Machine', 'Admin Machine Panel', `Edited parameters of machine "${machineForm.name}"`);
      setEditingId(null);
    } else {
      // Add
      const newMachine: Machine = {
        id: `m-${Date.now()}`,
        name: machineForm.name,
        type: machineForm.type as MachineType,
        maxSheetSize: machineForm.maxSheetSize || '23x36',
        minSheetSize: machineForm.minSheetSize || '10x15',
        colorCapacity: machineForm.colorCapacity || 1,
        plateCost: machineForm.plateCost || 0,
        clickCharge: machineForm.clickCharge || 0,
        minimumCharge: machineForm.minimumCharge || 0,
        speedPerHour: machineForm.speedPerHour || 0,
        hourlyRate: machineForm.hourlyRate || 0,
        status: machineForm.status || 'active'
      };
      onUpdateMachines([...machines, newMachine]);
      triggerSyncLog('Register Machine', 'Admin Machine Panel', `Added new active machine "${machineForm.name}"`);
      setShowMachineForm(false);
    }
    setMachineForm({});
  };

  const handleDeleteMachine = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove machine: ${name}?`)) {
      onUpdateMachines(machines.filter(m => m.id !== id));
      triggerSyncLog('Deregister Machine', 'Admin Machine Panel', `Deregistered active machine "${name}"`);
    }
  };

  const startEditMachine = (m: Machine) => {
    setEditingId(m.id);
    setMachineForm(m);
    setShowMachineForm(true);
  };

  // --- PAPER HANDLERS ---
  const handleSavePaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperForm.name || !paperForm.type || !paperForm.gsm || !paperForm.size) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingId) {
      const updated = papers.map(p => p.id === editingId ? { ...p, ...paperForm } as Paper : p);
      onUpdatePapers(updated);
      triggerSyncLog('Update Paper stock', 'Admin Stock Panel', `Edited details of paper SKU "${paperForm.name}"`);
      setEditingId(null);
    } else {
      const newPaper: Paper = {
        id: `p-${Date.now()}`,
        name: paperForm.name,
        type: paperForm.type as PaperType,
        gsm: Number(paperForm.gsm),
        size: paperForm.size,
        ratePerKg: Number(paperForm.ratePerKg || 0),
        ratePerSheet: Number(paperForm.ratePerSheet || 0),
        packQuantity: Number(paperForm.packQuantity || 500),
        status: paperForm.status || 'in_stock'
      };
      onUpdatePapers([...papers, newPaper]);
      triggerSyncLog('Register Paper SKU', 'Admin Stock Panel', `Added new paper inventory SKU "${paperForm.name}"`);
      setShowPaperForm(false);
    }
    setPaperForm({});
  };

  const handleDeletePaper = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove paper stock: ${name}?`)) {
      onUpdatePapers(papers.filter(p => p.id !== id));
      triggerSyncLog('Decommission Stock SKU', 'Admin Stock Panel', `Decommissioned stock entry "${name}"`);
    }
  };

  const startEditPaper = (p: Paper) => {
    setEditingId(p.id);
    setPaperForm(p);
    setShowPaperForm(true);
  };

  // --- RATE HANDLERS ---
  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm.activity || !rateForm.unit) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingId) {
      const updated = rates.map(r => r.id === editingId ? { ...r, ...rateForm } as RateConfig : r);
      onUpdateRates(updated);
      triggerSyncLog('Modify Post-Press Rate', 'Admin Rates Panel', `Updated lamination/binding rates for "${rateForm.activity}"`);
      setEditingId(null);
    } else {
      const newRate: RateConfig = {
        id: `r-${Date.now()}`,
        activity: rateForm.activity as ActivityType,
        description: rateForm.description || '',
        unit: rateForm.unit as ActivityUnit,
        standardRate: Number(rateForm.standardRate || 0),
        minimumCharge: Number(rateForm.minimumCharge || 0),
        setupCost: Number(rateForm.setupCost || 0)
      };
      onUpdateRates([...rates, newRate]);
      triggerSyncLog('Register Post-Press Activity', 'Admin Rates Panel', `Added new finishing rate tier for "${rateForm.activity}"`);
      setShowRateForm(false);
    }
    setRateForm({});
  };

  const handleDeleteRate = (id: string, activity: string) => {
    if (confirm(`Are you sure you want to delete rate config for: ${activity}?`)) {
      onUpdateRates(rates.filter(r => r.id !== id));
      triggerSyncLog('Delete Post-Press Activity', 'Admin Rates Panel', `Deleted rate tier config for "${activity}"`);
    }
  };

  const startEditRate = (r: RateConfig) => {
    setEditingId(r.id);
    setRateForm(r);
    setShowRateForm(true);
  };

  // --- HOSPITAL SPECS HANDLERS ---
  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalForm.department || !hospitalForm.printMedium || !hospitalForm.standardSize) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingId) {
      const updated = hospitalSpecs.map(h => h.id === editingId ? { ...h, ...hospitalForm } as HospitalConfig : h);
      onUpdateHospitalSpecs(updated);
      triggerSyncLog('Update Diagnostic Specs', 'Admin Medical Panel', `Modified sizing & markup parameters for ${hospitalForm.department}`);
      setEditingId(null);
    } else {
      const newSpec: HospitalConfig = {
        id: `h-${Date.now()}`,
        department: hospitalForm.department,
        printMedium: hospitalForm.printMedium as any,
        standardSize: hospitalForm.standardSize,
        baseCostPerSheet: Number(hospitalForm.baseCostPerSheet || 0),
        sellingPricePerSheet: Number(hospitalForm.sellingPricePerSheet || 0),
        packSize: Number(hospitalForm.packSize || 100),
        currentStock: Number(hospitalForm.currentStock || 0)
      };
      onUpdateHospitalSpecs([...hospitalSpecs, newSpec]);
      triggerSyncLog('Add Diagnostic Specs', 'Admin Medical Panel', `Configured diagnostic medium specs for department: "${hospitalForm.department}"`);
      setShowHospitalForm(false);
    }
    setHospitalForm({});
  };

  const handleDeleteHospital = (id: string, dept: string) => {
    if (confirm(`Are you sure you want to delete medical specs for department: ${dept}?`)) {
      onUpdateHospitalSpecs(hospitalSpecs.filter(h => h.id !== id));
      triggerSyncLog('Delete Medical Specs', 'Admin Medical Panel', `Removed specs for department: "${dept}"`);
    }
  };

  const startEditHospital = (h: HospitalConfig) => {
    setEditingId(h.id);
    setHospitalForm(h);
    setShowHospitalForm(true);
  };

  // --- FORMULA HANDLERS ---
  const handleSaveFormula = (id: string, expr: string) => {
    const updated = formulas.map(f => f.id === id ? { ...f, formulaExpression: expr } : f);
    onUpdateFormulas(updated);
    triggerSyncLog('Modify Formula Expression', 'Admin Formulas Panel', `Updated algebraic estimation logic formula.`);
    alert('Mathematical Formula saved and deployed locally! All calculations will now apply this rule.');
  };

  return (
    <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
      {/* Header and Subtitles */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-blue-400" />
          <h2 className="font-display text-sm font-bold tracking-tight uppercase">Admin System Configuration Panel</h2>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Operational rates, machine parameters, paper catalogs, and estimation formulas. Changes are instantly persistent in our PostgreSQL and offline SQLite synchronizer.
        </p>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {[
            { id: 'machines', label: 'Press Machinery', icon: Printer },
            { id: 'papers', label: 'Paper & Film Catalog', icon: Layers },
            { id: 'rates', label: 'Finishing Rates', icon: DollarSign },
            { id: 'hospital', label: 'Diagnostic Film specs', icon: Activity },
            { id: 'formulas', label: 'Calculation Formulas', icon: FileCode },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-admin-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setEditingId(null);
                  setShowMachineForm(false);
                  setShowPaperForm(false);
                  setShowRateForm(false);
                  setShowHospitalForm(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-xs font-bold' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Admin Content Body */}
      <div className="p-4">
        
        {/* --- TAB 1: PRESS MACHINERY --- */}
        {activeTab === 'machines' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Press Fleet Management</h3>
                <p className="text-[11px] text-slate-500">Configure heavy offset presses, digital presses, and clinical imagers.</p>
              </div>
              {!showMachineForm && (
                <button
                  id="btn-add-machine"
                  onClick={() => {
                    setEditingId(null);
                    setMachineForm({ type: 'offset', status: 'active', colorCapacity: 4 });
                    setShowMachineForm(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Machine
                </button>
              )}
            </div>

            {showMachineForm && (
              <form onSubmit={handleSaveMachine} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                    {editingId ? 'Edit Press Specifications' : 'Register New Heavy Machinery'}
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => { setShowMachineForm(false); setEditingId(null); }}
                    className="p-1 hover:bg-slate-200 rounded-sm text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Machine / Printer Name *</label>
                    <input
                      id="input-machine-name"
                      type="text"
                      required
                      value={machineForm.name || ''}
                      onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                      placeholder="e.g. Heidelberg Speedmaster CD 102"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Technology Class *</label>
                    <select
                      id="select-machine-type"
                      required
                      value={machineForm.type || 'offset'}
                      onChange={(e) => setMachineForm({ ...machineForm, type: e.target.value as MachineType })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="offset">Commercial Offset Press</option>
                      <option value="digital">Digital Laser Press</option>
                      <option value="screen">Manual Screen Printing</option>
                      <option value="film_printer">Medical Dry-Film Printer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Color Capabilities</label>
                    <input
                      id="input-machine-colors"
                      type="number"
                      min="1"
                      max="10"
                      value={machineForm.colorCapacity || 1}
                      onChange={(e) => setMachineForm({ ...machineForm, colorCapacity: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Max Printable Sheet Size</label>
                    <input
                      id="input-machine-maxsize"
                      type="text"
                      value={machineForm.maxSheetSize || ''}
                      onChange={(e) => setMachineForm({ ...machineForm, maxSheetSize: e.target.value })}
                      placeholder="e.g. 23x36"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Min Printable Sheet Size</label>
                    <input
                      id="input-machine-minsize"
                      type="text"
                      value={machineForm.minSheetSize || ''}
                      onChange={(e) => setMachineForm({ ...machineForm, minSheetSize: e.target.value })}
                      placeholder="e.g. 10x15"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Machine Setup/Minimum Charge</label>
                    <input
                      id="input-machine-mincharge"
                      type="number"
                      value={machineForm.minimumCharge || 0}
                      onChange={(e) => setMachineForm({ ...machineForm, minimumCharge: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  {machineForm.type === 'offset' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">CTP Plate Cost (Per Plate)</label>
                      <input
                        id="input-machine-platecost"
                        type="number"
                        value={machineForm.plateCost || 0}
                        onChange={(e) => setMachineForm({ ...machineForm, plateCost: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                      />
                    </div>
                  )}

                  {machineForm.type === 'digital' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Click Charge (Per Page)</label>
                      <input
                        id="input-machine-clickcharge"
                        type="number"
                        value={machineForm.clickCharge || 0}
                        onChange={(e) => setMachineForm({ ...machineForm, clickCharge: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Production Speed (per Hr)</label>
                    <input
                      id="input-machine-speed"
                      type="number"
                      value={machineForm.speedPerHour || 0}
                      onChange={(e) => setMachineForm({ ...machineForm, speedPerHour: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Machine Status</label>
                    <select
                      id="select-machine-status"
                      value={machineForm.status || 'active'}
                      onChange={(e) => setMachineForm({ ...machineForm, status: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="active">Active (Production Ready)</option>
                      <option value="maintenance">Maintenance In Progress</option>
                      <option value="inactive">Decommissioned / Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setShowMachineForm(false); setEditingId(null); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-750 rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-machine"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    {editingId ? 'Save Specs' : 'Deploy Machine'}
                  </button>
                </div>
              </form>
            )}

            {/* Machines Table */}
            <div className="overflow-x-auto border border-slate-200 rounded shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-2">Machine Details</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Sizing Constraints</th>
                    <th className="p-2">Pricing Factors</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {machines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-2 font-semibold text-slate-900">
                        {m.name}
                        <span className="block text-[9px] text-slate-400 font-mono mt-0.5">ID: {m.id}</span>
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {m.type}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-[11px] text-slate-500">
                        Max: {m.maxSheetSize} | Min: {m.minSheetSize}
                      </td>
                      <td className="p-2 text-[11px] space-y-0.5 font-mono text-slate-600">
                        <div>Base Min Charge: Rs. {m.minimumCharge}</div>
                        {m.type === 'offset' && <div className="text-blue-600">Plate: Rs. {m.plateCost} / pl</div>}
                        {m.type === 'digital' && <div className="text-emerald-600">Click: Rs. {m.clickCharge} / pg</div>}
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          m.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : m.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <button
                          id={`btn-edit-machine-${m.id}`}
                          onClick={() => startEditMachine(m)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Machine Specifications"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-machine-${m.id}`}
                          onClick={() => handleDeleteMachine(m.id, m.name)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Machine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: PAPER CATALOG --- */}
        {activeTab === 'papers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Paper & Substrate Inventory Catalog</h3>
                <p className="text-[11px] text-slate-500">Configure core paper sizes, GSM parameters, and sheet weight conversion weights.</p>
              </div>
              {!showPaperForm && (
                <button
                  id="btn-add-paper"
                  onClick={() => {
                    setEditingId(null);
                    setPaperForm({ type: 'art_paper', status: 'in_stock', packQuantity: 500, gsm: 130 });
                    setShowPaperForm(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Paper SKU
                </button>
              )}
            </div>

            {showPaperForm && (
              <form onSubmit={handleSavePaper} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                    {editingId ? 'Edit Substrate Specifications' : 'Add New Substrate Material'}
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => { setShowPaperForm(false); setEditingId(null); }}
                    className="p-1 hover:bg-slate-200 rounded-sm text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Paper/Substrate Name *</label>
                    <input
                      id="input-paper-name"
                      type="text"
                      required
                      value={paperForm.name || ''}
                      onChange={(e) => setPaperForm({ ...paperForm, name: e.target.value })}
                      placeholder="e.g. Coated Silk Art Paper"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Material Classification *</label>
                    <select
                      id="select-paper-type"
                      required
                      value={paperForm.type || 'art_paper'}
                      onChange={(e) => setPaperForm({ ...paperForm, type: e.target.value as PaperType })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="art_paper">Art Paper (Gloss/Matte)</option>
                      <option value="maplitho">Maplitho (Standard Wove)</option>
                      <option value="duplex">Duplex board (Packaging)</option>
                      <option value="cardboard">Cardboard Sheets</option>
                      <option value="xray_film">Blue Medical X-Ray Film</option>
                      <option value="thermal_film">Diagnostic thermal paper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Substrate Density (GSM) *</label>
                    <input
                      id="input-paper-gsm"
                      type="number"
                      required
                      min="30"
                      max="600"
                      value={paperForm.gsm || ''}
                      onChange={(e) => setPaperForm({ ...paperForm, gsm: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Standard Sheet Dimension *</label>
                    <input
                      id="input-paper-size"
                      type="text"
                      required
                      placeholder="e.g. 23x36, 20x30, 18x23"
                      value={paperForm.size || ''}
                      onChange={(e) => setPaperForm({ ...paperForm, size: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Rate Per Kilogram (Offset)</label>
                    <input
                      id="input-paper-ratekg"
                      type="number"
                      value={paperForm.ratePerKg || 0}
                      onChange={(e) => setPaperForm({ ...paperForm, ratePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Rate Per Sheet (Diagnostic/Flat)</label>
                    <input
                      id="input-paper-ratesheet"
                      type="number"
                      value={paperForm.ratePerSheet || 0}
                      onChange={(e) => setPaperForm({ ...paperForm, ratePerSheet: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Sheets Per Ream/Pack</label>
                    <input
                      id="input-paper-packqty"
                      type="number"
                      value={paperForm.packQuantity || 500}
                      onChange={(e) => setPaperForm({ ...paperForm, packQuantity: parseInt(e.target.value) || 500 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Inventory Stock Status</label>
                    <select
                      id="select-paper-status"
                      value={paperForm.status || 'in_stock'}
                      onChange={(e) => setPaperForm({ ...paperForm, status: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="in_stock">In Stock (Normal)</option>
                      <option value="low_stock">Low Stock Warning</option>
                      <option value="out_of_stock">Out Of Stock</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setShowPaperForm(false); setEditingId(null); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-750 rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-paper"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    {editingId ? 'Save SKU' : 'Add Material'}
                  </button>
                </div>
              </form>
            )}

            {/* Papers Table */}
            <div className="overflow-x-auto border border-slate-200 rounded shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-2">Paper Stock Details</th>
                    <th className="p-2">Material Category</th>
                    <th className="p-2">GSM & Size</th>
                    <th className="p-2">Cost Basis</th>
                    <th className="p-2">Stock Alert</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {papers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-2 font-semibold text-slate-900">
                        {p.name}
                        <span className="block text-[9px] text-slate-400 font-mono mt-0.5">ID: {p.id}</span>
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {p.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-[11px] text-slate-600">
                        {p.gsm} GSM | Size: <span className="font-semibold text-slate-850">{p.size}</span>
                      </td>
                      <td className="p-2 text-[11px] font-mono text-slate-600">
                        {p.ratePerKg > 0 ? (
                          <div className="text-blue-600 font-bold">Rs. {p.ratePerKg} / Kilogram</div>
                        ) : (
                          <div className="text-emerald-600 font-bold">Rs. {p.ratePerSheet} / Sheet Flat</div>
                        )}
                        <span className="text-[9px] text-slate-400">Pack size: {p.packQuantity} sheets</span>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          p.status === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          p.status === 'low_stock' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <button
                          id={`btn-edit-paper-${p.id}`}
                          onClick={() => startEditPaper(p)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Paper"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-paper-${p.id}`}
                          onClick={() => handleDeletePaper(p.id, p.name)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 3: FINISHING RATES --- */}
        {activeTab === 'rates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Post-Press Bindery & Lamination Rate Card</h3>
                <p className="text-[11px] text-slate-500">Define standard finishing rates, lamination costs, setup fees, and binding variables.</p>
              </div>
              {!showRateForm && (
                <button
                  id="btn-add-rate"
                  onClick={() => {
                    setEditingId(null);
                    setRateForm({ activity: 'lamination', unit: 'sq_inch', standardRate: 0.1 });
                    setShowRateForm(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rate Tier
                </button>
              )}
            </div>

            {showRateForm && (
              <form onSubmit={handleSaveRate} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                    {editingId ? 'Modify Finishing Rate Config' : 'Configure New Post-Press finishing Task'}
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => { setShowRateForm(false); setEditingId(null); }}
                    className="p-1 hover:bg-slate-200 rounded-sm text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Finishing Activity *</label>
                    <select
                      id="select-rate-activity"
                      required
                      value={rateForm.activity || 'lamination'}
                      onChange={(e) => setRateForm({ ...rateForm, activity: e.target.value as ActivityType })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="plate_making">CTP Plate Processing</option>
                      <option value="lamination">Thermal/Gloss Lamination</option>
                      <option value="binding">Perfect/Hardcover Binding</option>
                      <option value="die_cutting">Die Punching/Creasing</option>
                      <option value="folding">Signature Machine Folding</option>
                      <option value="pasting">Manual/Auto Folding & Pasting</option>
                      <option value="stapling">Saddle Stitching/Stapling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Pricing Unit *</label>
                    <select
                      id="select-rate-unit"
                      required
                      value={rateForm.unit || 'sq_inch'}
                      onChange={(e) => setRateForm({ ...rateForm, unit: e.target.value as ActivityUnit })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="plate">Per CTP Plate Processed</option>
                      <option value="sq_inch">Per Square Inch of Sheet Area</option>
                      <option value="thousand_books">Per Thousand Bound Books</option>
                      <option value="sheet">Per Single Substrate Sheet</option>
                      <option value="thousand_sheets">Per Thousand Press Sheets Run</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Activity Description</label>
                    <input
                      id="input-rate-desc"
                      type="text"
                      value={rateForm.description || ''}
                      onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                      placeholder="e.g. Matt thermal film process"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Standard Rate (Rs. per Unit) *</label>
                    <input
                      id="input-rate-standard"
                      type="number"
                      step="any"
                      required
                      value={rateForm.standardRate !== undefined ? rateForm.standardRate : ''}
                      onChange={(e) => setRateForm({ ...rateForm, standardRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Setup Cost (One-time)</label>
                    <input
                      id="input-rate-setup"
                      type="number"
                      value={rateForm.setupCost || 0}
                      onChange={(e) => setRateForm({ ...rateForm, setupCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Job Minimum Billing Charge</label>
                    <input
                      id="input-rate-mincharge"
                      type="number"
                      value={rateForm.minimumCharge || 0}
                      onChange={(e) => setRateForm({ ...rateForm, minimumCharge: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setShowRateForm(false); setEditingId(null); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-755 rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-rate"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    {editingId ? 'Save Rate' : 'Commit Rate'}
                  </button>
                </div>
              </form>
            )}

            {/* Rates Table */}
            <div className="overflow-x-auto border border-slate-200 rounded shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-550/20 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="p-3">Finishing Activity</th>
                    <th className="p-3">Billing Metric</th>
                    <th className="p-3 text-right">Standard Rate</th>
                    <th className="p-3 text-right">Setup Fee</th>
                    <th className="p-3 text-right">Min Charge</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rates.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">
                        {r.activity.replace('_', ' ').toUpperCase()}
                        {r.description && <span className="block text-[11px] text-slate-400 font-normal mt-0.5">{r.description}</span>}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {r.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-bold text-slate-800">
                        Rs. {r.standardRate}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-slate-500">
                        Rs. {r.setupCost}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-indigo-600 font-semibold">
                        Rs. {r.minimumCharge}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          id={`btn-edit-rate-${r.id}`}
                          onClick={() => startEditRate(r)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Modify Rates"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-rate-${r.id}`}
                          onClick={() => handleDeleteRate(r.id, r.activity)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: HOSPITAL DIAGNOSTIC SPECS --- */}
        {activeTab === 'hospital' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Clinical/Hospital Film & Media specs</h3>
                <p className="text-[11px] text-slate-500">Configure radiology dry laser films, thermal rolls, and markup metrics for clinical print integration.</p>
              </div>
              {!showHospitalForm && (
                <button
                  id="btn-add-hospital"
                  onClick={() => {
                    setEditingId(null);
                    setHospitalForm({ printMedium: 'xray_film', packSize: 100, currentStock: 250 });
                    setShowHospitalForm(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Medical Medium
                </button>
              )}
            </div>

            {showHospitalForm && (
              <form onSubmit={handleSaveHospital} className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                    {editingId ? 'Modify Medical Spec parameters' : 'Register Clinical Print spec'}
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => { setShowHospitalForm(false); setEditingId(null); }}
                    className="p-1 hover:bg-slate-200 rounded-sm text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Hospital Department / Usage *</label>
                    <input
                      id="input-hosp-dept"
                      type="text"
                      required
                      value={hospitalForm.department || ''}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, department: e.target.value })}
                      placeholder="e.g. Radiology / MRI Diagnostic"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Clinical Print Medium *</label>
                    <select
                      id="select-hosp-medium"
                      required
                      value={hospitalForm.printMedium || 'xray_film'}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, printMedium: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="xray_film">Blue Base X-Ray Film</option>
                      <option value="mri_film">Clear Base Laser Film</option>
                      <option value="ultrasound_paper">Thermal Glossy Paper</option>
                      <option value="ecg_paper">ECG Grid Chart Paper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Standard Film Dimensions *</label>
                    <input
                      id="input-hosp-size"
                      type="text"
                      required
                      placeholder="e.g. 14x17, 11x14, 8x10, A4"
                      value={hospitalForm.standardSize || ''}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, standardSize: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Material Cost Price (per Sheet) *</label>
                    <input
                      id="input-hosp-cost"
                      type="number"
                      required
                      value={hospitalForm.baseCostPerSheet !== undefined ? hospitalForm.baseCostPerSheet : ''}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, baseCostPerSheet: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Hospital Selling Rate (per Sheet) *</label>
                    <input
                      id="input-hosp-sale"
                      type="number"
                      required
                      value={hospitalForm.sellingPricePerSheet !== undefined ? hospitalForm.sellingPricePerSheet : ''}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, sellingPricePerSheet: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Pack Size quantity</label>
                    <input
                      id="input-hosp-pack"
                      type="number"
                      value={hospitalForm.packSize || 100}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, packSize: parseInt(e.target.value) || 100 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Current On-Premise Stock</label>
                    <input
                      id="input-hosp-stock"
                      type="number"
                      value={hospitalForm.currentStock || 0}
                      onChange={(e) => setHospitalForm({ ...hospitalForm, currentStock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setShowHospitalForm(false); setEditingId(null); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-755 rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-hosp"
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                  >
                    {editingId ? 'Save Spec' : 'Register Spec'}
                  </button>
                </div>
              </form>
            )}

            {/* Hospital Table */}
            <div className="overflow-x-auto border border-slate-200 rounded shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-2">Hospital Department</th>
                    <th className="p-2">Medium & Size</th>
                    <th className="p-2 text-right">Base Cost (Sheet)</th>
                    <th className="p-2 text-right">Selling Price (Sheet)</th>
                    <th className="p-2 text-right">Clinical Markup</th>
                    <th className="p-2 text-right">On-Hand Stock</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hospitalSpecs.map((h) => {
                    const markup = h.sellingPricePerSheet - h.baseCostPerSheet;
                    const markupPct = h.baseCostPerSheet > 0 ? ((markup / h.baseCostPerSheet) * 100).toFixed(0) : "0";
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="p-2 font-semibold text-slate-900">
                          {h.department}
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">ID: {h.id}</span>
                        </td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            {h.printMedium.replace('_', ' ')}
                          </span>
                          <span className="block text-xs font-mono text-slate-500 mt-1 font-semibold">{h.standardSize}</span>
                        </td>
                        <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                          Rs. {h.baseCostPerSheet}
                        </td>
                        <td className="p-2 text-right font-mono text-[11px] text-slate-850 font-bold">
                          Rs. {h.sellingPricePerSheet}
                        </td>
                        <td className="p-2 text-right font-mono text-[11px] text-emerald-600 font-semibold">
                          +Rs. {markup} <span className="text-[10px] text-slate-400 font-sans font-normal">({markupPct}%)</span>
                        </td>
                        <td className="p-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-bold ${h.currentStock < 150 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-800'}`}>
                            {h.currentStock} sheets
                          </span>
                        </td>
                        <td className="p-2 text-right space-x-1">
                          <button
                            id={`btn-edit-hosp-${h.id}`}
                            onClick={() => startEditHospital(h)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit specs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-hosp-${h.id}`}
                            onClick={() => handleDeleteHospital(h.id, h.department)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remove specs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 5: ESTIMATION FORMULAS --- */}
        {activeTab === 'formulas' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Algebraic Pricing Calculation Formulas</h3>
              <p className="text-[11px] text-slate-500">Every single valuation factor is dynamic. Modify core mathematics variables directly below.</p>
            </div>

            <div className="space-y-4">
              {formulas.map((form) => (
                <div key={form.id} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-1.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{form.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{form.description}</p>
                    </div>
                    <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                      ID: {form.id}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Operational Algebraic Formula Definition</label>
                    <textarea
                      id={`textarea-formula-${form.id}`}
                      defaultValue={form.formulaExpression}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded p-2 font-mono text-xs leading-relaxed text-slate-800 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1 tracking-wider">Recognized Mathematical Inputs</span>
                    <div className="flex flex-wrap gap-1">
                      {form.variables.map((v, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[9px]">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1.5 border-t border-slate-200">
                    <button
                      id={`btn-save-formula-${form.id}`}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`textarea-formula-${form.id}`) as HTMLTextAreaElement;
                        if (el) handleSaveFormula(form.id, el.value);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Deploy Mathematical Model
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Config Formula warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 flex gap-2.5 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Caution when deploying algebraic formulas</p>
                <p className="mt-1 leading-relaxed text-amber-700">
                  Ensure variables matched exact string inputs. Mismatches will break active valuation outputs. Always review variables after completing modifications.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
