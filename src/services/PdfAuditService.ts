import { AuthService } from './authService';

export interface PdfAuditEntry {
  id: string;
  userId: string;
  userName: string;
  role: string;
  documentType: string;
  documentNumber: string;
  action: 'Previewed' | 'Downloaded' | 'Printed';
  timestamp: string;
}

export class PdfAuditService {
  private static readonly KEY = 'printopia_pdf_audit_logs';

  static async logAction(documentType: string, documentNumber: string, action: 'Previewed' | 'Downloaded' | 'Printed') {
    const user = AuthService.getCurrentUser() || { userId: 'system', userName: 'System User', role: 'Admin' };
    
    const entry: PdfAuditEntry = {
      id: crypto.randomUUID(),
      userId: user.userId,
      userName: user.userName,
      role: user.role,
      documentType,
      documentNumber,
      action,
      timestamp: new Date().toISOString()
    };

    const logsStr = localStorage.getItem(this.KEY);
    const logs: PdfAuditEntry[] = logsStr ? JSON.parse(logsStr) : [];
    logs.unshift(entry);
    localStorage.setItem(this.KEY, JSON.stringify(logs));
    
    console.log(`[Audit] ${user.userName} ${action} ${documentType} ${documentNumber}`);
  }
}
