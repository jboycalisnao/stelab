
import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition, AuditLog } from '../types';
import { supabase } from '../supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants';

// --- Inventory ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) throw error;
        return data as InventoryItem[];
    } catch (error: any) {
        console.error('Supabase Error (getInventory):', error.message);
        return [];
    }
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

    try {
        const { error } = await supabase.from('inventory_items').upsert(item);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Supabase Error (saveItem):', error.message);
        return false;
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
): Promise<{ success: boolean; message?: string }> => {
    try {
        // We use a stored procedure (RPC) to handle the transaction (check stock -> update stock -> create record) atomically
        const { data, error } = await supabase.rpc('borrow_item_transaction', {
            p_item_id: itemId,
            p_borrower_name: borrowerName,
            p_borrower_id: borrowerId,
            p_quantity: quantity,
            p_due_date: dueDate,
            p_specific_id: specificId || null,
            p_record_id: crypto.randomUUID(),
            p_borrow_date: new Date().toISOString().split('T')[0]
        });

        if (error) throw error;
        
        // Supabase RPC returns JSON, check success property
        if (data && data.success) {
            return { success: true };
        } else {
            return { success: false, message: data?.message || "Transaction failed" };
        }

    } catch (error: any) {
        console.error('Supabase Error (borrowItem):', error.message);
        return { success: false, message: error.message };
    }
};

export const returnItem = async (recordId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const { data, error } = await supabase.rpc('return_item_transaction', {
            p_record_id: recordId,
            p_return_date: new Date().toISOString().split('T')[0]
        });

        if (error) throw error;

        if (data && data.success) {
            return { success: true };
        } else {
            return { success: false, message: data?.message || "Return failed" };
        }
    } catch (error: any) {
        console.error('Supabase Error (returnItem):', error.message);
        return { success: false, message: error.message };
    }
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean; message?: string }> => {
    try {
        // Process sequentially to ensure inventory counts are accurate
        for (const id of recordIds) {
            await returnItem(id);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Supabase Error (returnItems):', error.message);
        return { success: false, message: error.message };
    }
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    try {
        const { data, error } = await supabase.from('app_settings').select('*').single();
        if (error) {
            // If no settings exist yet, return defaults but don't crash
            if (error.code === 'PGRST116') { // code for no rows found
                 return { appName: 'STE Laboratory Inventory System' };
            }
            throw error;
        }
        return data as AppSettings;
    } catch (error: any) {
        console.error('Supabase Error (getSettings):', error.message);
        return { appName: 'STE Laboratory Inventory System' };
    }
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    try {
        // Always update row 1
        const { error } = await supabase.from('app_settings').upsert({ ...settings, id: 1 });
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
            // Fallback initialization if table is empty
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
