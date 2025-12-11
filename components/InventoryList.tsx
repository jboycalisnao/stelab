
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ItemCondition, Category } from '../types';
import { Edit2, Trash2, QrCode, Search, Filter, HandPlatter, Barcode, FileText, List, Printer, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getCategoryColor, getCategoryIcon } from '../constants';

interface InventoryListProps {
  items: InventoryItem[];
  categories: Category[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onShowQR: (item: InventoryItem) => void;
  onBorrow: (item: InventoryItem) => void;
  onPrintBarcodes: (item: InventoryItem) => void;
  initialSearchTerm?: string;
}

const InventoryList: React.FC<InventoryListProps> = ({ items, categories, onEdit, onDelete, onShowQR, onBorrow, onPrintBarcodes, initialSearchTerm }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Handle Initial Search Term (e.g. from Deep Link)
  useEffect(() => {
      if (initialSearchTerm) {
          setSearchTerm(initialSearchTerm);
      }
  }, [initialSearchTerm]);

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
      return items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.shortId && item.shortId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()); // Added UUID search support
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
      });
  }, [items, searchTerm, filterCategory]);

  // --- Report Logic ---
  const reportData = useMemo(() => {
      const totalItems = items.length;
      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const totalBorrowed = items.reduce((sum, i) => sum + (i.borrowedQuantity || 0), 0);
      
      const byCategory = categories.map(cat => {
          const catItems = items.filter(i => i.category === cat.name);
          return {
              name: cat.name,
              count: catItems.length,
              qty: catItems.reduce((sum, i) => sum + i.quantity, 0),
              borrowed: catItems.reduce((sum, i) => sum + (i.borrowedQuantity || 0), 0)
          };
      }).filter(c => c.count > 0);

      // Add "Other" if any
      const knownCats = new Set(categories.map(c => c.name));
      const otherItems = items.filter(i => !knownCats.has(i.category));
      if (otherItems.length > 0) {
          byCategory.push({
              name: 'Uncategorized',
              count: otherItems.length,
              qty: otherItems.reduce((sum, i) => sum + i.quantity, 0),
              borrowed: otherItems.reduce((sum, i) => sum + (i.borrowedQuantity || 0), 0)
          });
      }

      const byCondition = Object.values(ItemCondition).map(cond => ({
          condition: cond,
          count: items.filter(i => i.condition === cond).length
      }));

      const lowStock = items.filter(i => (i.quantity - (i.borrowedQuantity || 0)) <= 5 && i.quantity > 0);
      const unavailable = items.filter(i => i.condition === ItemCondition.Defective || i.condition === ItemCondition.Condemned);

      return { totalItems, totalQty, totalBorrowed, byCategory, byCondition, lowStock, unavailable };
  }, [items, categories]);

  const handlePrintReport = () => {
      const printWindow = window.open('', '', 'height=800,width=900');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Inventory Summary Report</title>');
          printWindow.document.write(`
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; }
                h1 { border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 5px; color: #111827; }
                h2 { margin-top: 30px; margin-bottom: 15px; font-size: 1.2em; border-left: 4px solid #3b82f6; padding-left: 10px; color: #374151; }
                .meta { color: #6b7280; font-size: 0.9em; margin-bottom: 30px; }
                
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                .card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
                .card h3 { font-size: 2em; margin: 0; color: #111827; }
                .card p { margin: 5px 0 0; text-transform: uppercase; font-size: 0.75em; letter-spacing: 1px; color: #4b5563; }

                table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
                th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
                th { background-color: #f9fafb; font-weight: 600; color: #374151; }
                tr:nth-child(even) { background-color: #f9fafb; }

                .badge { padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
                .badge-warn { background: #fef3c7; color: #92400e; }
                .badge-err { background: #fee2e2; color: #b91c1c; }
                
                @media print { .no-print { display: none; } }
            </style>
          `);
          printWindow.document.write('</head><body>');
          
          printWindow.document.write(`<h1>Inventory Summary Report</h1>`);
          printWindow.document.write(`<div class="meta">Generated on: ${new Date().toLocaleString()}</div>`);

          printWindow.document.write(`
            <div class="grid">
                <div class="card"><h3>${reportData.totalItems}</h3><p>Unique Items</p></div>
                <div class="card"><h3>${reportData.totalQty}</h3><p>Total Assets (Qty)</p></div>
                <div class="card"><h3>${reportData.totalBorrowed}</h3><p>Currently On Loan</p></div>
            </div>
          `);

          printWindow.document.write(`<h2>Category Breakdown</h2>`);
          printWindow.document.write(`<table><thead><tr><th>Category</th><th>Unique Items</th><th>Total Qty</th><th>On Loan</th></tr></thead><tbody>`);
          reportData.byCategory.forEach(cat => {
              printWindow.document.write(`<tr><td>${cat.name}</td><td>${cat.count}</td><td>${cat.qty}</td><td>${cat.borrowed}</td></tr>`);
          });
          printWindow.document.write(`</tbody></table>`);

          printWindow.document.write(`<h2>Condition Breakdown</h2>`);
          printWindow.document.write(`<table><thead><tr><th>Condition</th><th>Count</th></tr></thead><tbody>`);
          reportData.byCondition.forEach(c => {
               printWindow.document.write(`<tr><td>${c.condition}</td><td>${c.count}</td></tr>`);
          });
          printWindow.document.write(`</tbody></table>`);

          if (reportData.lowStock.length > 0) {
              printWindow.document.write(`<h2>Low Stock Alerts (< 5 available)</h2>`);
              printWindow.document.write(`<table><thead><tr><th>Item Name</th><th>Category</th><th>Available</th><th>Total</th></tr></thead><tbody>`);
              reportData.lowStock.forEach(i => {
                  printWindow.document.write(`<tr><td>${i.name}</td><td>${i.category}</td><td>${i.quantity - (i.borrowedQuantity || 0)}</td><td>${i.quantity}</td></tr>`);
              });
              printWindow.document.write(`</tbody></table>`);
          }

          printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
          printWindow.document.write('</body></html>');
          printWindow.document.close();
      }
  };

  const getConditionBadge = (condition: ItemCondition) => {
    switch (condition) {
      case ItemCondition.Good: return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Good</span>;
      case ItemCondition.Repairable: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">Repairable</span>;
      case ItemCondition.Defective: return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">Defective</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{condition}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50 rounded-t-xl px-4 pt-4 gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'list' 
                ? 'bg-white text-blue-700 border-t border-x border-gray-200 shadow-sm mb-[-1px] z-10' 
                : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
            Item List
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'report' 
                ? 'bg-white text-blue-700 border-t border-x border-gray-200 shadow-sm mb-[-1px] z-10' 
                : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Summary Report
          </button>
      </div>

      {activeTab === 'list' && (
        <>
            {/* List Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
                <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search equipment, location, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 placeholder-gray-500 shadow-sm"
                />
                </div>
                
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="text-gray-500 w-4 h-4" />
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white text-gray-800 shadow-sm"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                >
                    <option value="All" className="bg-white text-gray-800">All Categories</option>
                    {categories.map(cat => (
                    <option key={cat.id} value={cat.name} className="bg-white text-gray-800">{cat.name}</option>
                    ))}
                </select>
                </div>
            </div>

            {/* List Table */}
            <div className="flex-1 overflow-auto bg-gray-50">
                <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty (Avail/Total)</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Condition</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredItems.length > 0 ? filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200 shadow-sm">
                                <div style={{ color: getCategoryColor(item.category) }}>
                                {getCategoryIcon(item.category)}
                                </div>
                            </div>
                            <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                            {item.shortId && <div className="text-[10px] text-gray-400 font-mono mt-0.5 bg-gray-100 inline-block px-1 rounded border border-gray-200">{item.shortId}</div>}
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 border border-gray-200 text-gray-800">
                            {item.category}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex flex-col">
                                <span className="font-medium">
                                    {item.quantity - (item.borrowedQuantity || 0)} / {item.quantity}
                                </span>
                                <span className="text-[10px] text-gray-400">{item.unit}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                        {item.location}
                        </td>
                        <td className="px-6 py-4">
                        {getConditionBadge(item.condition)}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 transition-opacity">
                            <button 
                            onClick={() => onBorrow(item)}
                            disabled={(item.quantity - (item.borrowedQuantity || 0)) <= 0}
                            className={`p-1.5 rounded-md transition-colors ${
                                (item.quantity - (item.borrowedQuantity || 0)) > 0 
                                ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title="Borrow Item"
                            >
                            <HandPlatter className="w-4 h-4" />
                            </button>
                            <button 
                            onClick={() => onPrintBarcodes(item)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            title="Print Bulk Barcodes"
                            >
                            <Barcode className="w-4 h-4" />
                            </button>
                            <button 
                            onClick={() => onShowQR(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View QR Code"
                            >
                            <QrCode className="w-4 h-4" />
                            </button>
                            <button 
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Edit Item"
                            >
                            <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                            onClick={() => onDelete(item.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Item"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                                No equipment found matching your search.
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
        </>
      )}

      {activeTab === 'report' && (
          <div className="flex-1 overflow-auto p-6 space-y-8 animate-in fade-in duration-300 bg-gray-50">
              {/* Report Header */}
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="text-2xl font-bold text-gray-800">Inventory Summary</h3>
                      <p className="text-gray-500">Real-time analysis of equipment status and categories.</p>
                  </div>
                  <button 
                    onClick={handlePrintReport}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                      <Printer className="w-4 h-4" />
                      <span>Print Report</span>
                  </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                      <div className="text-3xl font-bold text-gray-900">{reportData.totalItems}</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-1">Unique Items</div>
                  </div>
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                      <div className="text-3xl font-bold text-blue-700">{reportData.totalQty}</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-1">Total Assets (Qty)</div>
                  </div>
                  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
                      <div className="text-3xl font-bold text-indigo-700">{reportData.totalBorrowed}</div>
                      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mt-1">Currently On Loan</div>
                  </div>
              </div>

              {/* Category Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-bold text-gray-800">Breakdown by Category</h4>
                  </div>
                  <table className="w-full text-left">
                      <thead className="bg-white text-xs uppercase text-gray-500">
                          <tr>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3">Unique Items</th>
                              <th className="px-6 py-3">Total Qty</th>
                              <th className="px-6 py-3">On Loan</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {reportData.byCategory.map(cat => (
                              <tr key={cat.name} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 font-medium text-gray-800">{cat.name}</td>
                                  <td className="px-6 py-3 text-gray-600">{cat.count}</td>
                                  <td className="px-6 py-3 text-gray-600">{cat.qty}</td>
                                  <td className="px-6 py-3 text-indigo-600">{cat.borrowed}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Alerts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Low Stock */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <h4 className="font-bold text-gray-800">Low Stock Alerts</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-gray-100">
                                {reportData.lowStock.length > 0 ? reportData.lowStock.map(i => (
                                    <tr key={i.id}>
                                        <td className="px-6 py-3 text-sm text-gray-800">{i.name}</td>
                                        <td className="px-6 py-3 text-xs font-bold text-amber-600 text-right">
                                            {i.quantity - (i.borrowedQuantity || 0)} left
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td className="px-6 py-4 text-sm text-gray-500 text-center">No low stock alerts.</td></tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>

                  {/* Condition Issues */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <h4 className="font-bold text-gray-800">Defective / Condemned</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-gray-100">
                                {reportData.unavailable.length > 0 ? reportData.unavailable.map(i => (
                                    <tr key={i.id}>
                                        <td className="px-6 py-3 text-sm text-gray-800">{i.name}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">{i.condition}</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td className="px-6 py-4 text-sm text-gray-500 text-center">All items in good condition.</td></tr>
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryList;
