/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MachineMasterItem, SheetMappingItem, PrintingMethod } from '../types';
import { initialMachineMasterItems } from '../seedData';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_machine_master_registry_v3';

// Helper to simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Service class that acts as the API layer.
 * Currently backed by LocalStorage, but fully structured as asynchronous
 * API endpoints matching:
 * - GET /api/machines
 * - POST /api/machines
 * - PUT /api/machines/:id
 * - DELETE /api/machines/:id
 * - GET /api/machine-sheet-mapping
 */
export class MachineApiService {
  private static getStoredMachines(): MachineMasterItem[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMachineMasterItems));
      return initialMachineMasterItems;
    }
    try {
      const parsed = JSON.parse(data) as MachineMasterItem[];
      return parsed;
    } catch (e) {
      console.error('Error reading machine database from LocalStorage:', e);
      return initialMachineMasterItems;
    }
  }

  private static saveMachinesToStorage(machines: MachineMasterItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  }

  /**
   * GET /machines
   * Retrieves all machines from the registry, supporting optional filtering and search parameters.
   */
  public static async getMachines(filters?: {
    searchTerm?: string;
    machineType?: string;
    status?: string;
    printingMethod?: string;
  }): Promise<MachineMasterItem[]> {
    await delay(350); // Simulate network latency
    let machines = this.getStoredMachines();
    const currentCompanyId = AuthService.getCurrentCompanyId();

    machines = machines.filter((m) => !m.companyId || m.companyId === currentCompanyId);

    if (filters) {
      const { searchTerm, machineType, status, printingMethod } = filters;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        machines = machines.filter(
          (m) =>
            m.machineName.toLowerCase().includes(query) ||
            m.machineCode.toLowerCase().includes(query) ||
            m.manufacturer.toLowerCase().includes(query) ||
            m.machineType.toLowerCase().includes(query)
        );
      }
      if (machineType && machineType !== 'All') {
        machines = machines.filter((m) => m.machineType === machineType);
      }
      if (status && status !== 'All') {
        machines = machines.filter((m) => m.status === status);
      }
      if (printingMethod && printingMethod !== 'All') {
        machines = machines.filter((m) =>
          m.supportedPrintingMethods.includes(printingMethod as PrintingMethod)
        );
      }
    }

    return machines;
  }

  /**
   * GET /machines/:id
   * Retrieves details of a specific machine.
   */
  public static async getMachineById(id: string): Promise<MachineMasterItem | null> {
    await delay(150);
    const machines = this.getStoredMachines();
    return machines.find((m) => m.id === id) || null;
  }

  /**
   * POST /machines
   * Registers a new machine spec in the database.
   */
  public static async createMachine(machine: Omit<MachineMasterItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MachineMasterItem> {
    await delay(400);
    const machines = this.getStoredMachines();
    
    // Server-side equivalent validations
    const codeExists = machines.some(
      (m) => m.machineCode.toLowerCase() === machine.machineCode.toLowerCase()
    );
    if (codeExists) {
      throw new Error(`Machine Code '${machine.machineCode}' already registered in the system.`);
    }

    const currentCompanyId = AuthService.getCurrentCompanyId();
    const newMachine: MachineMasterItem = {
      ...machine,
      id: `mm-${Date.now()}`,
      companyId: machine.companyId || currentCompanyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'subir.ghosal', // Current User in session
      updatedBy: 'subir.ghosal'
    };

    machines.unshift(newMachine);
    this.saveMachinesToStorage(machines);
    return newMachine;
  }

  /**
   * PUT /machines/:id
   * Updates an existing machine's specification.
   */
  public static async updateMachine(id: string, updatedFields: Partial<MachineMasterItem>): Promise<MachineMasterItem> {
    await delay(400);
    const machines = this.getStoredMachines();
    const index = machines.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new Error(`Machine with ID '${id}' not found in the registry.`);
    }

    // Server-side code unique validation check
    if (updatedFields.machineCode) {
      const codeExists = machines.some(
        (m) => m.machineCode.toLowerCase() === updatedFields.machineCode?.toLowerCase() && m.id !== id
      );
      if (codeExists) {
        throw new Error(`Machine Code '${updatedFields.machineCode}' is already taken by another machine.`);
      }
    }

    const updatedMachine: MachineMasterItem = {
      ...machines[index],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
      updatedBy: 'subir.ghosal' // Logged in user updating
    };

    machines[index] = updatedMachine;
    this.saveMachinesToStorage(machines);
    return updatedMachine;
  }

  /**
   * DELETE /machines/:id
   * Removes a machine from active service catalog.
   */
  public static async deleteMachine(id: string): Promise<boolean> {
    await delay(300);
    const machines = this.getStoredMachines();
    const initialLength = machines.length;

    const updated = machines.filter((m) => m.id !== id);
    if (updated.length === initialLength) {
      throw new Error(`Machine with ID '${id}' not found.`);
    }

    this.saveMachinesToStorage(updated);
    return true;
  }

  /**
   * GET /machine-sheet-mapping
   * Retrieves all parent-to-machine sheet configurations across all registered machinery.
   */
  public static async getAllSheetMappings(): Promise<{ machineId: string; machineName: string; mapping: SheetMappingItem }[]> {
    await delay(250);
    const machines = this.getStoredMachines();
    const result: { machineId: string; machineName: string; mapping: SheetMappingItem }[] = [];

    machines.forEach((m) => {
      m.sheetMappings.forEach((map) => {
        result.push({
          machineId: m.id,
          machineName: m.machineName,
          mapping: map
        });
      });
    });

    return result;
  }
}
