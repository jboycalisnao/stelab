import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const API_URL = '/.netlify/functions/api';

// --- Helper for API Calls ---
async function apiCall<T>(action: string, method: string = 'GET', body?: any): Promise<T> {
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    // For GET requests, append action to query string
    const url = method === 'GET' 
        ? `${API_URL}?action=${action}`
        : API_URL;

    // For POST/PUT/DELETE, include action in body
    if (method !== 'GET' && body) {
        body.action = action;
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown API Error' }));
        throw new Error(err.error || `API Error: ${response.statusText}`);
    }
    return response.json();
}

// --- Inventory Functions ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    return apiCall<InventoryItem[]>('getInventory');
};

export const saveItem = async (item: InventoryItem): Promise<boolean> => {
    return apiCall<boolean>('saveItem', 'POST', { item });
};

export const deleteItem = async (id: string): Promise<boolean> => {
    return apiCall<boolean>('deleteItem', 'POST', { id });
};

// --- Category Functions ---

export const getCategories = async (): Promise<Category[]> => {
    try {
        return await apiCall<Category[]>('getCategories');
    } catch (e) {
        // Fallback if DB is empty
        return DEFAULT_CATEGORIES.map(name => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            isDefault: true
        }));
    }
};

export const addCategory = async (name: string): Promise<boolean> => {
    return apiCall<boolean>('addCategory', 'POST', { name });
};

export const updateCategory = async (id: string, name: string): Promise<boolean> => {
    return apiCall<boolean>('updateCategory', 'POST', { id, name });
};

export const deleteCategory = async (id: string): Promise<boolean> => {
    return apiCall<boolean>('deleteCategory', 'POST', { id });
};

// --- Borrowing Functions ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    return apiCall<BorrowRecord[]>('getBorrowRecords');
};

export const borrowItem = async (
    itemId: string, 
    borrowerName: string, 
    borrowerId: string, 
    quantity: number, 
    dueDate: string,
    specificId?: string
): Promise<{ success: boolean; message?: string }> => {
    return apiCall<{ success: boolean; message?: string }>('borrowItem', 'POST', {
        itemId, borrowerName, borrowerId, quantity, dueDate, specificId
    });
};

export const returnItem = async (recordId: string): Promise<{ success: boolean }> => {
    return apiCall<{ success: boolean }>('returnItem', 'POST', { recordId });
};

export const returnItems = async (recordIds: string[]): Promise<{ success: boolean }> => {
    return apiCall<{ success: boolean }>('returnItems', 'POST', { recordIds });
};

// --- Settings Functions ---

export const getSettings = async (): Promise<AppSettings> => {
    const settings = await apiCall<AppSettings>('getSettings');
    
    // Merge with defaults to ensure all fields exist
    const DEFAULT_SETTINGS: AppSettings = {
        appName: 'STE Laboratory Inventory System',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        recoveryEmail: 'admin@school.edu'
    };
    
    return { ...DEFAULT_SETTINGS, ...settings };
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
    await apiCall<void>('saveSettings', 'POST', { settings });
};