
import React, { useState, useEffect } from 'react';
import { BorrowRecord, InventoryItem } from '../types';
import { X, RotateCcw, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

interface ReturnModalProps {
  record: BorrowRecord;
  item?: InventoryItem;
  onConfirm: (details: { good: number; defective: number; disposed: number }) => void;
  onCancel: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ record, item, onConfirm, onCancel }) => {
  const [goodQty, setGoodQty] = useState(record.quantity);
  const [defectiveQty, setDefectiveQty] = useState(0);
  const [disposedQty, setDisposedQty] = useState(0);

  const totalInput = goodQty + defectiveQty + disposedQty;
  const isValid = totalInput === record.quantity;

  const handleQtyChange = (type: 'good' | 'defective' | 'disposed', value: number) => {
      const val = Math.max(0, value);
      if (type === 'good') setGoodQty(val);
      if (type === 'defective') setDefectiveQty(val);
      if (type === 'disposed') setDisposedQty(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid) {
          onConfirm({ good: goodQty, defective: defectiveQty, disposed: disposedQty });
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-200">
        <div className="bg-green-600/90 px-6 py-4 flex justify-between items-center backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Return Equipment
            </h3>
            <button onClick={onCancel} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="bg-gray-50/80 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Returning Item:</p>
                <p className="font-bold text-gray-800 text-lg">{record.itemName}</p>
                <div className="flex justify-between mt-2 text-sm">
                    <span className="text-gray-600">Borrower: {record.borrowerName}</span>
                    <span className="font-bold text-blue-600">Total Borrowed: {record.quantity}</span>
                </div>
            </div>

            <div className="space-y-4">
                {/* Good Condition */}
                <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Returned in Good Condition</span>
                        </div>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={record.quantity}
                        value={goodQty}
                        onChange={(e) => handleQtyChange('good', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-green-200 bg-green-50/30 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                    />
                </div>

                {/* Defective */}
                <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                         <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span>Returned Defective / Broken</span>
                        </div>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={record.quantity}
                        value={defectiveQty}
                        onChange={(e) => handleQtyChange('defective', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-orange-200 bg-orange-50/30 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    />
                    <p className="text-xs text-orange-600 mt-1">These items will be removed from available stock.</p>
                </div>

                {/* Consumable / Disposed */}
                {(item?.isConsumable) && (
                    <div>
                        <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4 text-red-600" />
                                <span>Consumed / Disposed</span>
                            </div>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={record.quantity}
                            value={disposedQty}
                            onChange={(e) => handleQtyChange('disposed', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-red-200 bg-red-50/30 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900"
                        />
                         <p className="text-xs text-red-600 mt-1">These items will be permanently removed from inventory.</p>
                    </div>
                )}
            </div>

            <div className={`text-sm font-medium text-center p-2 rounded ${isValid ? 'text-gray-500' : 'text-red-600 bg-red-50'}`}>
                Total Accounted: {totalInput} / {record.quantity}
            </div>

            <div className="flex space-x-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!isValid}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Confirm Return
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnModal;
