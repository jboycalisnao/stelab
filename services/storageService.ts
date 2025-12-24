
import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition, AuditLog, BorrowRequest, RequestStatus, BorrowStatus } from '../types';
import { supabase } from '../supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants';

// --- Metadata Helpers ---
const METADATA_TAG = "<!--SYSTEM_META:";
const METADATA_END = "-->";

/**
 * Removes metadata tags and residual JSON leaks from text fields.
 */
const sanitizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
        // Remove standard metadata blocks
        .replace(/<!--SYSTEM_META:[\s\S]*?-->/g, '')
        // Remove leaked AppSettings JSON or broken metadata tags
        .replace(/\{"googleAppsScriptUrl":[\s\S]*?-->/g, '')
        .replace(/\{"notificationEmails":[\s\S]*?-->/g, '')
        // Remove any other leaked JSON-like metadata that might have lost its start tag
        .replace(/\{"(maxBorrowable|isConsumable|boxes)":[\s\S]*?-->/g, '')
        // General cleanup for any residual closing tags
        .replace(/-->/g, '')
        .trim();
};

const parseInventoryItem = (data: any): InventoryItem => {
    if (!data) return data;
    let item: InventoryItem = { ...data };
    
    // Extract metadata if it exists
    if (item.description && item.description.includes(METADATA_TAG)) {
        const start = item.description.indexOf(METADATA_TAG);
        const end = item.description.indexOf(METADATA_END, start);
        if (start !== -1 && end !== -1) {
            try {
                const jsonStr = item.description.substring(start + METADATA_TAG.length, end);
                const meta = JSON.parse(jsonStr);
                if (meta.maxBorrowable !== undefined) item.maxBorrowable = meta.maxBorrowable;
                if (meta.isConsumable !== undefined) item.isConsumable = meta.isConsumable;
                if (meta.boxes !== undefined) item.boxes = meta.boxes;
            } catch (e) { 
                console.warn("Metadata parse error", e); 
            }
        }
    }
    
    // Clean the description of ALL system tags before passing to UI
    item.description = sanitizeText(item.description);
    
    return item;
};

const prepareInventoryItemForSave = (item: InventoryItem): any => {
    const payload: any = { ...item };
    const meta: any = {};
    let hasMeta = false;
    
    if (payload.maxBorrowable !== undefined && payload.maxBorrowable !== null) {
        meta.maxBorrowable = payload.maxBorrowable;
        hasMeta = true;
    }
    delete payload.maxBorrowable;
    
    if (payload.isConsumable) {
        meta.isConsumable = payload.isConsumable;
        hasMeta = true;
    }
    delete payload.isConsumable;
    
    if (payload.boxes && payload.boxes.length > 0) {
        meta.boxes = payload.boxes;
        hasMeta = true;
    }
    delete payload.boxes;
    
    // Clean description before appending new metadata to prevent duplication
    const cleanDesc = sanitizeText(payload.description);
    
    if (hasMeta) {
        payload.description = cleanDesc + `\n\n${METADATA_TAG}${JSON.stringify(meta)}${METADATA_END}`;
    } else {
        payload.description = cleanDesc;
    }
    
    return payload;
};

// --- API Functions ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) throw error;
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
    if (!item.shortId) {
         const prefix = item.category.substring(0, 3).toUpperCase();
         const random = Math.floor(1000 + Math.random() * 9000);
         item.shortId = `${prefix}-${random}`;
    }
    if (!item.id) item.id = crypto.randomUUID();
    item.lastUpdated = new Date().toISOString();
    try {
        const payload = prepareInventoryItemForSave(item);
        const { error } = await supabase.from('inventory_items').upsert(payload);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const deleteItem = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error: any) {
        return false;
    }
};

// --- Maintenance & Sync ---

export const syncOverdueStatus = async (): Promise<{ updated: number }> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overdueRecords, error } = await supabase
            .from('borrow_records')
            .select('id')
            .eq('status', 'Borrowed')
            .lt('dueDate', today);

        if (error) throw error;
        if (!overdueRecords || overdueRecords.length === 0) return { updated: 0 };

        // Fix: Explicitly type 'r' as { id: string } to resolve TS7006 error
        const ids = overdueRecords.map((r: { id: string }) => r.id);
        const { error: updateError } = await supabase
            .from('borrow_records')
            .update({ status: 'Overdue' })
            .in('id', ids);

        if (updateError) throw updateError;
        return { updated: ids.length };
    } catch (e) {
        console.error("Overdue sync failed", e);
        return { updated: 0 };
    }
};

// --- Borrowing ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    try {
        const { data, error } = await supabase.from('borrow_records').select('*');
        if (error) throw error;
        return data as BorrowRecord[];
    } catch (error: any) {
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
        const today = new Date().toISOString().split('T')[0];
        const initialStatus: BorrowStatus = dueDate < today ? 'Overdue' : 'Borrowed';

        const { data, error } = await supabase.rpc('borrow_item_transaction_v3', {
            p_item_id: itemId,
            p_borrower_name: borrowerName,
            p_borrower_id: borrowerId,
            p_quantity: quantity,
            p_due_date: dueDate,
            p_specific_id: specificId || null,
            p_record_id: recordId,
            p_borrow_date: today
        });

        if (error) throw error;
        
        if (initialStatus === 'Overdue') {
            await supabase.from('borrow_records').update({ status: 'Overdue' }).eq('id', recordId);
        }

        if (data && data.success) {
            return { success: true, recordId: recordId };
        } else {
            return { success: false, message: data?.message || "Transaction failed" };
        }
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const returnItem = async (
    recordId: string, 
    details?: { good: number; defective: number; disposed: number }
): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data: record, error: recError } = await supabase.from('borrow_records').select('*').eq('id', recordId).single();
        if (recError || !record) throw new Error("Record not found");
        if (record.status === 'Returned') return { success: true };

        const itemId = record.itemId;
        const totalQty = record.quantity;
        const qtyGood = details?.good ?? totalQty;
        const qtyDefective = details?.defective ?? 0;
        const qtyDisposed = details?.disposed ?? 0;

        const { data: rawItem } = await supabase.from('inventory_items').select('*').eq('id', itemId).single();
        if (!rawItem) throw new Error("Item not found");
        const item = parseInventoryItem(rawItem);

        const newBorrowedQty = Math.max(0, item.borrowedQuantity - totalQty);
        const removedFromStock = qtyDisposed + qtyDefective;
        const newTotalQty = Math.max(0, item.quantity - removedFromStock);

        await supabase.from('inventory_items').update({
            borrowedQuantity: newBorrowedQty,
            quantity: newTotalQty,
            lastUpdated: new Date().toISOString()
        }).eq('id', itemId);

        await supabase.from('borrow_records').update({
            status: 'Returned',
            returnDate: new Date().toISOString().split('T')[0]
        }).eq('id', recordId);

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const consumeItem = async (itemId: string, quantityToConsume: number): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data: rawItem } = await supabase.from('inventory_items').select('*').eq('id', itemId).single();
        if (!rawItem) throw new Error("Item not found");
        const item = parseInventoryItem(rawItem);
        const available = item.quantity - (item.borrowedQuantity || 0);
        if (quantityToConsume > available) throw new Error("Insufficient stock");

        const { error } = await supabase.from('inventory_items').update({
            quantity: Math.max(0, item.quantity - quantityToConsume),
            lastUpdated: new Date().toISOString()
        }).eq('id', itemId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean; message?: string }> => {
    for (const id of recordIds) await returnItem(id);
    return { success: true };
};

export const deleteBorrowRecord = async (recordId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data: record } = await supabase.from('borrow_records').select('*').eq('id', recordId).single();
        if (record && (record.status === 'Borrowed' || record.status === 'Overdue')) {
             const { data: item } = await supabase.from('inventory_items').select('borrowedQuantity').eq('id', record.itemId).single();
            if (item) {
                await supabase.from('inventory_items').update({ borrowedQuantity: Math.max(0, item.borrowedQuantity - record.quantity) }).eq('id', record.itemId);
            }
        }
        await supabase.from('borrow_records').delete().eq('id', recordId);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

export const deleteBorrowRecords = async (recordIds: string[]): Promise<{ success: boolean; message?: string }> => {
    for (const id of recordIds) await deleteBorrowRecord(id);
    return { success: true };
};

// --- Borrow Requests ---

export const createBorrowRequest = async (request: Omit<BorrowRequest, 'id' | 'status'>): Promise<BorrowRequest | null> => {
    try {
        const newRequest: BorrowRequest = { ...request, id: crypto.randomUUID(), status: 'Pending' };
        const { error } = await supabase.from('borrow_requests').insert(newRequest);
        if (error) throw error;
        return newRequest;
    } catch (error: any) {
        return null;
    }
};

export const getBorrowRequests = async (): Promise<BorrowRequest[]> => {
    const { data } = await supabase.from('borrow_requests').select('*');
    return data || [];
};

export const getBorrowRequestByCode = async (code: string): Promise<BorrowRequest | null> => {
    const { data } = await supabase.from('borrow_requests').select('*').eq('referenceCode', code).single();
    return data;
};

export const updateBorrowRequestStatus = async (id: string, status: RequestStatus, notes?: string): Promise<boolean> => {
    try {
        const updateData: any = { status };
        if (notes !== undefined) updateData.adminNotes = notes;
        await supabase.from('borrow_requests').update(updateData).eq('id', id);
        return true;
    } catch (error: any) {
        return false;
    }
};

export const deleteBorrowRequest = async (id: string): Promise<boolean> => {
    try {
        const { data: req } = await supabase.from('borrow_requests').select('*').eq('id', id).single();
        if (req && req.items) {
            const linkedIds = req.items.map((i: any) => i.linkedRecordId).filter((id: any) => !!id);
            if (linkedIds.length > 0) await deleteBorrowRecords(linkedIds);
        }
        await supabase.from('borrow_requests').delete().eq('id', id);
        return true;
    } catch (error: any) {
        return false;
    }
};

export const processApprovedRequest = async (request: BorrowRequest): Promise<{ success: boolean; message?: string }> => {
    try {
        const updatedItems = [...request.items];
        for (let i = 0; i < updatedItems.length; i++) {
            const result = await borrowItem(updatedItems[i].itemId, request.borrowerName, request.borrowerId, updatedItems[i].quantity, request.returnDate);
            if (!result.success) throw new Error(result.message);
            if (result.recordId) updatedItems[i] = { ...updatedItems[i], linkedRecordId: result.recordId };
        }
        await supabase.from('borrow_requests').update({ status: 'Approved', items: updatedItems }).eq('id', request.id);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    try {
        const { data } = await supabase.from('app_settings').select('*').single();
        if (data) {
            // Scrub fields thoroughly to prevent metadata leaks on landing page
            if (data.customFooterText) data.customFooterText = sanitizeText(data.customFooterText);
            if (data.appName) data.appName = sanitizeText(data.appName);
            // Ensure any accidentally saved JSON is stripped from other potential landing page fields
            if (data.logoUrl && data.logoUrl.includes('googleAppsScriptUrl')) {
                 data.logoUrl = sanitizeText(data.logoUrl);
            }
        }
        return data || { appName: 'STE Laboratory Inventory System' };
    } catch (error: any) {
        return { appName: 'STE Laboratory Inventory System' };
    }
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    try {
        await supabase.from('app_settings').upsert({ ...settings, id: 1 });
        return true;
    } catch (error: any) {
        return false;
    }
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    const { data } = await supabase.from('categories').select('*');
    return data || [];
};

export const addCategory = async (name: string): Promise<boolean> => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('categories').insert({ id, name, isDefault: false });
    return !error;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return !error;
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    return !error;
};
