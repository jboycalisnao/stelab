
import * as storage from './storageService';
import * as notifications from './notificationService';

/**
 * SyncService handles automated maintenance tasks for the SciLab Inventory System.
 */

export const performMaintenanceSync = async () => {
    console.log("[SyncService] Starting maintenance sync...");
    try {
        const { updated } = await storage.syncOverdueStatus();
        
        if (updated.length > 0) {
            console.log(`[SyncService] Audit complete. ${updated.length} records verified as Overdue. Triggering notifications...`);
            
            const settings = await storage.getSettings();
            
            // Loop through newly overdue records and notify borrowers
            for (const record of updated) {
                if (record.borrowerEmail) {
                    await notifications.notifyBorrowerOfOverdue(settings, record);
                }
            }
        } else {
            console.log("[SyncService] Audit complete. No new overdue records found.");
        }
        
        return { success: true, updatedCount: updated.length };
    } catch (e: any) {
        const errorMsg = e?.message || (typeof e === 'string' ? e : "Unknown database error");
        console.error("[SyncService] Maintenance sync failed:", errorMsg);
        return { success: false, error: errorMsg };
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
