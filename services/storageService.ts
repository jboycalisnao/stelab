import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DEFAULT_CATEGORIES } from '../constants';

// --- Helper for Local Storage ---
const LS_KEYS = {
    INVENTORY: 'scilab_inventory',
    BORROW_RECORDS: 'scilab_borrow_records',
    SETTINGS: 'scilab_settings',
    CATEGORIES: 'scilab_categories'
};

const MOCK_DATA: InventoryItem[] = [
  {
    id: 'BIO-001',
    name: 'Compound Microscope',
    category: 'Biology',
    quantity: 55,
    borrowedQuantity: 0,
    unit: 'units',
    location: 'Bio Lab, Cabinet 1',
    condition: ItemCondition.Good,
    description: 'High-power light microscope for viewing cells.',
    safetyNotes: 'Handle with care. Cover when not in use.',
    lastUpdated: new Date().toISOString(),
    shortId: 'BIO-2911'
  }
];

// --- Inventory ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) {
            console.error('Supabase Error (getInventory):', error.message);
            // Fallback to LS on error if needed, but usually we want to know it failed.
            // For resilience, let's just return what we have in LS if cloud fails?
            // Actually, mixing sources can be dangerous. Let's stick to one source if configured.
            // However, returning empty array on error might wipe UI.
            // Let's return empty array but log error.
            return [];
        } else {
            return data as InventoryItem[];
        }
    }
    
    // Local Storage Fallback
    const stored = localStorage.getItem(LS_KEYS.INVENTORY);
    if (!stored) {
        localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(MOCK_DATA));
        return MOCK_DATA;
    }
    return JSON.parse(stored);
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

    if (isSupabaseConfigured) {
        const { error } = await supabase.from('inventory_items').upsert(item);
        if (error) {
            console.error('Supabase Error (saveItem):', error.message);
            return false;
        }
        return true;
    }

    // Local Storage
    const items = await getInventory();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
        items[index] = item;
    } else {
        items.push(item);
    }
    localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(items));
    return true;
};

export const deleteItem = async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) {
            console.error('Supabase Error (deleteItem):', error.message);
            return false;
        }
        return true;
    }

    // Local Storage
    const items = await getInventory();
    const newItems = items.filter(i => i.id !== id);
    localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(newItems));
    return true;
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data && data.length > 0) {
            return data as Category[];
        }
    }

    // Local Storage
    const stored = localStorage.getItem(LS_KEYS.CATEGORIES);
    if (stored) return JSON.parse(stored);

    // Default
    const defaults = DEFAULT_CATEGORIES.map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        isDefault: true
    }));
    return defaults;
};

export const addCategory = async (name: string): Promise<boolean> => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('categories').insert({ id, name });
        if (!error) return true;
    }

    // Local Storage
    const cats = await getCategories();
    if (!cats.find(c => c.id === id)) {
        cats.push({ id, name, isDefault: false });
        localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(cats));
    }
    return true;
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (!error) return true;
    }

    // Local Storage
    const cats = await getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx >= 0) {
        cats[idx].name = name;
        localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(cats));
    }
    return true;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) return true;
    }

    // Local Storage
    const cats = await getCategories();
    const newCats = cats.filter(c => c.id !== id);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(newCats));
    return true;
};

// --- Borrowing ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('borrow_records').select('*');
        if (!error) return data as BorrowRecord[];
        console.error('Supabase Error (getBorrowRecords):', error.message);
    }

    const stored = localStorage.getItem(LS_KEYS.BORROW_RECORDS);
    return stored ? JSON.parse(stored) : [];
};

export const borrowItem = async (
    itemId: string, 
    borrowerName: string, 
    borrowerId: string, 
    quantity: number, 
    dueDate: string,
    specificId?: string
): Promise<{ success: boolean; message?: string }> => {
    
    if (isSupabaseConfigured) {
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
        return data as { success: boolean; message?: string };
    }

    // Local Storage Logic
    const items = await getInventory();
    const item = items.find(i => i.id === itemId);
    
    if (!item) return { success: false, message: "Item not found" };
    
    const currentBorrowed = item.borrowedQuantity || 0;
    if (currentBorrowed + quantity > item.quantity) {
        return { success: false, message: "Insufficient stock" };
    }

    // Update Item
    item.borrowedQuantity = currentBorrowed + quantity;
    item.lastUpdated = new Date().toISOString();
    localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(items));

    // Create Record
    const records = await getBorrowRecords();
    const newRecord: BorrowRecord = {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        borrowerName,
        borrowerId,
        quantity,
        borrowDate: new Date().toISOString().split('T')[0],
        dueDate,
        status: 'Borrowed',
        specificId
    };
    records.push(newRecord);
    localStorage.setItem(LS_KEYS.BORROW_RECORDS, JSON.stringify(records));

    return { success: true };
};

export const returnItem = async (recordId: string): Promise<{ success: boolean }> => {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc('return_item_transaction', {
            p_record_id: recordId,
            p_return_date: new Date().toISOString().split('T')[0]
        });

        if (error) {
            console.error("Return Transaction Error:", error.message);
            return { success: false };
        }
        return data as { success: boolean };
    }

    // Local Storage Logic
    const records = await getBorrowRecords();
    const record = records.find(r => r.id === recordId);
    
    if (!record || record.status === 'Returned') {
        return { success: false };
    }

    // Update Record
    record.status = 'Returned';
    record.returnDate = new Date().toISOString().split('T')[0];
    localStorage.setItem(LS_KEYS.BORROW_RECORDS, JSON.stringify(records));

    // Update Inventory
    const items = await getInventory();
    const item = items.find(i => i.id === record.itemId);
    if (item) {
        item.borrowedQuantity = Math.max(0, (item.borrowedQuantity || 0) - record.quantity);
        localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(items));
    }

    return { success: true };
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean }> => {
    for (const id of recordIds) {
        await returnItem(id);
    }
    return { success: true };
};

// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    const DEFAULT_SETTINGS: AppSettings = {
        appName: 'STE Laboratory Inventory System',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        recoveryEmail: 'admin@school.edu'
    };

    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (!error && data) {
            return { ...DEFAULT_SETTINGS, ...data };
        }
    }

    // Local Storage
    const stored = localStorage.getItem(LS_KEYS.SETTINGS);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };

    return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    if (isSupabaseConfigured) {
        const settingsToSave = { ...settings, id: 1 };
        const { error } = await supabase.from('app_settings').upsert(settingsToSave);
        if (error) {
            if (error.code === '22P02' || error.message.includes('payload')) {
                 throw new Error("Settings data too large (likely images). Please use smaller images.");
            }
            throw new Error(error.message);
        }
        return;
    }

    // Local Storage
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
};