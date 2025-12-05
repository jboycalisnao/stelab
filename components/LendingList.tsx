
import React, { useState } from 'react';
import { BorrowRecord } from '../types';
import { Search, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { getCategoryIcon } from '../constants';

interface LendingListProps {
  records: BorrowRecord[];
  onReturn: (recordId: string) => void;
  onReturnBulk: (recordIds: string[]) => void;
}

const LendingList: React.FC<LendingListProps> = ({ records, onReturn, onReturnBulk }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Borrowed' | 'Returned'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
        record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        record.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || 
        (filterStatus === 'Borrowed' && record.status === 'Borrowed') ||
        (filterStatus === 'Returned' && record.status === 'Returned');

    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());

  // Only active (borrowed) records can be selected for return
  const activeRecords = filteredRecords.filter(r => r.status === 'Borrowed');

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date().toISOString().split('T')[0] !== dueDate;
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === activeRecords.length && activeRecords.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(activeRecords.map(r => r.id)));
      }
  };

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const handleBulkReturn = () => {
      if (selectedIds.size === 0) return;
      onReturnBulk(Array.from(selectedIds));
      setSelectedIds(new Set());
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-sm border border-white/50 flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/30 rounded-t-xl">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search items or borrowers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 placeholder-gray-500 backdrop-blur-sm"
          />
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto items-center justify-between sm:justify-end">
            {selectedIds.size > 0 && (
                <button
                    onClick={handleBulkReturn}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md text-sm font-medium animate-in fade-in zoom-in duration-200"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span>Return Selected ({selectedIds.size})</span>
                </button>
            )}

            <div className="flex bg-white/40 rounded-lg p-1 border border-white/40">
                <button 
                    onClick={() => setFilterStatus('All')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'All' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterStatus('Borrowed')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'Borrowed' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    Active
                </button>
                <button 
                    onClick={() => setFilterStatus('Returned')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'Returned' ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    Returned
                </button>
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/50 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600 transition-colors">
                    {activeRecords.length > 0 && selectedIds.size === activeRecords.length ? (
                        <CheckSquare className="w-4 h-4" />
                    ) : (
                        <Square className="w-4 h-4" />
                    )}
                  </button>
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Equipment</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Borrower</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/50">
            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
              <tr key={record.id} className={`hover:bg-white/40 transition-colors ${selectedIds.has(record.id) ? 'bg-indigo-50/40' : ''}`}>
                <td className="px-6 py-4 text-center">
                    {record.status === 'Borrowed' && (
                        <button 
                            onClick={() => toggleSelect(record.id)} 
                            className={`${selectedIds.has(record.id) ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                            {selectedIds.has(record.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                    )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-white/60 border border-white/50 text-gray-500 shadow-sm">
                        {getCategoryIcon(record.itemCategory)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{record.itemName}</div>
                      <div className="text-xs text-gray-500">{record.itemCategory}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{record.borrowerName}</div>
                    <div className="text-xs text-gray-500">{record.borrowerId}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                  {record.quantity}
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col text-xs">
                        <span className="text-gray-500">Borrowed: {record.borrowDate}</span>
                        {record.status === 'Returned' ? (
                            <span className="text-green-600 font-medium">Returned: {record.returnDate}</span>
                        ) : (
                            <span className={`${isOverdue(record.dueDate) ? 'text-red-600 font-bold' : 'text-indigo-600'}`}>
                                Due: {record.dueDate}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    {record.status === 'Returned' ? (
                         <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100/80 text-green-700 backdrop-blur-sm">
                            Returned
                         </span>
                    ) : (
                        isOverdue(record.dueDate) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100/80 text-red-700 animate-pulse backdrop-blur-sm">
                                Overdue
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100/80 text-indigo-700 backdrop-blur-sm">
                                Active
                            </span>
                        )
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                  {record.status === 'Borrowed' && (
                    <button 
                      onClick={() => onReturn(record.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-50/50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors border border-green-200/50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return</span>
                    </button>
                  )}
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No lending records found matching your criteria.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LendingList;
