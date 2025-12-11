import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, BorrowRequest, RequestItem } from '../types';
import * as storage from '../services/storageService';
import { X, Search, ShoppingBag, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle, QrCode } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../constants';

interface PublicRequestModalProps {
  onClose: () => void;
}

const PublicRequestModal: React.FC<PublicRequestModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Details, 2: Select Items, 3: Review, 4: Success
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [selectedItems, setSelectedItems] = useState<RequestItem[]>([]);
  
  // Result State
  const [createdRequest, setCreatedRequest] = useState<BorrowRequest | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    const data = await storage.getInventory();
    // Filter items that have available stock based on borrow limits
    const availableItems = data.filter(i => {
        const limit = i.maxBorrowable !== undefined ? i.maxBorrowable : i.quantity;
        return (limit - (i.borrowedQuantity || 0)) > 0;
    });
    setItems(availableItems);
    setIsLoading(false);
  };

  const filteredInventory = useMemo(() => {
      return items.filter(i => 
          i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          i.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [items, searchTerm]);

  const getAvailableQty = (item: InventoryItem) => {
      const limit = item.maxBorrowable !== undefined ? item.maxBorrowable : item.quantity;
      return Math.max(0, limit - (item.borrowedQuantity || 0));
  };

  const addItem = (item: InventoryItem) => {
      const available = getAvailableQty(item);
      setSelectedItems(prev => {
          const existing = prev.find(p => p.itemId === item.id);
          if (existing) {
              if (existing.quantity < available) {
                  return prev.map(p => p.itemId === item.id ? { ...p, quantity: p.quantity + 1 } : p);
              }
              return prev;
          }
          return [...prev, { itemId: item.id, itemName: item.name, quantity: 1 }];
      });
  };

  const removeItem = (itemId: string) => {
      setSelectedItems(prev => prev.filter(p => p.itemId !== itemId));
  };

  const updateItemQty = (itemId: string, qty: number) => {
      if (qty <= 0) {
          removeItem(itemId);
          return;
      }
      const invItem = items.find(i => i.id === itemId);
      if (!invItem) return;
      const max = getAvailableQty(invItem);
      
      setSelectedItems(prev => prev.map(p => p.itemId === itemId ? { ...p, quantity: Math.min(qty, max) } : p));
  };

  const handleSubmit = async () => {
      if (!borrowerName || !borrowerId || !returnDate || selectedItems.length === 0) return;
      
      setIsLoading(true);
      const refCode = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
      
      const newRequest = await storage.createBorrowRequest({
          referenceCode: refCode,
          borrowerName,
          borrowerId,
          returnDate,
          requestDate: new Date().toISOString(),
          items: selectedItems
      });

      if (newRequest) {
          setCreatedRequest(newRequest);
          setStep(4);
      } else {
          alert("Failed to create request. Please try again.");
      }
      setIsLoading(false);
  };

  const qrUrl = createdRequest ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(createdRequest.referenceCode)}` : '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-gray-200 overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
            <X className="w-6 h-6" />
        </button>

        {/* Steps Header */}
        <div className="bg-maroon-600 p-6 text-white flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6" />
                    Borrow Request
                </h2>
                <p className="text-maroon-100 text-sm">Step {step} of 4</p>
            </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            
            {step === 1 && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Borrower Information</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white" placeholder="e.g. Juan Dela Cruz" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Number / Grade & Section</label>
                        <input type="text" value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white" placeholder="e.g. 10-Newton / 2024-001" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date</label>
                        <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white" />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="flex h-full gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
                    {/* Catalog */}
                    <div className="flex-1 flex flex-col">
                         <div className="mb-4 relative">
                            <input 
                                type="text" 
                                placeholder="Search equipment..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-maroon-500"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                             {filteredInventory.map(item => {
                                 const available = getAvailableQty(item);
                                 const inCart = selectedItems.find(p => p.itemId === item.id)?.quantity || 0;
                                 const canAdd = inCart < available;

                                 return (
                                     <div key={item.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center group hover:border-maroon-300 transition-all">
                                         <div className="flex items-center gap-3">
                                             <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-maroon-50 group-hover:text-maroon-600 transition-colors">
                                                {getCategoryIcon(item.category)}
                                             </div>
                                             <div>
                                                 <h4 className="font-bold text-gray-800">{item.name}</h4>
                                                 <p className="text-xs text-gray-500">{item.category} • {available} avail</p>
                                             </div>
                                         </div>
                                         <button 
                                            onClick={() => addItem(item)} 
                                            disabled={!canAdd}
                                            className={`p-2 rounded-full transition-colors ${canAdd ? 'bg-maroon-100 text-maroon-600 hover:bg-maroon-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                         >
                                             <Plus className="w-4 h-4" />
                                         </button>
                                     </div>
                                 );
                             })}
                         </div>
                    </div>

                    {/* Cart Preview */}
                    <div className="w-80 bg-white p-4 rounded-xl border shadow-sm flex flex-col">
                        <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b flex justify-between items-center">
                            Your Request
                            <span className="bg-maroon-600 text-white text-xs px-2 py-0.5 rounded-full">{selectedItems.length}</span>
                        </h4>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {selectedItems.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm mt-10">No items selected.</p>
                            ) : (
                                selectedItems.map(p => (
                                    <div key={p.itemId} className="flex justify-between items-center text-sm">
                                        <div className="truncate flex-1 font-medium text-gray-700">{p.itemName}</div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={p.quantity} 
                                                onChange={(e) => updateItemQty(p.itemId, parseInt(e.target.value))}
                                                className="w-12 px-1 py-0.5 border rounded text-center"
                                            />
                                            <button onClick={() => removeItem(p.itemId)} className="text-red-400 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                     <h3 className="text-xl font-bold text-gray-800 text-center">Review Your Request</h3>
                     
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                                 <span className="block text-gray-500">Name</span>
                                 <span className="font-bold text-gray-800">{borrowerName}</span>
                             </div>
                             <div>
                                 <span className="block text-gray-500">ID / Section</span>
                                 <span className="font-bold text-gray-800">{borrowerId}</span>
                             </div>
                             <div className="col-span-2">
                                 <span className="block text-gray-500">Return Date</span>
                                 <span className="font-bold text-maroon-600">{returnDate}</span>
                             </div>
                         </div>

                         <div className="border-t pt-4">
                             <h4 className="font-bold text-gray-700 mb-2">Requested Items</h4>
                             <table className="w-full text-sm text-left">
                                 <thead className="text-gray-500 bg-gray-50">
                                     <tr>
                                         <th className="px-3 py-2">Item</th>
                                         <th className="px-3 py-2 text-right">Qty</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y">
                                     {selectedItems.map(p => (
                                         <tr key={p.itemId}>
                                             <td className="px-3 py-2">{p.itemName}</td>
                                             <td className="px-3 py-2 text-right font-bold">{p.quantity}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                </div>
            )}

            {step === 4 && createdRequest && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in duration-300 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
                        <p className="text-gray-500">Please present this code to the Laboratory Admin.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                         <h3 className="text-3xl font-mono font-bold text-maroon-600 tracking-wider mb-4">{createdRequest.referenceCode}</h3>
                         <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto mix-blend-multiply" />
                         <p className="text-xs text-gray-400 mt-2">Scan to track status</p>
                    </div>

                    <button onClick={onClose} className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 shadow-md">
                        Done
                    </button>
                </div>
            )}

        </div>

        {/* Footer Navigation */}
        {step < 4 && (
            <div className="p-4 border-t bg-white flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={() => setStep(prev => (prev - 1) as any)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                ) : <div></div>}

                {step === 3 ? (
                     <button 
                        onClick={handleSubmit} 
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 shadow-lg font-bold disabled:opacity-50"
                     >
                        {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                ) : (
                    <button 
                        onClick={() => {
                            if (step === 1 && (!borrowerName || !borrowerId || !returnDate)) {
                                alert("Please fill in all details.");
                                return;
                            }
                            if (step === 2 && selectedItems.length === 0) {
                                alert("Please add at least one item.");
                                return;
                            }
                            setStep(prev => (prev + 1) as any);
                        }} 
                        className="flex items-center gap-2 bg-maroon-600 text-white px-6 py-2.5 rounded-lg hover:bg-maroon-700 shadow-md font-medium"
                    >
                        Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default PublicRequestModal;