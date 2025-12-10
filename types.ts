

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Changed from Enum to string for dynamic categories
  quantity: number;
  borrowedQuantity: number;
  unit: string;
  location: string;
  condition: ItemCondition;
  description: string;
  safetyNotes: string;
  lastUpdated: string;
  shortId?: string; // Unique short identifier for barcode generation (e.g., BIO-1024)
  isConsumable?: boolean;
}

export enum ItemCondition {
  Good = 'Good',
  Fair = 'Fair',
  Repairable = 'Repairable',
  Defective = 'Defective',
  Condemned = 'Condemned'
}

export interface Stats {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  valueByCategory: { name: string; value: number }[];
  conditionBreakdown: { name: string; value: number }[];
  borrowedCount: number;
}

export interface AIAnalysisResult {
  name: string;
  category: string;
  description: string;
  safetyNotes: string;
}

export type BorrowStatus = 'Borrowed' | 'Returned' | 'Overdue';

export interface BorrowRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  borrowerName: string;
  borrowerId: string;
  quantity: number;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: BorrowStatus;
  specificId?: string; // The specific unit ID (e.g. CHE-100-001)
}

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  customFooterText?: string;
  adminUsername?: string;
  adminPassword?: string;
  recoveryEmail?: string;
  
  // EmailJS Configuration for Real Emails
  emailJsServiceId?: string;
  emailJsTemplateId?: string;
  emailJsPublicKey?: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault?: boolean;
}

// --- Audit Logging Types ---

export interface AuditDetail {
  uniqueId: string;
  seq: string;
  status: 'present' | 'missing' | 'borrowed';
}

export interface AuditLog {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemLocation: string;
  stats: {
    total: number;
    present: number;
    borrowed: number;
    missing: number;
    accuracy: number;
  };
  details: AuditDetail[];
}

// --- Borrow Request Types ---

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled' | 'Released' | 'Returned';

export interface RequestItem {
  itemId: string;
  itemName: string;
  quantity: number;
  linkedRecordId?: string; // ID of the actual borrow record created from this item
}

export interface BorrowRequest {
  id: string;
  referenceCode: string;
  borrowerName: string;
  borrowerId: string;
  requestDate: string;
  returnDate: string;
  status: RequestStatus;
  items: RequestItem[];
  adminNotes?: string;
}