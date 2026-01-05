
import React, { useRef, useEffect, useState } from 'react';
import { InventoryItem } from '../types';
import { X, Printer, Copy, ListFilter } from 'lucide-react';

interface BulkBarcodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const BulkBarcodeModal: React.FC<BulkBarcodeModalProps> = ({ item, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(1);
  
  // Range Selection State
  const [printMode, setPrintMode] = useState<'all' | 'range'>('all');
  const [startSeq, setStartSeq] = useState(1);
  const [endSeq, setEndSeq] = useState(item.quantity);

  // Update bounds when item changes
  useEffect(() => {
    setEndSeq(item.quantity);
  }, [item]);

  useEffect(() => {
    // Generate barcodes using JsBarcode after the component mounts or config changes
    const timer = setTimeout(() => {
        if ((window as any).JsBarcode && printRef.current) {
            const elements = printRef.current.querySelectorAll('.barcode-svg');
            elements.forEach((el) => {
                const value = el.getAttribute('data-value');
                if (value) {
                    try {
                        (window as any).JsBarcode(el, value, {
                            format: "CODE128",
                            width: 1.5,
                            height: 25, // Reduced height for shorter box
                            displayValue: false, // We display the ID manually below for better styling
                            margin: 0,
                            background: "transparent"
                        });
                    } catch (e) {
                        console.error("Barcode generation error", e);
                    }
                }
            });
        }
    }, 100);
    return () => clearTimeout(timer);
  }, [item, copies, printMode, startSeq, endSeq]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow && content) {
      printWindow.document.write('<html><head><title>Print Barcodes</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; padding: 0; }
        }
        body { font-family: sans-serif; margin: 0; padding: 10px; }
        
        .label-grid { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 0; /* Tightly packed - no gaps */
            justify-content: flex-start;
        }
        
        .label { 
            border: 1px dashed #ccc; 
            /* Fixed small dimensions to fit most equipment - shorter height */
            width: 48mm; 
            height: 25mm; 
            padding: 2px; 
            box-sizing: border-box; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            margin: 0; /* No margin between labels */
            page-break-inside: avoid;
            background: white;
            overflow: hidden;
        }
        
        .item-name { 
            font-weight: bold; 
            font-size: 9px; 
            margin-bottom: 1px; 
            width: 100%; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            text-align: center;
            line-height: 1;
        }
        
        svg { 
            max-width: 95%; 
            height: 20px; /* Reduced barcode SVG height */
            display: block; 
            margin: 0 auto; 
        }
        
        .item-id { 
            font-family: monospace; 
            font-size: 8px; 
            margin-top: 1px; 
            color: #000; 
            line-height: 1;
        }

        /* Screen only adjustments for preview */
        @media screen {
            .label-grid { gap: 10px; }
            .label { margin-bottom: 0; border: 1px solid #eee; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write('<div class="label-grid">');
      printWindow.document.write(content);
      printWindow.document.write('</div>');
      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
    }
  };

  const labels = [];
  // Ensure we have a shortId, fallback to simple ID substring if missing
  const baseId = item.shortId || item.id.substring(0, 8).toUpperCase();
  
  for (let i = 1; i <= item.quantity; i++) {
    // Range Filter Logic
    if (printMode === 'range') {
        if (i < startSeq || i > endSeq) continue;
    }

    const sequence = String(i).padStart(3, '0');
    const uniqueId = `${baseId}-${sequence}`;

    // Create duplicates based on copies state
    for (let c = 0; c < copies; c++) {
        labels.push(
            <div key={`${i}-${c}`} className="label bg-white p-1 rounded border border-gray-200 shadow-sm flex flex-col items-center justify-center relative" style={{ width: '180px', height: '95px' }}>
                <div className="item-name text-gray-900 font-bold text-xs mb-1 w-full truncate text-center" title={item.name}>
                {item.name}
                </div>
                {/* SVG container for JsBarcode */}
                <svg 
                    className="barcode-svg" 
                    data-value={uniqueId}
                ></svg>
                <div className="item-id text-[10px] text-gray-600 font-mono mt-1">
                    {uniqueId}
                </div>
            </div>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4 bg-gray-50/50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800">Barcode Printing</h3>
                <p className="text-sm text-gray-500">Generating labels for {item.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Range Mode Toggle */}
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <ListFilter className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Print Mode:</span>
                  <div className="flex bg-gray-100 rounded p-0.5">
                      <button 
                        onClick={() => setPrintMode('all')}
                        className={`px-3 py-0.5 rounded text-xs font-medium transition-all ${printMode === 'all' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        All ({item.quantity})
                      </button>
                      <button 
                        onClick={() => setPrintMode('range')}
                        className={`px-3 py-0.5 rounded text-xs font-medium transition-all ${printMode === 'range' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Specific
                      </button>
                  </div>
              </div>

              {/* Range Inputs */}
              {printMode === 'range' && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 animate-in slide-in-from-left-2 fade-in">
                      <span className="text-blue-700 font-medium text-xs">Range:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max={endSeq}
                        value={startSeq} 
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setStartSeq(Math.min(val, endSeq));
                        }}
                        className="w-12 border border-blue-200 rounded px-1 py-0.5 text-center text-xs focus:ring-1 focus:ring-blue-500"
                        placeholder="Start"
                      />
                      <span className="text-blue-400">-</span>
                      <input 
                        type="number" 
                        min={startSeq}
                        max={item.quantity}
                        value={endSeq} 
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || item.quantity;
                            setEndSeq(Math.min(Math.max(val, startSeq), item.quantity));
                        }}
                        className="w-12 border border-blue-200 rounded px-1 py-0.5 text-center text-xs focus:ring-1 focus:ring-blue-500"
                        placeholder="End"
                      />
                  </div>
              )}

              {/* Copies Input */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm ml-auto">
                  <Copy className="w-4 h-4 text-gray-500" />
                  <label className="font-medium text-gray-700 whitespace-nowrap">Copies per Item:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={copies} 
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 border border-gray-300 rounded px-2 py-0.5 text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" ref={printRef}>
                {labels.length > 0 ? labels : (
                    <div className="col-span-full text-center text-gray-400 py-10 italic">
                        No labels selected in this range.
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 rounded-b-xl flex justify-between items-center">
          <div className="text-sm text-gray-500">
              Total Labels: <span className="font-bold text-gray-800">{labels.length}</span>
          </div>
          <div className="flex space-x-3">
            <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors text-sm font-medium"
            >
                Close
            </button>
            <button
                onClick={handlePrint}
                disabled={labels.length === 0}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer className="w-4 h-4" />
                <span>Print Labels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkBarcodeModal;
