import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, HandPlatter, Search, Tag, Lock } from 'lucide-react';

interface BorrowModalProps {
  availableItems: InventoryItem[];
  initialItem?: InventoryItem;
  specificId?: string; // If set, we are borrowing a specific physical unit
  onConfirm: (item: InventoryItem, borrowerName: string, borrowerId: string, quantity: number, dueDate: string, specificId?: string) => void;
  onCancel: () => void;
}

const BorrowModal: React.FC<BorrowModalProps> = ({ availableItems, initialItem, specificId, onConfirm, onCancel }) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItem?.id || '');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialItem) setSelectedItemId(initialItem.id);
  }, [initialItem]);

  // If specific ID is provided (from scanner), lock quantity to 1
  useEffect(() => {
      if (specificId) {
          setQuantity(1);
      }
  }, [specificId]);

  const selectedItem = availableItems.find(i => i.id === selectedItemId);
  
  // Calculate availability based on borrow limit if it exists
  const borrowLimit = selectedItem ? (selectedItem.maxBorrowable !== undefined ? selectedItem.maxBorrowable : selectedItem.quantity) : 0;
  const available = selectedItem ? Math.max(0, borrowLimit - (selectedItem.borrowedQuantity || 0)) : 0;
  const isRestricted = selectedItem && selectedItem.maxBorrowable !== undefined && selectedItem.maxBorrowable < selectedItem.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (quantity > available) {
        alert("Quantity exceeds available loan stock.");
        return;
    }
    onConfirm(selectedItem, borrowerName, borrowerId, quantity, dueDate, specificId);
  };

  // Filter items that have available stock for borrowing
  const stockItems = availableItems.filter(i => {
      const limit = i.maxBorrowable !== undefined ? i.maxBorrowable : i.quantity;
      return (limit - (i.borrowedQuantity || 0)) > 0;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white backdrop-blur-2xl rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden border border-gray-200">
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HandPlatter className="w-5 h-5" />
                {initialItem ? 'Borrow Item' : 'New Loan'}
            </h3>
            <button onClick={onCancel} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Equipment *</label>
            {initialItem ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-900">{initialItem.name}</h4>
                    <div className="text-sm text-blue-700 flex justify-between mt-1 items-center">
                        <span className="flex items-center gap-1">
                            {isRestricted && <Lock className="w-3 h-3"/>}
                            Total Stock: {initialItem.quantity}
                        </span>
                        <span className="font-bold">Available: {available}</span>
                    </div>
                    {isRestricted && (
                        <p className="text-xs text-blue-500 mt-1">
                            * Restricted to {initialItem.maxBorrowable} borrowable units.
                        </p>
                    )}
                    {specificId && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">
                            <Tag className="w-3 h-3" />
                            Unit ID: {specificId}
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <select
                        value={selectedItemId}
                        onChange={(e) => {
                            setSelectedItemId(e.target.value);
                            setQuantity(1);
                        }}
                        required
                        disabled={!!specificId}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none shadow-sm bg-white disabled:bg-gray-100"
                    >
                        <option value="" disabled className="text-gray-500">Select Equipment...</option>
                        {stockItems.map(item => {
                            const limit = item.maxBorrowable !== undefined ? item.maxBorrowable : item.quantity;
                            const avail = Math.max(0, limit - (item.borrowedQuantity || 0));
                            return (
                                <option key={item.id} value={item.id} className="text-gray-900">
                                    {item.name} ({avail} avail)
                                </option>
                            );
                        })}
                    </select>
                    {!specificId && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <Search className="w-4 h-4" />
                        </div>
                    )}
                    {selectedItem && (
                         <div className="mt-2 text-xs text-blue-600 font-medium text-right">
                            {available} units available for loan
                         </div>
                    )}
                </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrower Name *</label>
            <input
              type="text"
              required
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number / Section *</label>
            <input
              type="text"
              required
              value={borrowerId}
              onChange={(e) => setBorrowerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm"
              placeholder="e.g. 2024-1001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                type="number"
                min="1"
                max={available}
                required
                disabled={!selectedItem || !!specificId} // Disable quantity editing if specific unit
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white shadow-sm"
                />
            </div>
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedItem || available === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Confirm Borrow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowModal;