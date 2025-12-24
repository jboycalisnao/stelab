
import * as storage from './storageService';

/**
 * SyncService handles automated maintenance tasks for the SciLab Inventory System.
 */

export const performMaintenanceSync = async () => {
    console.log("[SyncService] Starting maintenance sync...");
    try {
        // This function now persists 'Overdue' statuses into the database
        // so that they are visible even when the app is closed.
        const result = await storage.syncOverdueStatus();
        
        console.log(`[SyncService] Audit complete. ${result.updated} records updated to Overdue.`);
        return { success: true, updated: result.updated };
    } catch (e) {
        console.error("[SyncService] Maintenance sync failed", e);
        return { success: false, error: e };
    }
};

/**
 * Sets up a recurring background refresh for an open application instance.
 */
export const setupAutoRefresh = (callback: () => void, intervalMs: number = 3600000) => {
    const timer = setInterval(() => {
        console.log("[SyncService] Triggering scheduled refresh...");
        callback();
    }, intervalMs);
    
    return () => clearInterval(timer);
};
