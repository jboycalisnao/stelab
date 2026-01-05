
import { InventoryItem, BorrowRecord, AppSettings, Category, ItemCondition, BorrowRequest, RequestStatus, BorrowStatus } from '../types';
import { supabase } from '../supabaseClient';

// Helper to map DB row to InventoryItem type
const mapInventoryItem = (data: any): InventoryItem => ({
    id: data.id,
    name: data.name,
    category: data.category,
    quantity: data.quantity,
    borrowedQuantity: data.borrowedQuantity || 0,
    unit: data.unit,
    location: data.location,
    condition: data.condition as ItemCondition,
    description: data.description || '',
    safetyNotes: data.safetyNotes || '',
    lastUpdated: data.lastUpdated,
    shortId: data.shortId,
    isConsumable: data.isConsumable || false
});

// --- Inventory Management ---

export const getInventory = async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase.from('inventory_items').select('*');
    if (error) throw error;
    return (data || []).map(mapInventoryItem);
};

export const getInventoryItem = async (id: string): Promise<InventoryItem | null> => {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapInventoryItem(data);
};

export const saveItem = async (item: InventoryItem): Promise<{ success: boolean; message?: string }> => {
    if (!item.id) item.id = crypto.randomUUID();
    
    const payload = {
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        borrowedQuantity: item.borrowedQuantity,
        unit: item.unit,
        location: item.location,
        condition: item.condition,
        description: item.description,
        safetyNotes: item.safetyNotes,
        lastUpdated: new Date().toISOString(),
        shortId: item.shortId,
        isConsumable: item.isConsumable
    };

    const { error } = await supabase.from('inventory_items').upsert(payload);
    if (error) return { success: false, message: error.message };
    return { success: true };
};

export const deleteItem = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- App Settings ---

export const getSettings = async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (error || !data) throw error || new Error("Settings unreachable");
    
    return {
        appName: data.appName,
        logoUrl: data.logoUrl,
        customFooterText: data.customFooterText,
        adminUsername: data.adminUsername,
        adminPassword: data.adminPassword,
        recoveryEmail: data.recoveryEmail,
        googleAppsScriptUrl: data.googleAppsScriptUrl,
        notificationEmails: data.notificationEmails,
        labInCharge: data.labInCharge
    };
};

export const saveSettings = async (settings: AppSettings): Promise<boolean> => {
    const payload = {
        id: 1,
        appName: settings.appName,
        logoUrl: settings.logoUrl,
        customFooterText: settings.customFooterText,
        adminUsername: settings.adminUsername,
        adminPassword: settings.adminPassword,
        recoveryEmail: settings.recoveryEmail,
        googleAppsScriptUrl: settings.googleAppsScriptUrl,
        notificationEmails: settings.notificationEmails,
        labInCharge: settings.labInCharge
    };
    const { error } = await supabase.from('app_settings').upsert(payload);
    return !error;
};

// --- Borrowing Logic ---

export const getBorrowRecords = async (): Promise<BorrowRecord[]> => {
    const { data, error } = await supabase.from('borrow_records').select('*');
    if (error) throw error;
    return (data || []).map((d: any) => ({
        id: d.id,
        itemId: d.itemid,
        itemName: d.itemName,
        itemCategory: d.itemCategory,
        borrowerName: d.borrowerName,
        borrowerId: d.borrowerId,
        borrowerEmail: d.borrowerEmail, 
        quantity: d.quantity,
        borrowDate: d.borrowDate,
        dueDate: d.dueDate,
        returnDate: d.returnDate,
        status: d.status as BorrowStatus,
        specificId: d.specificId
    }));
};

export const syncOverdueStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('borrow_records')
        .update({ status: 'Overdue' })
        .eq('status', 'Borrowed')
        .lt('dueDate', today)
        .select();
    if (error) throw error;
    
    const updatedRecords: BorrowRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        itemId: d.itemid,
        itemName: d.itemName,
        itemCategory: d.itemCategory,
        borrowerName: d.borrowerName,
        borrowerId: d.borrowerId,
        borrowerEmail: d.borrowerEmail, 
        quantity: d.quantity,
        borrowDate: d.borrowDate,
        dueDate: d.dueDate,
        returnDate: d.returnDate,
        status: d.status as BorrowStatus,
        specificId: d.specificId
    }));

    return { updated: updatedRecords };
};

export const borrowItem = async (itemId: string, borrowerName: string, borrowerId: string, quantity: number, dueDate: string, borrowerEmail?: string, specificId?: string) => {
    const { data: item, error: itemError } = await supabase.from('inventory_items').select('*').eq('id', itemId).single();
    if (itemError || !item) return { success: false, message: "Item not found in cloud." };

    const newBorrowed = (item.borrowedQuantity || 0) + quantity;

    const { error: updateError } = await supabase.from('inventory_items').update({ borrowedQuantity: newBorrowed }).eq('id', itemId);
    if (updateError) return { success: false, message: updateError.message };

    const { error: recordError } = await supabase.from('borrow_records').insert({
        id: crypto.randomUUID(),
        itemid: itemId,
        itemName: item.name,
        itemCategory: item.category,
        borrowerName: borrowerName,
        borrowerId: borrowerId,
        borrowerEmail: borrowerEmail, 
        quantity: quantity,
        borrowDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate,
        status: 'Borrowed',
        specificId: specificId
    });

    if (recordError) return { success: false, message: recordError.message };
    return { success: true };
};

export const returnItem = async (recordId: string, details: { good: number; defective: number; disposed: number }) => {
    const { data: record, error: recError } = await supabase.from('borrow_records').select('*').eq('id', recordId).single();
    if (recError || !record) return { success: false, message: "Record missing in cloud." };

    const { data: item, error: itemError } = await supabase.from('inventory_items').select('*').eq('id', record.itemid).single();
    if (itemError || !item) return { success: false, message: "Inventory item missing in cloud." };

    const newBorrowed = Math.max(0, (item.borrowedQuantity || 0) - record.quantity);
    const newTotal = Math.max(0, item.quantity - (details.defective + details.disposed));

    const { error: itemUpdateError } = await supabase.from('inventory_items').update({
        quantity: newTotal,
        borrowedQuantity: newBorrowed
    }).eq('id', item.id);

    if (itemUpdateError) return { success: false, message: itemUpdateError.message };

    const { error: recordUpdateError } = await supabase.from('borrow_records').update({
        status: 'Returned',
        returnDate: new Date().toISOString().split('T')[0]
    }).eq('id', recordId);

    if (recordUpdateError) return { success: false, message: recordUpdateError.message };
    return { success: true };
};

export const deleteBorrowRecord = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('borrow_records').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- Categories ---

export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return data || [];
};

export const addCategory = async (name: string) => {
    await supabase.from('categories').insert({ id: crypto.randomUUID(), name });
};

export const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
};

// --- Borrow Requests ---

export const getBorrowRequests = async (): Promise<BorrowRequest[]> => {
    const { data, error } = await supabase.from('borrow_requests').select('*');
    if (error) throw error;
    return (data || []).map((d: any) => ({
        id: d.id,
        referenceCode: d.referenceCode,
        borrowerName: d.borrowerName,
        borrowerId: d.borrowerId,
        borrowerEmail: d.borrowerEmail,
        instructorName: d.instructorName,
        requestDate: d.requestDate,
        returnDate: d.returnDate,
        status: d.status as RequestStatus,
        items: d.items,
        adminNotes: d.adminNotes,
        reservationSlot: d.reservationSlot,
        reservationDate: d.reservationDate
    }));
};

export const createBorrowRequest = async (req: Partial<BorrowRequest>) => {
    const { data, error } = await supabase.from('borrow_requests').insert({
        id: crypto.randomUUID(),
        referenceCode: req.referenceCode,
        borrowerName: req.borrowerName,
        borrowerId: req.borrowerId,
        borrowerEmail: req.borrowerEmail,
        instructorName: req.instructorName,
        returnDate: req.returnDate,
        requestDate: req.requestDate || new Date().toISOString(),
        items: req.items,
        status: 'Pending',
        reservationSlot: req.reservationSlot,
        reservationDate: req.reservationDate
    }).select().single();
    
    if (error) {
        console.error("Supabase Request Creation Error:", error.message, error.details);
        return null;
    }

    return {
        id: data.id,
        referenceCode: data.referenceCode,
        borrowerName: data.borrowerName,
        borrowerId: data.borrowerId,
        borrowerEmail: data.borrowerEmail,
        instructorName: data.instructorName,
        requestDate: data.requestDate,
        returnDate: data.returnDate,
        status: data.status,
        items: data.items,
        reservationSlot: data.reservationSlot,
        reservationDate: data.reservationDate
    } as BorrowRequest;
};

export const getBorrowRequestByCode = async (code: string) => {
    const { data, error } = await supabase.from('borrow_requests').select('*').eq('referenceCode', code).single();
    if (error || !data) return null;
    return {
        id: data.id,
        referenceCode: data.referenceCode,
        borrowerName: data.borrowerName,
        borrowerId: data.borrowerId,
        borrowerEmail: data.borrowerEmail,
        instructorName: data.instructorName,
        requestDate: data.requestDate,
        returnDate: data.returnDate,
        status: data.status,
        items: data.items,
        reservationSlot: data.reservationSlot,
        reservationDate: data.reservationDate
    } as BorrowRequest;
};

export const updateBorrowRequestStatus = async (id: string, status: RequestStatus) => {
    await supabase.from('borrow_requests').update({ status }).eq('id', id);
};

export const deleteBorrowRequest = async (id: string) => {
    await supabase.from('borrow_requests').delete().eq('id', id);
};

export const processApprovedRequest = async (request: BorrowRequest) => {
    try {
        for (const reqItem of request.items) {
            const { data: item, error: itemError } = await supabase.from('inventory_items').select('*').eq('id', reqItem.itemId).single();
            if (itemError || !item) throw new Error(`Item ${reqItem.itemName} missing.`);

            const newBorrowed = (item.borrowedQuantity || 0) + reqItem.quantity;
            await supabase.from('inventory_items').update({ borrowedQuantity: newBorrowed }).eq('id', item.id);

            const recordId = crypto.randomUUID();
            await supabase.from('borrow_records').insert({
                id: recordId,
                itemid: item.id,
                itemName: item.name,
                itemCategory: item.category,
                borrowerName: request.borrowerName,
                borrowerId: request.borrowerId,
                borrowerEmail: request.borrowerEmail, 
                quantity: reqItem.quantity,
                borrowDate: new Date().toISOString().split('T')[0],
                dueDate: request.returnDate,
                status: 'Borrowed'
            });

            reqItem.linkedRecordId = recordId;
        }

        await supabase.from('borrow_requests').update({ status: 'Approved', items: request.items }).eq('id', request.id);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};
