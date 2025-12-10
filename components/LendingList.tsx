

import React, { useState, useMemo } from 'react';
import { BorrowRecord } from '../types';
import { Search, RotateCcw, CheckSquare, Square, ChevronDown, ChevronRight, Package, Trash2 } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../constants';

interface LendingListProps {
  records: BorrowRecord[];
  onReturn: (recordId: string) => void;
  onReturnBulk: (recordIds: string[]) => void;
  onDelete: (recordId: string) => void;
  onDeleteBulk: (recordIds: string[]) => void;
}

const LendingList: React.FC<LendingListProps> = ({ records, onReturn, onReturnBulk, onDelete, onDeleteBulk }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Borrowed' | 'Returned'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 1. Filter Records
  const filteredRecords = useMemo(() => {
     return records.filter(record => {
        const matchesSearch = 
            record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            record.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'All' || 
            (filterStatus === 'Borrowed' && record.status === 'Borrowed') ||
            (filterStatus === 'Returned' && record.status === 'Returned');

        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
  }, [records, searchTerm, filterStatus]);

  // 2. Group Records
  const groupedRecords = useMemo(() => {
      const groups: Record<string, BorrowRecord[]> = {};
      filteredRecords.forEach(rec => {
          if (!groups[rec.itemId]) groups[rec.itemId] = [];
          groups[rec.itemId].push(rec);
      });
      return groups;
  }, [filteredRecords]);

  // Sorted Group Keys (by most recent activity in group)
  const sortedGroupKeys = useMemo(() => {
      return Object.keys(groupedRecords).sort((a, b) => {
          const latestA = groupedRecords[a][0]?.borrowDate || '';
          const latestB = groupedRecords[b][0]?.borrowDate || '';
          return new Date(latestB).getTime() - new Date(latestA).getTime();
      });
  }, [groupedRecords]);

  const toggleExpand = (itemId: string) => {
      const newSet = new Set(expandedItems);
      if (newSet.has(itemId)) newSet.delete(itemId);
      else newSet.add(itemId);
      setExpandedItems(newSet);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date().toISOString().split('T')[0] !== dueDate;
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

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      onDeleteBulk(Array.from(selectedIds));
      setSelectedIds(new Set());
  };

  // Helper to get item details from the first record of the group
  const getItemDetails = (itemId: string) => {
      const rec = groupedRecords[itemId]?.[0];
      if (!rec) return { name: 'Unknown', category: 'General' };
      return { name: rec.itemName, category: rec.itemCategory };
  };

  const getGroupSummary = (itemId: string) => {
      const recs = groupedRecords[itemId] || [];
      const active = recs.filter(r => r.status === 'Borrowed').length;
      const returned = recs.filter(r => r.status === 'Returned').length;
      const overdue = recs.filter(r => r.status === 'Borrowed' && isOverdue(r.dueDate)).length;
      return { active, returned, overdue };
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-sm border border-white/50 flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/30 rounded-t-xl flex-shrink-0">
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
                <div className="flex space-x-2 animate-in fade-in zoom-in duration-200">
                    <button
                        onClick={handleBulkReturn}
                        className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Return ({selectedIds.size})</span>
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete ({selectedIds.size})</span>
                    </button>
                </div>
            )}

            <div className="flex bg-white/40 rounded-lg p-1 border border-white/40">
                {(['All', 'Borrowed', 'Returned'] as const).map(status => (
                    <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === status ? 'bg-white/80 text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        {status === 'Borrowed' ? 'Active' : status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Grouped List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {sortedGroupKeys.length > 0 ? sortedGroupKeys.map(itemId => {
            const { name, category } = getItemDetails(itemId);
            const { active, overdue } = getGroupSummary(itemId);
            const isExpanded = expandedItems.has(itemId);
            const recs = groupedRecords[itemId];

            return (
                <div key={itemId} className="bg-white/40 border border-white/50 rounded-xl overflow-hidden shadow-sm transition-all hover:bg-white/50">
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleExpand(itemId)}
                    >
                        <div className="flex items-center space-x-4">
                             <div className={`p-2 rounded-lg bg-white/60 border border-white/50 shadow-sm transition-transform ${isExpanded ? 'scale-110' : ''}`}>
                                <div style={{ color: getCategoryColor(category) }}>
                                    {getCategoryIcon(category)}
                                </div>
                             </div>
                             <div>
                                 <h4 className="font-bold text-gray-800">{name}</h4>
                                 <div className="flex gap-2 text-xs mt-1">
                                     <span className="text-gray-500">{category}</span>
                                     <span className="text-gray-300">•</span>
                                     {active > 0 && <span className="text-indigo-600 font-medium">{active} Active</span>}
                                     {overdue > 0 && <span className="text-red-600 font-bold">{overdue} Overdue</span>}
                                     {active === 0 && <span className="text-gray-400">All Returned</span>}
                                 </div>
                             </div>
                        </div>
                        <div className="text-gray-400">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="border-t border-white/40 bg-white/30 animate-in slide-in-from-top-2 duration-200">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/20 text-xs font-semibold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 w-10"></th>
                                        <th className="px-4 py-2">Borrower</th>
                                        <th className="px-4 py-2">Qty</th>
                                        <th className="px-4 py-2">Dates</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/50">
                                    {recs.map(record => (
                                        <tr key={record.id} className={`hover:bg-white/40 transition-colors ${selectedIds.has(record.id) ? 'bg-indigo-50/40' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(record.id); }} 
                                                    className={`${selectedIds.has(record.id) ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}
                                                >
                                                    {selectedIds.has(record.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 text-sm">{record.borrowerName}</div>
                                                <div className="text-xs text-gray-500">{record.borrowerId}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                                {record.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500">Out: {record.borrowDate}</span>
                                                    {record.status === 'Returned' ? (
                                                        <span className="text-green-600 font-medium">In: {record.returnDate}</span>
                                                    ) : (
                                                        <span className={`${isOverdue(record.dueDate) ? 'text-red-600 font-bold' : 'text-indigo-600'}`}>
                                                            Due: {record.dueDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {record.status === 'Returned' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100/80 text-green-700 backdrop-blur-sm">Returned</span>
                                                ) : isOverdue(record.dueDate) ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100/80 text-red-700 backdrop-blur-sm">Overdue</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100/80 text-indigo-700 backdrop-blur-sm">Active</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {record.status === 'Borrowed' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onReturn(record.id); }}
                                                            className="inline-flex items-center space-x-1 px-2 py-1 bg-green-50/50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors border border-green-200/50"
                                                            title="Return Item"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Return</span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                                                        className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50/50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-200/50"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            );
        }) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <p>No borrow records found.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default LendingList;
