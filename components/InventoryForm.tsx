

import React, { useState } from 'react';
import { InventoryItem, ItemCondition, Category, InventoryBox } from '../types';
import { X, Box, Lock, Plus, PackageOpen, Trash2 } from 'lucide-react';

interface InventoryFormProps {
  initialData?: InventoryItem;
  categories: Category[];
  onSubmit: (item: InventoryItem) => void;
  onCancel: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, categories, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>(
    initialData || {
      name: '',
      category: categories[0]?.name || 'General',
      quantity: 1,
      unit: 'pcs',
      location: '',
      condition: ItemCondition.Good,
      description: '',
      safetyNotes: '',
      borrowedQuantity: 0,
      shortId: undefined,
      isConsumable: false,
      maxBorrowable: undefined,
      boxes: []
    }
  );

  // Check if maxBorrowable has a valid value (including 0)
  const hasLimit = initialData?.maxBorrowable !== undefined && initialData?.maxBorrowable !== null;
  const [useBorrowLimit, setUseBorrowLimit] = useState<boolean>(hasLimit);

  // Boxed Item State
  const [newBoxCount, setNewBoxCount] = useState(1);
  const [qtyPerBox, setQtyPerBox] = useState(10);
  const [boxes, setBoxes] = useState<InventoryBox[]>(initialData?.boxes || []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setFormData(prev => ({ ...prev, maxBorrowable: isNaN(val) ? undefined : val }));
  };

  const handleAddBoxes = () => {
      const currentShortId = formData.shortId || formData.category?.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      
      const newBoxesList: InventoryBox[] = [];
      const currentBoxCount = boxes.length;

      for (let i = 0; i < newBoxCount; i++) {
          newBoxesList.push({
              id: `${currentShortId}-BOX-${Date.now()}-${i}`,
              label: `Box ${currentBoxCount + i + 1}`,
              quantity: qtyPerBox,
              status: 'Sealed'
          });
      }

      // Add to boxes list
      const updatedBoxes = [...boxes, ...newBoxesList];
      setBoxes(updatedBoxes);

      // Update Total Quantity automatically
      const addedQuantity = newBoxCount * qtyPerBox;
      setFormData(prev => ({
          ...prev,
          quantity: (prev.quantity || 0) + addedQuantity
      }));
  };

  const handleRemoveBox = (boxId: string, boxQty: number) => {
      setBoxes(prev => prev.filter(b => b.id !== boxId));
      // Deduct from total quantity
      setFormData(prev => ({
          ...prev,
          quantity: Math.max(0, (prev.quantity || 0) - boxQty)
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.location) {
        alert("Please fill in all required fields.");
        return;
    }
    
    // Logic check: Max borrowable shouldn't exceed total quantity
    const finalData = { ...formData, boxes: boxes };
    
    if (!useBorrowLimit) {
        // Explicitly set to null to indicate clearing the limit in the DB
        finalData.maxBorrowable = null;
    } else if (finalData.maxBorrowable !== undefined && finalData.maxBorrowable !== null && finalData.quantity !== undefined) {
        if (finalData.maxBorrowable > finalData.quantity) {
             alert("Borrow limit cannot be higher than total quantity.");
             return;
        }
    }

    onSubmit(finalData as InventoryItem);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'Edit Equipment' : 'Add New Equipment'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Name Row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm bg-white"
                placeholder="e.g. Bunsen Burner"
                required
              />
            </div>

            {/* Grid for details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name} className="text-gray-900">{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm bg-white"
                >
                  {Object.values(ItemCondition).map(cond => (
                    <option key={cond} value={cond} className="text-gray-900">{cond}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Box className="w-4 h-4 text-gray-500"/>
                    Total Quantity (Physical) *
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 shadow-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 shadow-sm bg-white"
                  placeholder="e.g. sets, pcs, boxes"
                />
              </div>
            </div>
            
            {/* Boxed Items Management */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                    <PackageOpen className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800">Boxed Stock Management</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Number of Boxes</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newBoxCount} 
                            onChange={(e) => setNewBoxCount(parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md"
                        />
                    </div>
                    <div>
                         <label className="text-xs font-medium text-gray-600 block mb-1">Qty per Box</label>
                         <input 
                            type="number" 
                            min="1"
                            value={qtyPerBox} 
                            onChange={(e) => setQtyPerBox(parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-md"
                        />
                    </div>
                    <div className="flex items-end">
                        <button 
                            type="button" 
                            onClick={handleAddBoxes}
                            className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 flex items-center justify-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Boxes
                        </button>
                    </div>
                </div>

                {boxes.length > 0 && (
                    <div className="mt-4 bg-white rounded-lg border border-gray-200 max-h-40 overflow-y-auto p-2">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                                <tr>
                                    <th className="px-2 py-1">Label</th>
                                    <th className="px-2 py-1">Qty</th>
                                    <th className="px-2 py-1">Status</th>
                                    <th className="px-2 py-1 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boxes.map(box => (
                                    <tr key={box.id} className="border-b last:border-0 border-gray-100">
                                        <td className="px-2 py-1.5 font-medium">{box.label}</td>
                                        <td className="px-2 py-1.5">{box.quantity}</td>
                                        <td className="px-2 py-1.5">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${box.status === 'Sealed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {box.status}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveBox(box.id, box.quantity)}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Borrow Limit Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center space-x-3 mb-2">
                    <input
                        type="checkbox"
                        id="useBorrowLimit"
                        checked={useBorrowLimit}
                        onChange={(e) => setUseBorrowLimit(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                    />
                    <label htmlFor="useBorrowLimit" className="text-sm font-bold text-gray-800 cursor-pointer select-none flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        Set Borrowing Limit (Boxed Stock)
                    </label>
                </div>
                
                {useBorrowLimit && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-7">
                        <p className="text-xs text-gray-600 mb-2">
                            Specify the quantity available for daily lending. Use this if you have sealed boxes you don't want opened.
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                name="maxBorrowable"
                                min="0"
                                max={formData.quantity}
                                value={formData.maxBorrowable ?? ''}
                                onChange={handleLimitChange}
                                placeholder={formData.quantity?.toString()}
                                className="w-32 px-3 py-1.5 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                            />
                            <span className="text-sm text-gray-500">
                                out of {formData.quantity} {formData.unit} available for loan
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Consumable Toggle */}
            <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input
                    type="checkbox"
                    id="isConsumable"
                    name="isConsumable"
                    checked={formData.isConsumable || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isConsumable" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Is this item a Consumable? <span className="text-gray-500 font-normal">(e.g., test tubes, pipettes, chemicals)</span>
                </label>
            </div>

            {/* Short ID Display (Read Only) */}
            {initialData?.shortId && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short ID (System Generated)</label>
                    <input
                        type="text"
                        value={initialData.shortId}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-600 font-mono text-sm shadow-sm cursor-not-allowed"
                    />
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 shadow-sm bg-white"
                placeholder="e.g. Chemistry Lab, Cabinet A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 shadow-sm bg-white"
                placeholder="Technical specifications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Safety Notes</label>
              <textarea
                name="safetyNotes"
                value={formData.safetyNotes}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-red-200 bg-red-50/50 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900 placeholder-gray-400 shadow-sm"
                placeholder="Handling precautions..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              Save Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryForm;