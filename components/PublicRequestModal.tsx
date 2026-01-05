
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, BorrowRequest, RequestItem } from '../types';
import * as storage from '../services/storageService';
import * as notifications from '../services/notificationService';
import { X, Search, ShoppingBag, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle, MapPin, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import AnalogTimePicker from './AnalogTimePicker';
import { getCategoryIcon, getCategoryColor } from '../constants';

interface PublicRequestModalProps {
  onClose: () => void;
}

const PublicRequestModal: React.FC<PublicRequestModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Get Today's Date String for Min Date Restriction
  const todayString = new Date().toISOString().split('T')[0];
  
  // Form State
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [selectedItems, setSelectedItems] = useState<RequestItem[]>([]);
  const [isReservingLab, setIsReservingLab] = useState(false);
  
  // New Time State for Analog Pickers
  const [reservationDate, setReservationDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdRequest, setCreatedRequest] = useState<BorrowRequest | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
        const data = await storage.getInventory();
        const availableItems = data.filter(i => {
            const hasLimit = i.maxBorrowable !== undefined && i.maxBorrowable !== null;
            const limit = hasLimit ? i.maxBorrowable! : i.quantity;
            return (limit - (i.borrowedQuantity || 0)) > 0;
        });
        setItems(availableItems);
        
        // Auto-expand first category if available
        const categories = Array.from(new Set(availableItems.map(i => i.category)));
        if (categories.length > 0) {
            setExpandedCategories(new Set([categories[0]]));
        }
    } catch (e) {
        console.error("Failed to load inventory", e);
    } finally {
        setIsLoading(false);
    }
  };

  const validateStep1 = () => {
      const newErrors: Record<string, string> = {};
      const today = new Date().toISOString().split('T')[0];

      if (!borrowerName.trim()) newErrors.borrowerName = "Full Name is required";
      if (!borrowerId.trim()) newErrors.borrowerId = "ID / Section is required";
      
      if (borrowerEmail.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(borrowerEmail)) newErrors.borrowerEmail = "Invalid email format";
      }

      if (!returnDate) {
          newErrors.returnDate = "Return date is required";
      } else if (returnDate < today) {
          newErrors.returnDate = "Return date cannot be in the past";
      }

      if (isReservingLab) {
          if (!reservationDate) newErrors.reservationDate = "Lab reservation date is required";
          if (!startTime) newErrors.startTime = "Start time is required";
          if (!endTime) newErrors.endTime = "End time is required";
          
          if (startTime && endTime && startTime >= endTime) {
              newErrors.endTime = "End time must be after start time";
          }

          if (reservationDate && reservationDate < today) newErrors.reservationDate = "Reservation cannot be in the past";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
      if (step === 1) {
          if (validateStep1()) setStep(2);
      } else if (step === 2) {
          if (selectedItems.length === 0) {
              alert("Please select at least one item to borrow.");
          } else {
              setStep(3);
          }
      }
  };

  const filteredInventory = useMemo(() => {
      const filtered = items.filter(i => 
          i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          i.category.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // If searching, auto-expand all matching categories
      if (searchTerm.trim().length > 0) {
          const matchingCats = new Set(filtered.map(i => i.category));
          setExpandedCategories(matchingCats);
      }

      return filtered;
  }, [items, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredInventory.forEach(item => {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
    });
    return groups;
  }, [filteredInventory]);

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(cat)) newSet.delete(cat);
          else newSet.add(cat);
          return newSet;
      });
  };

  const addItem = (item: InventoryItem) => {
      const hasLimit = item.maxBorrowable !== undefined && item.maxBorrowable !== null;
      const limit = hasLimit ? item.maxBorrowable! : item.quantity;
      const available = Math.max(0, limit - (item.borrowedQuantity || 0));

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

  const formatTime = (t24: string) => {
      if (!t24) return '';
      const [h, m] = t24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSubmit = async () => {
      if (!validateStep1() || selectedItems.length === 0) return;
      
      setIsLoading(true);
      try {
          const refCode = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
          const resSlot = isReservingLab ? `${formatTime(startTime)} - ${formatTime(endTime)}` : undefined;
          
          const requestData: Partial<BorrowRequest> = {
              referenceCode: refCode,
              borrowerName,
              borrowerId,
              borrowerEmail,
              returnDate,
              requestDate: new Date().toISOString(),
              items: selectedItems,
              reservationSlot: resSlot,
              reservationDate: isReservingLab ? reservationDate : undefined,
              status: 'Pending'
          };

          const newRequest = await storage.createBorrowRequest(requestData);

          if (newRequest) {
              const settings = await storage.getSettings();
              // Notify Admins
              await notifications.notifyAdminsOfNewRequest(settings, newRequest);
              
              setCreatedRequest(newRequest);
              setStep(4);
          } else {
              throw new Error("Failed to create request entry in cloud.");
          }
      } catch (err: any) {
          alert("Submission Error: " + (err.message || "Please check your internet connection."));
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-gray-200 overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-2"><X className="w-6 h-6" /></button>

        <div className="bg-maroon-600 p-6 text-white flex-shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="w-6 h-6" />Borrow Request</h2>
            <p className="text-maroon-100 text-sm">Step {step} of 4: {step === 1 ? 'Information' : step === 2 ? 'Select Equipment' : step === 3 ? 'Final Review' : 'Success'}</p>
        </div>

        <div className="flex-1 overflow-hidden p-6 bg-gray-50/50 flex flex-col">
            {step === 1 && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300 overflow-y-auto w-full pr-2">
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Borrower Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white ${errors.borrowerName ? 'border-red-500' : 'border-gray-300'}`} placeholder="Juan Dela Cruz" />
                            {errors.borrowerName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.borrowerName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID / Grade & Section *</label>
                            <input type="text" value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white ${errors.borrowerId ? 'border-red-500' : 'border-gray-300'}`} placeholder="10-Einstein" />
                            {errors.borrowerId && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.borrowerId}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input type="email" value={borrowerEmail} onChange={(e) => setBorrowerEmail(e.target.value)} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white ${errors.borrowerEmail ? 'border-red-500' : 'border-gray-300'}`} placeholder="student@school.edu" />
                            {errors.borrowerEmail ? <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.borrowerEmail}</p> : <p className="text-[10px] text-gray-400 mt-1">Recommended for status notifications.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Return Due Date *</label>
                            <input 
                                type="date" 
                                min={todayString}
                                value={returnDate} 
                                onChange={(e) => setReturnDate(e.target.value)} 
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-white ${errors.returnDate ? 'border-red-500' : 'border-gray-300'}`} 
                            />
                            {errors.returnDate && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.returnDate}</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border-2 border-dashed border-maroon-100 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-maroon-50 text-maroon-600 rounded-lg"><MapPin className="w-5 h-5" /></div>
                                <div><h4 className="font-bold text-gray-800">Laboratory Facility Reservation</h4><p className="text-xs text-gray-500">Enable if you need space for your experiment.</p></div>
                            </div>
                            <button type="button" onClick={() => setIsReservingLab(!isReservingLab)} className={`w-12 h-6 rounded-full transition-colors relative ${isReservingLab ? 'bg-maroon-600' : 'bg-gray-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isReservingLab ? 'left-7' : 'left-1'}`} /></button>
                        </div>
                        {isReservingLab && (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Date Needed</label>
                                    <input 
                                        type="date" 
                                        min={todayString}
                                        value={reservationDate} 
                                        onChange={(e) => setReservationDate(e.target.value)} 
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-maroon-500 bg-maroon-50/30 ${errors.reservationDate ? 'border-red-500' : 'border-maroon-100'}`} 
                                    />
                                    {errors.reservationDate && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.reservationDate}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <AnalogTimePicker 
                                          label="Start Time"
                                          value={startTime}
                                          onChange={setStartTime}
                                        />
                                        {errors.startTime && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.startTime}</p>}
                                    </div>
                                    <div>
                                        <AnalogTimePicker 
                                          label="End Time"
                                          value={endTime}
                                          onChange={setEndTime}
                                        />
                                        {errors.endTime && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.endTime}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="flex h-full gap-6 animate-in fade-in slide-in-from-right-8 duration-300 overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0">
                         <div className="mb-4 relative flex-shrink-0">
                            <input type="text" placeholder="Search equipment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-maroon-500" />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                             {Object.keys(groupedItems).length > 0 ? Object.keys(groupedItems).map(category => {
                                 const isExpanded = expandedCategories.has(category);
                                 const catItems = groupedItems[category];
                                 
                                 return (
                                    <div key={category} className="bg-white rounded-lg border border-gray-200 shadow-sm mb-2 overflow-hidden transition-all duration-300">
                                        <button 
                                            onClick={() => toggleCategory(category)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors select-none"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div style={{ color: getCategoryColor(category) }}>
                                                    {getCategoryIcon(category)}
                                                </div>
                                                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">{category}</h4>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{catItems.length}</span>
                                            </div>
                                            <div className="text-gray-400">
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </div>
                                        </button>
                                        
                                        {isExpanded && (
                                            <div className="p-2 pt-0 border-t border-gray-100 bg-gray-50/30 animate-in slide-in-from-top-1 duration-200">
                                                <div className="grid grid-cols-1 gap-1.5 pt-2">
                                                    {catItems.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 hover:border-maroon-300 transition-all group shadow-sm">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] text-gray-500 font-medium px-1.5 py-0.5 bg-gray-100 rounded">Available: {item.quantity - (item.borrowedQuantity || 0)} {item.unit}</span>
                                                                    {item.location && <span className="text-[10px] text-gray-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {item.location}</span>}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => addItem(item)} 
                                                                className="ml-3 p-2 bg-maroon-50 text-maroon-600 rounded-lg hover:bg-maroon-600 hover:text-white transition-all shadow-sm border border-maroon-100"
                                                                title="Add to bucket"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                 );
                             }) : (
                                 <div className="text-center py-20 text-gray-400">
                                     <Search className="w-12 h-12 mx-auto opacity-10 mb-2"/>
                                     <p>No matching equipment found.</p>
                                 </div>
                             )}
                         </div>
                    </div>
                    <div className="w-80 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col flex-shrink-0">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b">
                            <h4 className="font-bold text-gray-800">Your Bucket</h4>
                            <span className="bg-maroon-100 text-maroon-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{selectedItems.length} Items</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                            {selectedItems.length > 0 ? selectedItems.map(p => (
                                <div key={p.itemId} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                    <div className="min-w-0 flex-1 mr-2">
                                        <p className="font-medium text-gray-800 truncate">{p.itemName}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="1" value={p.quantity} onChange={(e) => setSelectedItems(prev => prev.map(item => item.itemId === p.itemId ? {...item, quantity: Math.max(1, parseInt(e.target.value) || 1)} : item))} className="w-12 px-1 py-0.5 border border-gray-200 rounded text-center text-sm" />
                                        <button onClick={() => setSelectedItems(prev => prev.filter(item => item.itemId !== p.itemId))} className="text-red-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-xs text-gray-400">Your bucket is empty.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300 overflow-y-auto w-full pr-2">
                     <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">Review Submission</h3>
                        <p className="text-gray-500">Please verify your details before submitting.</p>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                            <div><label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Borrower</label><p className="font-bold text-gray-800 text-lg">{borrowerName}</p></div>
                            <div><label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">ID / Section</label><p className="font-medium text-gray-600">{borrowerId}</p></div>
                            <div><label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Contact</label><p className="font-medium text-blue-600 truncate">{borrowerEmail || 'N/A'}</p></div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Estimated Return</label><p className="font-bold text-maroon-600 text-lg">{returnDate}</p></div>
                            {isReservingLab && (
                                <div><label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lab Reservation</label><p className="font-bold text-blue-600">{reservationDate} @ {formatTime(startTime)} - {formatTime(endTime)}</p></div>
                            )}
                        </div>
                     </div>

                     <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Equipment List</h4>
                        <ul className="space-y-2">
                            {selectedItems.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                    <span className="text-gray-700">{item.itemName}</span>
                                    <span className="font-bold text-maroon-600">x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                     </div>
                </div>
            )}

            {step === 4 && createdRequest && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in zoom-in overflow-y-auto">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"><CheckCircle className="w-16 h-16" /></div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900">Submission Successful!</h2>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Your request has been sent for approval. You will be notified via email if provided.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-dashed border-maroon-200 transform hover:scale-105 transition-transform flex-shrink-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tracking Code</p>
                        <h3 className="text-4xl font-mono font-black text-maroon-600">{createdRequest.referenceCode}</h3>
                        <p className="text-[10px] text-gray-400 mt-4">Screenshot this code or save it for retrieval.</p>
                    </div>
                    <button onClick={onClose} className="px-10 py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-colors flex-shrink-0">Close Portal</button>
                </div>
            )}
        </div>

        {step < 4 && (
            <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                {step > 1 ? <button onClick={() => setStep(prev => (prev - 1) as any)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 px-4 py-2"><ArrowLeft className="w-4 h-4" /> Back</button> : <div />}
                <div className="flex gap-3">
                    {step < 3 ? (
                        <button onClick={handleNext} className="bg-maroon-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-maroon-700 transition-all flex items-center gap-2">Next Step <ArrowRight className="w-4 h-4" /></button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 text-white px-10 py-2.5 rounded-lg font-bold shadow-lg disabled:opacity-50 hover:bg-green-700 transition-all flex items-center gap-2">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                            {isLoading ? 'Sending...' : 'Confirm & Submit'}
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PublicRequestModal;
