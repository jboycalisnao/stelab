

import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Printer, Copy, Package } from 'lucide-react';

interface QRCodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ item, onClose }) => {
  const [printQty, setPrintQty] = useState(item.quantity);
  const [mode, setMode] = useState<'item' | 'boxes'>('item');

  // Public URL for the QR code
  const publicUrl = `${window.location.origin}?view_item=${item.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`;
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print QR Labels</title>');
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
            gap: 0; 
            justify-content: flex-start;
        }
        
        .label { 
            border: 1px dashed #ccc; 
            width: 32mm; 
            height: 32mm; /* Smaller square label */
            padding: 2px; 
            box-sizing: border-box; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            margin: 0; 
            page-break-inside: avoid;
            background: white;
            overflow: hidden;
            text-align: center;
        }
        
        .item-name { 
            font-weight: bold; 
            font-size: 8px; 
            margin-bottom: 1px; 
            width: 100%; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
        }
        
        .qr-img {
            width: 22mm;
            height: 22mm;
            display: block;
            margin: 1px auto;
        }
        
        .item-footer { 
            font-size: 6px; 
            color: #555;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
            text-overflow: ellipsis;
        }
        
        .scan-text {
            font-size: 5px;
            color: #888;
            margin-top: 1px;
            text-transform: uppercase;
        }

        /* Screen preview */
        @media screen {
            .label-grid { gap: 10px; }
            .label { margin-bottom: 0; border: 1px solid #eee; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      printWindow.document.write('<div class="label-grid">');
      
      let content = '';

      if (mode === 'item') {
        for(let i=0; i<printQty; i++) {
            content += `
                <div class="label">
                    <div class="item-name">${item.name}</div>
                    <img src="${qrUrl}" class="qr-img" />
                    <div class="item-footer">${item.location}</div>
                    <div class="scan-text">Scan for Info</div>
                </div>
            `;
        }
      } else if (mode === 'boxes' && item.boxes) {
          // Print one label for each box
          item.boxes.forEach(box => {
               const boxQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(box.id)}`;
               content += `
                <div class="label">
                    <div class="item-name">${item.name}</div>
                    <img src="${boxQrUrl}" class="qr-img" />
                    <div class="item-footer">${box.label} (${box.quantity} pcs)</div>
                    <div class="scan-text">${box.id}</div>
                </div>
            `;
          });
      }
      
      printWindow.document.write(content);
      printWindow.document.write('</div>');
      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
    }
  };

  const hasBoxes = item.boxes && item.boxes.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-gray-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{item.category} • {item.location}</p>

          {/* Mode Switcher */}
          {hasBoxes && (
              <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                  <button 
                    onClick={() => setMode('item')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'item' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                  >
                      Public Info QR
                  </button>
                  <button 
                    onClick={() => setMode('boxes')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'boxes' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                  >
                      Box Labels ({item.boxes!.length})
                  </button>
              </div>
          )}
          
          <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-gray-100 shadow-inner">
            {mode === 'item' ? (
                <>
                    <img src={qrUrl} alt="Item QR Code" className="w-40 h-40 mix-blend-multiply" />
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">Scans to public info page</p>
                </>
            ) : (
                <div className="w-40 h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <Package className="w-10 h-10 mb-2" />
                    <p className="text-xs">Preview on Print</p>
                </div>
            )}
          </div>

          {/* Bulk Settings */}
          {mode === 'item' && (
            <div className="flex items-center justify-center gap-2 mb-6">
                <label className="text-sm text-gray-600 font-medium">Print Copies:</label>
                <input 
                    type="number" 
                    min="1" 
                    value={printQty}
                    onChange={(e) => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                />
            </div>
          )}

          {mode === 'boxes' && (
              <p className="text-xs text-gray-500 mb-6">
                  Will print {item.boxes!.length} unique labels for each box in inventory.
              </p>
          )}

          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print Labels</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;