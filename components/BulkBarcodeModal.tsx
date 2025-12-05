
import React, { useRef, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Printer } from 'lucide-react';

interface BulkBarcodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const BulkBarcodeModal: React.FC<BulkBarcodeModalProps> = ({ item, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate barcodes using JsBarcode after the component mounts
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
                            height: 40,
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
  }, [item]);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow && content) {
      printWindow.document.write('<html><head><title>Print Barcodes</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: sans-serif; margin: 0; padding: 20px; }
        .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .label { border: 1px dashed #ccc; padding: 15px; text-align: center; page-break-inside: avoid; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .item-name { font-weight: bold; font-size: 14px; margin-bottom: 8px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        svg { max-width: 100%; height: 50px; display: block; margin: 0 auto; }
        .item-id { font-family: monospace; font-size: 12px; margin-top: 5px; color: #555; }
        @media print {
            .no-print { display: none; }
            .label { border: 1px solid #ddd; }
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
    const sequence = String(i).padStart(3, '0');
    const uniqueId = `${baseId}-${sequence}`;

    labels.push(
      <div key={i} className="label bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col items-center">
        <div className="item-name text-gray-900 font-bold text-sm mb-2 w-full truncate text-center" title={item.name}>
          {item.name}
        </div>
        {/* SVG container for JsBarcode */}
        <svg 
            className="barcode-svg" 
            data-value={uniqueId}
        ></svg>
        <div className="item-id text-xs text-gray-500 font-mono mt-2">
            {uniqueId}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/50">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/40 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Bulk Barcode Printing</h3>
            <p className="text-sm text-gray-500">Generating {item.quantity} unique labels for {item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" ref={printRef}>
                {labels}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 bg-white/40 rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white/50 transition-colors text-sm font-medium"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            <span>Print Labels</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkBarcodeModal;
