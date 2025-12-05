
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, BorrowRecord } from '../types';
import { Scan, Search, Camera, X, Box, MapPin, Activity, HandPlatter, RotateCcw, AlertTriangle, Tag, CheckCircle, ClipboardList, FileText, Printer, ChevronRight } from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from '../constants';

interface ScannerProps {
  items: InventoryItem[];
  borrowRecords: BorrowRecord[];
  onBorrow: (item: InventoryItem, specificId?: string) => void;
  onReturn: (recordId: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ items, borrowRecords, onBorrow, onReturn }) => {
  // Modes: 'search' (default) or 'audit'
  const [mode, setMode] = useState<'search' | 'audit'>('search');
  
  // Shared Scanner State
  const [scanMethod, setScanMethod] = useState<'manual' | 'camera'>('manual');
  const [inputVal, setInputVal] = useState('');
  const scannerRef = useRef<any>(null);
  
  // Feedback State (To replace alerts)
  const [scanFeedback, setScanFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- Search Mode State ---
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
  const [scannedUniqueId, setScannedUniqueId] = useState<string>('');
  const [relatedRecords, setRelatedRecords] = useState<BorrowRecord[]>([]);

  // --- Audit Mode State ---
  const [auditSelectedItemId, setAuditSelectedItemId] = useState<string>('');
  const [auditScannedIds, setAuditScannedIds] = useState<Set<string>>(new Set());
  
  // Auto-focus input on mount
  useEffect(() => {
    if (scanMethod === 'manual') {
      const input = document.getElementById('scanner-input');
      input?.focus();
    }
  }, [scanMethod, foundItem, mode, auditSelectedItemId]);

  // Clean up scanner
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scanMethod, mode]);

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (scanFeedback) {
        const timer = setTimeout(() => setScanFeedback(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [scanFeedback]);

  // --- Logic Shared ---
  
  const startCamera = () => {
    setScanMethod('camera');
    setTimeout(() => {
        const html5QrcodeScanner = new (window as any).Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );
        
        html5QrcodeScanner.render((decodedText: string) => {
            handleScan(decodedText);
            // In audit mode, we keep scanning.
            if (mode === 'search') {
                html5QrcodeScanner.clear();
                setScanMethod('manual');
            }
        }, (errorMessage: string) => {
            // ignore errors
        });
        scannerRef.current = html5QrcodeScanner;
    }, 100);
  };

  const stopCamera = () => {
      if (scannerRef.current) {
          scannerRef.current.clear();
      }
      setScanMethod('manual');
  };

  const handleScan = (code: string) => {
      if (mode === 'search') {
          handleSearch(code);
      } else {
          handleAuditScan(code);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleScan(inputVal);
        setInputVal(''); // Clear after scan
    }
  };

  // --- Search Mode Logic ---

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    const upperQuery = trimmedQuery.toUpperCase();

    let item: InventoryItem | undefined;
    
    // 1. Exact ID match (ShortID or UUID)
    item = items.find(i => i.id === upperQuery || i.shortId === upperQuery);
    
    // 2. Name match (Partial) if no ID match found
    if (!item) {
        // Find best match for name
        item = items.find(i => i.name.toLowerCase().includes(trimmedQuery.toLowerCase()));
    }

    // 3. Sequence match (PREFIX-NUM-SEQ)
    if (!item && upperQuery.includes('-')) {
        const parts = upperQuery.split('-');
        if (parts.length >= 3) {
            const potentialShortId = parts.slice(0, parts.length - 1).join('-');
            item = items.find(i => i.shortId === potentialShortId);
        }
    }

    if (item) {
        setFoundItem(item);
        setScanFeedback(null); // Clear errors
        // If query was just a name, don't set unique ID. If it looked like a specific barcode, set it.
        const isSpecificFormat = /^[A-Z]{3,}-\d{4}-\d{3}$/.test(upperQuery);
        setScannedUniqueId(isSpecificFormat ? upperQuery : '');
        
        const activeRecs = borrowRecords.filter(r => r.itemId === item!.id && r.status === 'Borrowed');
        setRelatedRecords(activeRecs);
    } else {
        setFoundItem(null);
        setRelatedRecords([]);
        setScanFeedback({ message: `Item not found: "${query}"`, type: 'error' });
    }
  };

  const isSpecificUnit = foundItem && scannedUniqueId && scannedUniqueId !== foundItem.shortId && scannedUniqueId !== foundItem.id;
  const specificUnitRecord = isSpecificUnit 
    ? relatedRecords.find(r => r.specificId === scannedUniqueId)
    : undefined;


  // --- Audit Mode Logic ---

  const auditItem = useMemo(() => items.find(i => i.id === auditSelectedItemId), [items, auditSelectedItemId]);

  // Generate Expected IDs
  const auditGrid = useMemo(() => {
      if (!auditItem || !auditItem.shortId) return [];
      
      const grid = [];
      const baseId = auditItem.shortId;
      
      for (let i = 1; i <= auditItem.quantity; i++) {
          const seq = String(i).padStart(3, '0');
          const uniqueId = `${baseId}-${seq}`;
          
          // Check Status
          let status: 'missing' | 'present' | 'borrowed' = 'missing';
          
          // Is it borrowed?
          const isBorrowed = borrowRecords.some(r => r.specificId === uniqueId && r.status === 'Borrowed');
          
          if (auditScannedIds.has(uniqueId)) {
              status = 'present';
          } else if (isBorrowed) {
              status = 'borrowed';
          }

          grid.push({ uniqueId, status, seq });
      }
      return grid;
  }, [auditItem, auditScannedIds, borrowRecords]);

  const handleAuditScan = (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!auditItem) return;

      // Validate if scanned code belongs to this item
      // It must start with the shortId
      if (auditItem.shortId && trimmed.startsWith(auditItem.shortId)) {
          setAuditScannedIds(prev => {
              const newSet = new Set(prev);
              newSet.add(trimmed);
              return newSet;
          });
          setScanFeedback({ message: `Verified: ${trimmed}`, type: 'success' });
      } else {
          setScanFeedback({ message: `Mismatch: ${trimmed} does not match current item.`, type: 'error' });
      }
  };

  const handlePrintReport = () => {
      if (!auditItem) return;

      const present = auditGrid.filter(x => x.status === 'present');
      const borrowed = auditGrid.filter(x => x.status === 'borrowed');
      const missing = auditGrid.filter(x => x.status === 'missing');
      const total = auditGrid.length;
      const accuracy = Math.round(((present.length + borrowed.length) / total) * 100);

      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Inventory Audit Report</title>');
          printWindow.document.write(`
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 5px; }
                h2 { margin-top: 30px; border-left: 5px solid #333; padding-left: 10px; background: #f9f9f9; padding-top: 5px; padding-bottom: 5px; font-size: 1.2em; }
                .meta { margin-bottom: 30px; color: #555; }
                .summary { display: flex; gap: 20px; margin-bottom: 30px; }
                .card { background: #f5f5f5; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #ddd; }
                .card h3 { margin: 0; font-size: 2em; }
                .card p { margin: 0; color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
                th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: 600; }
                tr:nth-child(even) { background-color: #fafafa; }
                
                .status-present { color: green; font-weight: bold; }
                .status-borrowed { color: blue; font-weight: bold; }
                .status-missing { color: red; font-weight: bold; }
                @media print { .no-print { display: none; } }
            </style>
          `);
          printWindow.document.write('</head><body>');
          
          printWindow.document.write(`<h1>Audit Report: ${auditItem.name}</h1>`);
          printWindow.document.write(`<div class="meta">Generated on: ${new Date().toLocaleString()}<br>Category: ${auditItem.category} | Location: ${auditItem.location}</div>`);

          printWindow.document.write(`
            <div class="summary">
                <div class="card"><h3>${accuracy}%</h3><p>Accounted For</p></div>
                <div class="card" style="border-bottom: 4px solid green;"><h3>${present.length}</h3><p>Verified</p></div>
                <div class="card" style="border-bottom: 4px solid blue;"><h3>${borrowed.length}</h3><p>Borrowed</p></div>
                <div class="card" style="border-bottom: 4px solid red; color: #b91c1c;"><h3>${missing.length}</h3><p>Missing</p></div>
            </div>
          `);

          // Scanned Items Table
          if (present.length > 0) {
              printWindow.document.write(`<h2>✅ Verified Items (Scanned)</h2>`);
              printWindow.document.write(`<table><thead><tr><th>Seq</th><th>Unique ID</th><th>Status</th></tr></thead><tbody>`);
              present.forEach(i => {
                  printWindow.document.write(`<tr><td>${i.seq}</td><td>${i.uniqueId}</td><td class="status-present">VERIFIED</td></tr>`);
              });
              printWindow.document.write(`</tbody></table>`);
          }

          // Borrowed Items Table
          if (borrowed.length > 0) {
              printWindow.document.write(`<h2>⏳ Borrowed Items</h2>`);
              printWindow.document.write(`<table><thead><tr><th>Seq</th><th>Unique ID</th><th>Borrower</th><th>Due Date</th></tr></thead><tbody>`);
              borrowed.forEach(i => {
                  const record = borrowRecords.find(r => r.specificId === i.uniqueId && r.status === 'Borrowed');
                  const borrower = record ? `${record.borrowerName} (${record.borrowerId})` : 'Unknown Record';
                  const due = record ? record.dueDate : '-';
                  printWindow.document.write(`<tr><td>${i.seq}</td><td>${i.uniqueId}</td><td>${borrower}</td><td>${due}</td></tr>`);
              });
              printWindow.document.write(`</tbody></table>`);
          }

          // Missing Items Table
          if (missing.length > 0) {
              printWindow.document.write(`<h2>⚠️ Missing Items (Action Required)</h2>`);
              printWindow.document.write(`<table><thead><tr><th>Seq</th><th>Unique ID</th><th>Status</th></tr></thead><tbody>`);
              missing.forEach(i => {
                  printWindow.document.write(`<tr><td>${i.seq}</td><td>${i.uniqueId}</td><td class="status-missing">MISSING</td></tr>`);
              });
              printWindow.document.write(`</tbody></table>`);
          }

          // Footer
          printWindow.document.write(`<div style="margin-top: 50px; font-size: 0.8em; color: #999; text-align: center;">End of Report</div>`);

          printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
          printWindow.document.write('</body></html>');
          printWindow.document.close();
      }
  };

  const CardGlass = "bg-white/70 backdrop-blur-xl border border-white/50 rounded-xl shadow-sm";

  return (
    <div className="space-y-6">
      
      {/* Mode Toggle Header */}
      <div className="flex justify-center space-x-4 mb-4">
        <button
            onClick={() => setMode('search')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${mode === 'search' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/50 text-gray-600 hover:bg-white/70'}`}
        >
            <div className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Search & Action</span>
            </div>
        </button>
        <button
            onClick={() => setMode('audit')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${mode === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/50 text-gray-600 hover:bg-white/70'}`}
        >
             <div className="flex items-center space-x-2">
                <ClipboardList className="w-4 h-4" />
                <span>Inventory Audit</span>
            </div>
        </button>
      </div>
      
      {/* Feedback Toast */}
      {scanFeedback && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 ${scanFeedback.type === 'success' ? 'bg-green-100/90 text-green-700 border border-green-200' : 'bg-red-100/90 text-red-700 border border-red-200'}`}>
              {scanFeedback.message}
          </div>
      )}

      {mode === 'search' ? (
        // --- SEARCH MODE UI ---
        <div className="space-y-6">
            <div className={`${CardGlass} p-8 flex flex-col items-center justify-center space-y-6`}>
                <div className="bg-blue-100/50 p-4 rounded-full text-blue-600 mb-2">
                    <Scan className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Scan or Search Equipment</h2>
                
                {scanMethod === 'manual' ? (
                    <div className="w-full max-w-lg">
                        <div className="relative">
                            <div className="relative">
                                <input
                                    id="scanner-input"
                                    type="text"
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Scan barcode, enter ID, or type item name..."
                                    className="w-full pl-12 pr-4 py-4 text-lg border border-white/60 bg-white/50 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none backdrop-blur-sm shadow-inner transition-all text-gray-900 placeholder-gray-500"
                                    autoComplete="off"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Search className="text-gray-500 w-6 h-6" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-center mt-6 space-x-4">
                            <button onClick={() => handleSearch(inputVal)} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md">Find Item</button>
                            <button onClick={startCamera} className="px-6 py-2 bg-gray-800 text-white rounded-lg shadow-md flex items-center gap-2"><Camera className="w-4 h-4"/> Camera</button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-lg flex flex-col items-center">
                        <div id="reader" className="w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300"></div>
                        <button onClick={stopCamera} className="mt-4 px-6 py-2 bg-red-100 text-red-600 rounded-lg flex items-center gap-2"><X className="w-4 h-4"/> Cancel</button>
                    </div>
                )}
            </div>

            {/* Search Result Card */}
            {foundItem && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`${CardGlass} overflow-hidden`}>
                        <div className="bg-white/40 p-6 border-b border-white/40 flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="px-2 py-1 bg-white/60 rounded text-xs font-bold text-gray-600 border border-white/40">{foundItem.shortId}</span>
                                    <span className="px-2 py-1 bg-blue-100/50 text-blue-700 rounded text-xs font-medium border border-blue-200/50">{foundItem.category}</span>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900">{foundItem.name}</h3>
                            </div>
                            <div className="p-3 bg-white/60 rounded-xl shadow-sm border border-white/50">
                                <div style={{ color: getCategoryColor(foundItem.category) }}>{getCategoryIcon(foundItem.category)}</div>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div><p className="text-sm font-medium text-gray-500">Location</p><p className="text-lg text-gray-800">{foundItem.location}</p></div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div><p className="text-sm font-medium text-gray-500">Condition</p><p className="text-lg text-gray-800">{foundItem.condition}</p></div>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-4">
                                {isSpecificUnit ? (
                                    <div className={`p-5 rounded-xl border ${specificUnitRecord ? 'bg-orange-50/70 border-orange-200' : 'bg-green-50/70 border-green-200'} backdrop-blur-sm shadow-sm`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className={`text-lg font-bold flex items-center gap-2 ${specificUnitRecord ? 'text-orange-800' : 'text-green-800'}`}>
                                                <Tag className="w-5 h-5" /> Unit: {scannedUniqueId}
                                            </h4>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${specificUnitRecord ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>
                                                {specificUnitRecord ? 'Borrowed' : 'Available'}
                                            </span>
                                        </div>
                                        {specificUnitRecord ? (
                                             <div className="space-y-4">
                                                <div className="bg-white/60 p-4 rounded-lg border border-orange-100/50">
                                                    <p className="text-xs text-orange-600 uppercase font-bold mb-1">Borrower</p>
                                                    <p className="font-medium text-gray-900">{specificUnitRecord.borrowerName} ({specificUnitRecord.borrowerId})</p>
                                                </div>
                                                <button onClick={() => onReturn(specificUnitRecord.id)} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md flex justify-center gap-2"><RotateCcw className="w-5 h-5" /> Return Unit</button>
                                             </div>
                                        ) : (
                                            <button onClick={() => onBorrow(foundItem, scannedUniqueId)} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md flex justify-center gap-2"><HandPlatter className="w-5 h-5" /> Borrow Unit</button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white/40 rounded-xl p-5 border border-white/40">
                                        <p className="text-sm font-medium text-gray-500 mb-2">General Stock</p>
                                        <div className="flex items-end space-x-2"><span className="text-4xl font-bold text-gray-900">{foundItem.quantity - (foundItem.borrowedQuantity || 0)}</span><span className="text-gray-500 mb-1">/ {foundItem.quantity} {foundItem.unit}</span></div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((foundItem.quantity - (foundItem.borrowedQuantity || 0)) / foundItem.quantity) * 100}%` }}></div></div>
                                        <div className="mt-6"><button onClick={() => onBorrow(foundItem)} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md flex justify-center gap-2"><HandPlatter className="w-5 h-5" /> Borrow Item</button></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
      ) : (
        // --- AUDIT MODE UI ---
        <div className="space-y-6">
            <div className={`${CardGlass} p-6`}>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-indigo-600" />
                    Inventory Audit Session
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Item to Audit</label>
                        <select
                            value={auditSelectedItemId}
                            onChange={(e) => {
                                setAuditSelectedItemId(e.target.value);
                                setAuditScannedIds(new Set());
                            }}
                            className="w-full px-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                            <option value="">-- Choose Equipment --</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>{item.name} ({item.shortId})</option>
                            ))}
                        </select>
                    </div>

                    {auditSelectedItemId && (
                         <div className="flex space-x-2">
                            {scanMethod === 'manual' ? (
                                <div className="flex-1 relative">
                                    <div className="relative">
                                        <input
                                            id="scanner-input"
                                            type="text"
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Scan item barcode..."
                                            className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            autoComplete="off"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Scan className="text-gray-400 w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={stopCamera} className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-medium flex justify-center items-center gap-2"><X className="w-4 h-4"/> Stop Cam</button>
                            )}
                            {scanMethod === 'manual' && (
                                <button onClick={startCamera} className="bg-gray-800 text-white px-4 rounded-lg"><Camera className="w-5 h-5" /></button>
                            )}
                         </div>
                    )}
                </div>
                
                {scanMethod === 'camera' && (
                     <div className="mt-4 w-full max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-dashed border-gray-300">
                        <div id="reader"></div>
                     </div>
                )}
            </div>

            {auditItem && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`${CardGlass} p-6`}>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/40 pb-4">
                            <div>
                                <h4 className="text-2xl font-bold text-gray-800">{auditItem.name}</h4>
                                <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                    <span>Total Exp: {auditGrid.length}</span>
                                    <span>Scanned: {auditGrid.filter(x => x.status === 'present').length}</span>
                                    <span>Missing: <span className="text-red-600 font-bold">{auditGrid.filter(x => x.status === 'missing').length}</span></span>
                                </div>
                            </div>
                            <button 
                                onClick={handlePrintReport}
                                className="mt-4 md:mt-0 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Generate Report
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-6 overflow-hidden">
                             <div 
                                className="bg-green-500 h-full transition-all duration-500"
                                style={{ width: `${(auditGrid.filter(x => x.status !== 'missing').length / auditGrid.length) * 100}%` }}
                             ></div>
                        </div>

                        {/* Audit Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto p-2">
                            {auditGrid.map((slot) => (
                                <div 
                                    key={slot.uniqueId}
                                    className={`
                                        p-2 rounded-lg border text-center transition-all
                                        ${slot.status === 'present' ? 'bg-green-100 border-green-300 text-green-800' : 
                                          slot.status === 'borrowed' ? 'bg-blue-100 border-blue-300 text-blue-800' : 
                                          'bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100'}
                                    `}
                                >
                                    <div className="text-xs font-bold mb-1">#{slot.seq}</div>
                                    <div className="text-[10px] font-mono truncate">{slot.uniqueId}</div>
                                    <div className="mt-1">
                                        {slot.status === 'present' && <CheckCircle className="w-4 h-4 mx-auto text-green-600" />}
                                        {slot.status === 'borrowed' && <HandPlatter className="w-4 h-4 mx-auto text-blue-600" />}
                                        {slot.status === 'missing' && <div className="w-4 h-4 mx-auto rounded-full bg-red-100 border border-red-300"></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Scanner;
