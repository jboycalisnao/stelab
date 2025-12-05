import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition } from '../types';
import { supabase } from '../supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants';

// --- Inventory ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase.from('inventory_items').select('*');
    if (error) {
        console.error('Supabase Error (getInventory):', error.message, error.details, error.hint);
        throw new Error(`Failed to load inventory: ${error.message}`);
    }
    return data as InventoryItem[];
};

export const saveItem = async (item: InventoryItem): Promise<boolean> => {
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

    const { error } = await supabase.from('inventory_items').upsert(item);
    if (error) {
        console.error('Supabase Error (saveItem):', error.message);
        return false;
    }
    return true;
};

export const deleteItem = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) {
        console.error('Supabase Error (deleteItem):', error.message);
        return false;
    }
    return true;
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
        console.error('Supabase Error (getCategories):', error.message);
        // Fallback to defaults only if DB is completely empty/error to prevent UI crash
        const defaults = DEFAULT_CATEGORIES.map(name => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            isDefault: true
        }));
        return defaults;
    }
    return data as Category[];
};

export const addCategory = async (name: string): Promise<boolean> => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('categories').insert({ id, name });
    if (error) {
        console.error('Supabase Error (addCategory):', error.message);
        return false;
    }
    return true;
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) {
        console.error('Supabase Error (updateCategory):', error.message);
        return false;
    }
    return true;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
        console.error('Supabase Error (deleteCategory):', error.message);
        return false;
    }
    return true;
};

// --- Borrowing ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    const { data, error } = await supabase.from('borrow_records').select('*');
    if (error) {
        console.error('Supabase Error (getBorrowRecords):', error.message);
        return [];
    }
    return data as BorrowRecord[];
};

export const borrowItem = async (
    itemId: string, 
    borrowerName: string, 
    borrowerId: string, 
    quantity: number, 
    dueDate: string,
    specificId?: string
): Promise<{ success: boolean; message?: string }> => {
    
    const { data, error } = await supabase.rpc('borrow_item_transaction', {
        p_item_id: itemId,
        p_borrower_name: borrowerName,
        p_borrower_id: borrowerId,
        p_quantity: quantity,
        p_due_date: dueDate,
        p_specific_id: specificId || null,
        p_record_id: Date.now().toString(),
        p_borrow_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
        console.error("Borrow Transaction Error:", error.message);
        return { success: false, message: error.message };
    }
    
    // The RPC returns a JSON object, usually inside data
    // Supabase RPC result is directly the return value of function
    const result = data as { success: boolean; message?: string };
    return result;
};

export const returnItem = async (recordId: string): Promise<{ success: boolean }> => {
    const { data, error } = await supabase.rpc('return_item_transaction', {
        p_record_id: recordId,
        p_return_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
        console.error("Return Transaction Error:", error.message);
        return { success: false };
    }
    return data as { success: boolean };
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean }> => {
    // Process sequentially or Promise.all. 
    // Since these are individual transactions, we can run them in parallel.
    try {
        await Promise.all(recordIds.map(id => returnItem(id)));
        return { success: true };
    } catch (e) {
        console.error("Bulk Return Error", e);
        return { success: false };
    }
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    const DEFAULT_SETTINGS: AppSettings = {
        appName: 'STE Laboratory Inventory System',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        recoveryEmail: 'admin@school.edu'
    };

    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    
    if (error) {
        console.error('Supabase Error (getSettings):', error.message);
        // Return default if table is empty or error, so app doesn't crash on boot
        return DEFAULT_SETTINGS;
    }
    
    if (data) {
        return { ...DEFAULT_SETTINGS, ...data };
    }

    return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    const settingsToSave = { ...settings, id: 1 };
    const { error } = await supabase.from('app_settings').upsert(settingsToSave);
    if (error) {
        if (error.code === '22P02' || error.message.includes('payload')) {
                throw new Error("Settings data too large (likely images). Please use smaller images.");
        }
        throw new Error(error.message);
    }
};