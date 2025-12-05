import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

// Mock Data Setup
const MOCK_ITEMS: InventoryItem[] = [
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
        safetyNotes: 'Handle with care.',
        lastUpdated: new Date().toISOString(),
        shortId: 'BIO-291'
    }
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Inventory ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    await delay(300);
    const stored = localStorage.getItem('scilab_inventory');
    if (!stored) {
        localStorage.setItem('scilab_inventory', JSON.stringify(MOCK_ITEMS));
        return MOCK_ITEMS;
    }
    return JSON.parse(stored);
};

export const saveItem = async (item: InventoryItem): Promise<boolean> => {
    await delay(300);
    const items = await getInventory();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
        items[index] = item;
    } else {
        // Generate Short ID if missing
        if (!item.shortId) {
             const prefix = item.category.substring(0, 3).toUpperCase();
             const random = Math.floor(1000 + Math.random() * 9000);
             item.shortId = `${prefix}-${random}`;
        }
        items.push(item);
    }
    localStorage.setItem('scilab_inventory', JSON.stringify(items));
    return true;
};

export const deleteItem = async (id: string): Promise<boolean> => {
    await delay(300);
    let items = await getInventory();
    items = items.filter(i => i.id !== id);
    localStorage.setItem('scilab_inventory', JSON.stringify(items));
    return true;
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    await delay(200);
    const stored = localStorage.getItem('scilab_categories');
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
    await delay(200);
    const cats = await getCategories();
    cats.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name });
    localStorage.setItem('scilab_categories', JSON.stringify(cats));
    return true;
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    await delay(200);
    const cats = await getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx !== -1) {
        cats[idx].name = name;
        localStorage.setItem('scilab_categories', JSON.stringify(cats));
    }
    return true;
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    await delay(200);
    let cats = await getCategories();
    cats = cats.filter(c => c.id !== id);
    localStorage.setItem('scilab_categories', JSON.stringify(cats));
    return true;
};

// --- Borrowing ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    await delay(300);
    const stored = localStorage.getItem('scilab_borrow_records');
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
    await delay(400);
    const items = await getInventory();
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) return { success: false, message: "Item not found" };
    
    const item = items[itemIndex];
    const currentBorrowed = item.borrowedQuantity || 0;
    
    if (currentBorrowed + quantity > item.quantity) {
        return { success: false, message: "Insufficient stock" };
    }
    
    // Update Item
    item.borrowedQuantity = currentBorrowed + quantity;
    items[itemIndex] = item;
    localStorage.setItem('scilab_inventory', JSON.stringify(items));
    
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
    localStorage.setItem('scilab_borrow_records', JSON.stringify(records));
    
    return { success: true };
};

export const returnItem = async (recordId: string): Promise<{ success: boolean }> => {
    await delay(300);
    const records = await getBorrowRecords();
    const recordIndex = records.findIndex(r => r.id === recordId);
    
    if (recordIndex === -1) return { success: false };
    
    const record = records[recordIndex];
    if (record.status === 'Returned') return { success: true };
    
    // Update Record
    record.status = 'Returned';
    record.returnDate = new Date().toISOString().split('T')[0];
    records[recordIndex] = record;
    localStorage.setItem('scilab_borrow_records', JSON.stringify(records));
    
    // Update Inventory
    const items = await getInventory();
    const itemIndex = items.findIndex(i => i.id === record.itemId);
    if (itemIndex !== -1) {
        const item = items[itemIndex];
        // Ensure we don't go below zero
        item.borrowedQuantity = Math.max(0, (item.borrowedQuantity || 0) - record.quantity);
        items[itemIndex] = item;
        localStorage.setItem('scilab_inventory', JSON.stringify(items));
    }
    
    return { success: true };
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean }> => {
    await delay(500);
    // Process sequentially (in mock) to ensure consistency
    for (const id of recordIds) {
        await returnItem(id);
    }
    return { success: true };
};


// --- Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    await delay(200);
    const stored = localStorage.getItem('scilab_settings');
    const DEFAULT_SETTINGS: AppSettings = {
        appName: 'STE Laboratory Inventory System',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        recoveryEmail: 'admin@school.edu'
    };
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    await delay(300);
    try {
        localStorage.setItem('scilab_settings', JSON.stringify(settings));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
             throw new Error("Storage Limit Exceeded. Please try smaller images.");
        }
        throw e;
    }
};
