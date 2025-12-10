import React, { useState, useMemo } from 'react';
import { BorrowRecord, BorrowRequest } from '../types';
import { Search, RotateCcw, CheckSquare, Square, ChevronDown, ChevronRight, Package, Trash2, AlertCircle } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../constants';

interface LendingListProps {
  records: BorrowRecord[];
  requests: BorrowRequest[];
  onReturn: (recordId: string) => void;
  onReturnBulk: (recordIds: string[]) => void;
  onDelete: (recordId: string) => void;
  onDeleteBulk: (recordIds: string[]) => void;
}

const LendingList: React.FC<LendingListProps> = ({ records, requests, onReturn, onReturnBulk, onDelete, onDeleteBulk }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Borrowed' | 'Overdue' | 'Returned'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date().toISOString().split('T')[0] !== dueDate;
  };

  // Create Lookup Map for Request Reference Codes AND Request IDs
  const recordRequestMap = useMemo(() => {
      // Map linkedRecordId -> { code, id }
      const map = new Map<string, { code: string, id: string }>(); 
      requests.forEach(req => {
          req.items.forEach(item => {
              if (item.linkedRecordId) {
                  map.set(item.linkedRecordId, { code: req.referenceCode, id: req.id });
              }
          });
      });
      return map;
  }, [requests]);

  // 1. Filter Records
  const filteredRecords = useMemo(() => {
     return records.filter(record => {
        const reqData = recordRequestMap.get(record.id);
        const refCode = reqData?.code || '';
        const reqId = reqData?.id || '';
        
        const matchesSearch = 
            record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            record.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            refCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reqId.toLowerCase().includes(searchTerm.toLowerCase()); // Search by Request ID (UUID)
        
        const isOverdueItem = isOverdue(record.dueDate) && record.status === 'Borrowed';

        const matchesStatus = filterStatus === 'All' || 
            (filterStatus === 'Borrowed' && record.status === 'Borrowed') ||
            (filterStatus === 'Returned' && record.status === 'Returned') ||
            (filterStatus === 'Overdue' && isOverdueItem);

        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
  }, [records, searchTerm, filterStatus, recordRequestMap]);

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
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 rounded-t-xl flex-shrink-0">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by item, borrower, or Request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 placeholder-gray-500 shadow-sm"
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

            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(['All', 'Borrowed', 'Overdue', 'Returned'] as const).map(status => (
                    <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        {status === 'Borrowed' ? 'Active' : status}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Grouped List */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-100/50">
        {sortedGroupKeys.length > 0 ? sortedGroupKeys.map(itemId => {
            const { name, category } = getItemDetails(itemId);
            const { active, overdue } = getGroupSummary(itemId);
            const isExpanded = expandedItems.has(itemId);
            const recs = groupedRecords[itemId];

            return (
                <div key={itemId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => toggleExpand(itemId)}
                    >
                        <div className="flex items-center space-x-4">
                             <div className={`p-2 rounded-lg bg-gray-50 border border-gray-100 shadow-sm transition-transform ${isExpanded ? 'scale-110' : ''}`}>
                                <div style={{ color: getCategoryColor(category) }}>
                                    {getCategoryIcon(category)}
                                </div>
                             </div>
                             <div>
                                 <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    {name}
                                    {overdue > 0 && <AlertCircle className="w-4 h-4 text-red-500" />}
                                 </h4>
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
                        <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100/50 text-xs font-semibold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 w-10"></th>
                                        <th className="px-4 py-2">Borrower</th>
                                        <th className="px-4 py-2">Qty</th>
                                        <th className="px-4 py-2">Dates</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recs.map(record => {
                                        const reqData = recordRequestMap.get(record.id);
                                        const overdueItem = isOverdue(record.dueDate) && record.status === 'Borrowed';
                                        
                                        return (
                                        <tr key={record.id} className={`hover:bg-white transition-colors ${selectedIds.has(record.id) ? 'bg-indigo-50/40' : (overdueItem ? 'bg-red-50/50' : '')}`}>
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
                                                {reqData && (
                                                    <div className="text-[10px] text-blue-600 font-mono mt-0.5 flex items-center gap-1">
                                                        <span className="opacity-75">REF:</span> {reqData.code}
                                                    </div>
                                                )}
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
                                                        <span className={`${overdueItem ? 'text-red-600 font-bold' : 'text-indigo-600'}`}>
                                                            Due: {record.dueDate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {record.status === 'Returned' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Returned</span>
                                                ) : overdueItem ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">Overdue</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">Active</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {record.status === 'Borrowed' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onReturn(record.id); }}
                                                            className="inline-flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors border border-green-200"
                                                            title="Return Item"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Return</span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                                                        className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-200"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}) }
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