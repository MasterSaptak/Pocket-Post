import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AuditAction = 
  | 'USER_BAN' 
  | 'USER_UNBAN' 
  | 'USER_PROMOTE' 
  | 'USER_DEMOTE' 
  | 'TASK_DELETE' 
  | 'TASK_OVERRIDE' 
  | 'TASK_PIN' 
  | 'SYSTEM_CONFIG_CHANGE';

export interface AuditLog {
  action: AuditAction;
  adminId: string;
  adminEmail: string;
  targetId?: string;
  targetType?: 'user' | 'task' | 'system';
  details: string;
  timestamp: any;
  metadata?: Record<string, any>;
}

/**
 * Logs an administrative action to the global audit trail.
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: AuditAction,
  details: string,
  target?: { id: string; type: 'user' | 'task' | 'system' },
  metadata?: Record<string, any>
) {
  try {
    const logRef = collection(db, 'auditLogs');
    await addDoc(logRef, {
      action,
      adminId,
      adminEmail,
      targetId: target?.id || null,
      targetType: target?.type || null,
      details,
      metadata: metadata || {},
      timestamp: serverTimestamp(),
    });
    console.log(`[Audit] Action logged: ${action} by ${adminEmail}`);
    return { success: true };
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
    return { success: false, error };
  }
}
