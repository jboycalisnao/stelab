import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition, AuditLog, BorrowRequest, RequestStatus } from '../types';
import { supabase } from '../supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants';

// --- Metadata Helper Functions ---
// These allow us to store new fields (maxBorrowable, isConsumable, boxes, settings) in existing text columns
// to avoid "Column not found" errors if the database schema hasn't been updated.

const METADATA_TAG = "<!--SYSTEM_META:";
const METADATA_END = "-->";

const parseInventoryItem = (data: any): InventoryItem => {
    if (!data) return data;
    
    // Create a copy
    let item: InventoryItem = { ...data };

    // Unpack metadata from description if present
    if (item.description && item.description.includes(METADATA_TAG)) {
        const start = item.description.indexOf(METADATA_TAG);
        const end = item.description.indexOf(METADATA_END, start);
        
        if (start !== -1 && end !== -1) {
            try {
                const jsonStr = item.description.substring(start + METADATA_TAG.length, end);
                const meta = JSON.parse(jsonStr);
                
                // Merge metadata fields back into the object
                if (meta.maxBorrowable !== undefined) item.maxBorrowable = meta.maxBorrowable;
                if (meta.isConsumable !== undefined) item.isConsumable = meta.isConsumable;
                if (meta.boxes !== undefined) item.boxes = meta.boxes;
                
                // Clean description for UI (remove the hidden tag)
                item.description = item.description.substring(0, start).trim();
            } catch (e) {
                console.warn("Metadata parse error", e);
            }
        }
    }
    
    return item;
};

const prepareInventoryItemForSave = (item: InventoryItem): any => {
    // Clone to avoid mutating the UI object
    const payload: any = { ...item };
    
    const meta: any = {};
    let hasMeta = false;
    
    // Extract maxBorrowable (prevent sending to DB as column)
    if (payload.maxBorrowable !== undefined && payload.maxBorrowable !== null) {
        meta.maxBorrowable = payload.maxBorrowable;
        hasMeta = true;
    }
    // Delete from top-level payload to avoid Schema Error
    delete payload.maxBorrowable;

    // Extract isConsumable (prevent sending to DB as column)
    if (payload.isConsumable) {
        meta.isConsumable = payload.isConsumable;
        hasMeta = true;
    }
    // Delete from top-level payload to avoid Schema Error
    delete payload.isConsumable;

    // Extract boxes (prevent sending to DB as column)
    if (payload.boxes && payload.boxes.length > 0) {
        meta.boxes = payload.boxes;
        hasMeta = true;
    }
    delete payload.boxes;

    // Embed in description as hidden metadata
    if (hasMeta) {
        // We append it to the description so it persists in a standard text column
        payload.description = (payload.description || '').trim() + `\n\n${METADATA_TAG}${JSON.stringify(meta)}${METADATA_END}`;
    }

    return payload;
};

// --- Settings Metadata Helpers ---
const parseAppSettings = (data: any): AppSettings => {
    if (!data) return { appName: 'STE Laboratory Inventory System' };
    
    let settings: AppSettings = { ...data };
    
    // Check customFooterText for metadata (Using footer text as carrier for extra settings)
    if (settings.customFooterText && settings.customFooterText.includes(METADATA_TAG)) {
        const start = settings.customFooterText.indexOf(METADATA_TAG);
        const end = settings.customFooterText.indexOf(METADATA_END, start);
        
        if (start !== -1 && end !== -1) {
            try {
                const jsonStr = settings.customFooterText.substring(start + METADATA_TAG.length, end);
                const meta = JSON.parse(jsonStr);
                
                // Merge extra settings
                if (meta.googleAppsScriptUrl) settings.googleAppsScriptUrl = meta.googleAppsScriptUrl;
                if (meta.notificationEmails) settings.notificationEmails = meta.notificationEmails;
                
                // Clean footer text for UI
                settings.customFooterText = settings.customFooterText.substring(0, start).trim();
            } catch (e) {
                console.warn("Settings metadata parse error", e);
            }
        }
    }
    return settings;
};

const prepareAppSettingsForSave = (settings: AppSettings): any => {
    const payload: any = { ...settings };
    const meta: any = {};
    let hasMeta = false;
    
    // Extract new fields that might not be in the DB schema
    if (payload.googleAppsScriptUrl) {
        meta.googleAppsScriptUrl = payload.googleAppsScriptUrl;
        hasMeta = true;
        delete payload.googleAppsScriptUrl; // Remove to avoid column error
    }
    if (payload.notificationEmails) {
        meta.notificationEmails = payload.notificationEmails;
        hasMeta = true;
        delete payload.notificationEmails; // Remove to avoid column error
    }
    
    // Embed in customFooterText
    if (hasMeta) {
        payload.customFooterText = (payload.customFooterText || '').trim() + `\n\n${METADATA_TAG}${JSON.stringify(meta)}${METADATA_END}`;
    }
    
    return payload;
};

// --- Inventory ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) throw error;
        // Parse metadata for every item
        return (data || []).map(parseInventoryItem);
    } catch (error: any) {
        console.error('Supabase Error (getInventory):', error.message);
        return [];
    }
};

export const getInventoryItem = async (id: string): Promise<InventoryItem | null> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*').eq('id', id).single();
        if (error) throw error;
        return parseInventoryItem(data);
    } catch (error: any) {
        console.error('Supabase Error (getInventoryItem):', error.message);
        return null;
    }
};

export const saveItem = async (item: InventoryItem): Promise<{ success: boolean; message?: string }> => {
    // Generate Short ID if missing
    if (!item.shortId) {
         const prefix = item.category.substring(0, 3).toUpperCase();
         const random = Math.floor(1000 + Math.random() * 9000);
         item.shortId = `${prefix}-${random}`;
    }
    // Generate ID if missing (new item)
    if (!item.id) {
        item.id = crypto.randomUUID();
    }
    item.lastUpdated = new Date().toISOString();

    try {
        // Prepare payload (packs extra fields into description to prevent column errors)
        const payload = prepareInventoryItemForSave(item);
        
        const { error } = await supabase.from('inventory_items').upsert(payload);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Supabase Error (saveItem):', error.message);
        return { success: false, message: error.message };
    }
};

export const deleteItem = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (deleteItem):', error.message);
        return false;
    }
};

// --- Borrowing ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    try {
        const { data, error } = await supabase.from('borrow_records').select('*');
        if (error) throw error;
        return data as BorrowRecord[];
    } catch (error: any) {
        console.error('Supabase Error (getBorrowRecords):', error.message);
        return [];
    }
};

export const borrowItem = async (
    itemId: string, 
    borrowerName: string, 
    borrowerId: string, 
    quantity: number, 
    dueDate: string, 
    specificId?: string
): Promise<{ success: boolean; message?: string; recordId?: string }> => {
    try {
        const recordId = crypto.randomUUID();
        // We use a stored procedure (RPC) to handle the transaction (check stock -> update stock -> create record) atomically
        // Using v3 to handle potential text/uuid type mismatches in Postgres safely
        const { data, error } = await supabase.rpc('borrow_item_transaction_v3', {
            p_item_id: itemId,
            p_borrower_name: borrowerName,
            p_borrower_id: borrowerId,
            p_quantity: quantity,
            p_due_date: dueDate,
            p_specific_id: specificId || null,
            p_record_id: recordId,
            p_borrow_date: new Date().toISOString().split('T')[0]
        });

        if (error) throw error;
        
        // Supabase RPC returns JSON, check success property
        if (data && data.success) {
            return { success: true, recordId: recordId };
        } else {
            return { success: false, message: data?.message || "Transaction failed" };
        }

    } catch (error: any) {
        console.error('Supabase Error (borrowItem):', error.message);
        return { success: false, message: error.message };
    }
};

const updateRequestStatusByLinkedRecord = async (recordId: string) => {
    // Check if this record belongs to a Request. If so, check if all items in that request are returned.
    try {
        const { data: activeRequests } = await supabase
            .from('borrow_requests')
            .select('*')
            .in('status', ['Approved', 'Released']);

        if (!activeRequests || activeRequests.length === 0) return;

        for (const req of activeRequests) {
            const hasRecord = req.items.some((item: any) => item.linkedRecordId === recordId);
            if (hasRecord) {
                // This is the request. Now check if ALL linked records are returned.
                const allLinkedIds = req.items.map((item: any) => item.linkedRecordId).filter((id: any) => !!id);
                
                if (allLinkedIds.length > 0) {
                    const { data: records } = await supabase
                        .from('borrow_records')
                        .select('status')
                        .in('id', allLinkedIds);
                    
                    if (records) {
                        const allReturned = records.every((r: any) => r.status === 'Returned');
                        if (allReturned) {
                             await supabase
                                .from('borrow_requests')
                                .update({ status: 'Returned' })
                                .eq('id', req.id);
                        }
                    }
                }
                break; // Found the request
            }
        }

    } catch (e) {
        console.error("Failed to sync request status", e);
    }
};

export const returnItem = async (
    recordId: string, 
    details?: { good: number; defective: number; disposed: number }
): Promise<{ success: boolean; message?: string }> => {
    try {
        // 1. Fetch the Borrow Record
        const { data: record, error: recError } = await supabase
            .from('borrow_records')
            .select('*')
            .eq('id', recordId)
            .single();

        if (recError || !record) throw new Error("Record not found");
        if (record.status === 'Returned') return { success: true, message: "Already returned" };

        const itemId = record.itemId;
        const totalQty = record.quantity;

        // Default details if not provided (assume all good)
        const qtyGood = details?.good ?? totalQty;
        const qtyDefective = details?.defective ?? 0;
        const qtyDisposed = details?.disposed ?? 0;

        // Sanity Check
        if (qtyGood + qtyDefective + qtyDisposed !== totalQty) {
             throw new Error("Quantity mismatch");
        }

        // 2. Fetch the Inventory Item
        const { data: rawItem, error: itemError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', itemId)
            .single();

        if (itemError || !rawItem) throw new Error("Item not found");
        const item = parseInventoryItem(rawItem);

        // 3. Calculate Updates
        // borrowedQuantity decreases by the TOTAL borrowed amount (since they are processed)
        const newBorrowedQty = Math.max(0, item.borrowedQuantity - totalQty);
        
        // Total Quantity decreases by Disposed and Defective (Condemned) amounts
        const removedFromStock = qtyDisposed + qtyDefective;
        const newTotalQty = Math.max(0, item.quantity - removedFromStock);

        // 4. Perform Updates (Sequential to simulate transaction)
        
        // A. Update Inventory
        const { error: updateItemError } = await supabase
            .from('inventory_items')
            .update({
                borrowedQuantity: newBorrowedQty,
                quantity: newTotalQty,
                lastUpdated: new Date().toISOString()
            })
            .eq('id', itemId);
        
        if (updateItemError) throw updateItemError;

        // B. Update Borrow Record
        const { error: updateRecError } = await supabase
            .from('borrow_records')
            .update({
                status: 'Returned',
                returnDate: new Date().toISOString().split('T')[0]
            })
            .eq('id', recordId);

        if (updateRecError) throw updateRecError;

        // C. Sync Request Status (Fire and forget)
        updateRequestStatusByLinkedRecord(recordId);

        return { success: true };

    } catch (error: any) {
        console.error('Supabase Error (returnItem):', error.message);
        return { success: false, message: error.message };
    }
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean; message?: string }> => {
    try {
        // Process sequentially
        for (const id of recordIds) {
            // Bulk return assumes all items are returned in good condition
            await returnItem(id);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Supabase Error (returnItems):', error.message);
        return { success: false, message: error.message };
    }
};

export const deleteBorrowRecord = async (recordId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        // 1. Fetch record to check status
        const { data: record, error: fetchError } = await supabase
            .from('borrow_records')
            .select('*')
            .eq('id', recordId)
            .single();
        
        if (fetchError || !record) throw new Error("Record not found");

        // 2. If it is an ACTIVE loan ('Borrowed'), we must restore the borrowedQuantity in inventory
        if (record.status === 'Borrowed') {
             const { data: item, error: itemError } = await supabase
                .from('inventory_items')
                .select('borrowedQuantity')
                .eq('id', record.itemId)
                .single();
            
            if (item) {
                const newBorrowedQty = Math.max(0, item.borrowedQuantity - record.quantity);
                const { error: updateError } = await supabase
                    .from('inventory_items')
                    .update({ borrowedQuantity: newBorrowedQty })
                    .eq('id', record.itemId);
                
                if (updateError) throw updateError;
            }
        }

        // 3. Delete the record
        const { error: delError } = await supabase.from('borrow_records').delete().eq('id', recordId);
        if (delError) throw delError;

        return { success: true };
    } catch (error: any) {
        console.error('Supabase Error (deleteBorrowRecord):', error.message);
        return { success: false, message: error.message };
    }
};

export const deleteBorrowRecords = async (recordIds: string[]): Promise<{ success: boolean; message?: string }> => {
    try {
        // Process sequentially to ensure logic per item holds
        for (const id of recordIds) {
            await deleteBorrowRecord(id);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Supabase Error (deleteBorrowRecords):', error.message);
        return { success: false, message: error.message };
    }
};

// --- Borrow Requests (Public/Admin) ---

export const createBorrowRequest = async (request: Omit<BorrowRequest, 'id' | 'status'>): Promise<BorrowRequest | null> => {
    try {
        const newRequest = {
            ...request,
            id: crypto.randomUUID(),
            status: 'Pending',
        };
        const { error } = await supabase.from('borrow_requests').insert(newRequest);
        if (error) throw error;
        return newRequest as BorrowRequest;
    } catch (error: any) {
        console.error('Supabase Error (createBorrowRequest):', error.message);
        return null;
    }
};

export const getBorrowRequests = async (): Promise<BorrowRequest[]> => {
    try {
        const { data, error } = await supabase.from('borrow_requests').select('*');
        if (error) throw error;
        return data as BorrowRequest[];
    } catch (error: any) {
        console.error('Supabase Error (getBorrowRequests):', error.message);
        return [];
    }
};

export const getBorrowRequestByCode = async (code: string): Promise<BorrowRequest | null> => {
    try {
        const { data, error } = await supabase.from('borrow_requests').select('*').eq('referenceCode', code).single();
        if (error) throw error;
        return data as BorrowRequest;
    } catch (error: any) {
        console.error('Supabase Error (getBorrowRequestByCode):', error.message);
        return null;
    }
};

export const updateBorrowRequestStatus = async (id: string, status: RequestStatus, notes?: string): Promise<boolean> => {
    try {
        const updateData: any = { status };
        if (notes !== undefined) updateData.adminNotes = notes;
        
        const { error } = await supabase.from('borrow_requests').update(updateData).eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (updateBorrowRequestStatus):', error.message);
        return false;
    }
};

export const deleteBorrowRequest = async (id: string): Promise<boolean> => {
    try {
        // 1. Fetch the request to check for linked borrow records
        const { data: req, error: fetchError } = await supabase.from('borrow_requests').select('*').eq('id', id).single();
        if (fetchError || !req) throw new Error("Request not found");

        const request = req as BorrowRequest;
        
        // 2. Collect linked record IDs
        const linkedIds = request.items
            .map(item => item.linkedRecordId)
            .filter((id): id is string => !!id);

        // 3. Delete associated borrow records (this handles inventory restoration if they are active)
        if (linkedIds.length > 0) {
            await deleteBorrowRecords(linkedIds);
        }

        // 4. Delete the request itself
        const { error } = await supabase.from('borrow_requests').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (deleteBorrowRequest):', error.message);
        return false;
    }
};

export const processApprovedRequest = async (request: BorrowRequest): Promise<{ success: boolean; message?: string }> => {
    // This converts a request into actual Borrow Records and updates inventory
    try {
        // 1. Verify items are still available
        for (const reqItem of request.items) {
             const { data: rawItem } = await supabase.from('inventory_items').select('*').eq('id', reqItem.itemId).single();
             if (!rawItem) throw new Error(`Item ${reqItem.itemName} not found.`);
             
             // We don't need full metadata parse here, just basic quantity check
             const invItem = rawItem as InventoryItem;
             const available = invItem.quantity - (invItem.borrowedQuantity || 0);
             if (available < reqItem.quantity) {
                 throw new Error(`Insufficient stock for ${reqItem.itemName}. Available: ${available}, Requested: ${reqItem.quantity}`);
             }
        }

        // 2. Process each item (Call borrowItem transaction for each)
        const updatedItems = [...request.items];

        for (let i = 0; i < updatedItems.length; i++) {
            const reqItem = updatedItems[i];
            const result = await borrowItem(
                reqItem.itemId,
                request.borrowerName,
                request.borrowerId,
                reqItem.quantity,
                request.returnDate
            );
            
            if (!result.success) throw new Error(`Failed to process ${reqItem.itemName}: ${result.message}`);
            
            if (result.recordId) {
                updatedItems[i] = { ...reqItem, linkedRecordId: result.recordId };
            }
        }

        // 3. Update Request Status AND update the items with linked IDs
        const { error } = await supabase.from('borrow_requests').update({ 
            status: 'Approved',
            items: updatedItems // Save updated JSON with linkedRecordIds
        }).eq('id', request.id);

        if (error) throw error;

        return { success: true };

    } catch (error: any) {
        console.error('Supabase Error (processApprovedRequest):', error.message);
        return { success: false, message: error.message };
    }
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    try {
        const { data, error } = await supabase.from('app_settings').select('*').single();
        if (error) {
            if (error.code === 'PGRST116') {
                 return { appName: 'STE Laboratory Inventory System' };
            }
            throw error;
        }
        return parseAppSettings(data);
    } catch (error: any) {
        console.error('Supabase Error (getSettings):', error.message);
        return { appName: 'STE Laboratory Inventory System' };
    }
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    try {
        // Pack metadata for new fields to avoid schema errors if columns missing
        const payload = prepareAppSettingsForSave(settings);
        
        const { error } = await supabase.from('app_settings').upsert({ ...payload, id: 1 });
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (saveSettings):', error.message);
        return false;
    }
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    try {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        
        if (!data || data.length === 0) {
            const defaults = DEFAULT_CATEGORIES.map(name => ({
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name,
                isDefault: true
            }));
            await supabase.from('categories').insert(defaults);
            return defaults;
        }
        
        return data as Category[];
    } catch (error: any) {
        console.error('Supabase Error (getCategories):', error.message);
        return DEFAULT_CATEGORIES.map(name => ({ id: name.toLowerCase(), name }));
    }
};

export const addCategory = async (name: string): Promise<boolean> => {
    try {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const { error } = await supabase.from('categories').insert({ id, name, isDefault: false });
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (addCategory):', error.message);
        return false;
    }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (deleteCategory):', error.message);
        return false;
    }
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (updateCategory):', error.message);
        return false;
    }
};