

import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X, Printer, Copy } from 'lucide-react';

interface QRCodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ item, onClose }) => {
  const [printQty, setPrintQty] = useState(item.quantity);
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
            width: 48mm; 
            height: 48mm; /* Square label for QR */
            padding: 4px; 
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
            font-size: 10px; 
            margin-bottom: 2px; 
            width: 100%; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
        }
        
        .qr-img {
            width: 32mm;
            height: 32mm;
            display: block;
            margin: 2px auto;
        }
        
        .item-footer { 
            font-size: 8px; 
            color: #555;
            line-height: 1;
        }
        
        .scan-text {
            font-size: 7px;
            color: #888;
            margin-top: 2px;
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
      
      // Generate labels based on printQty
      let content = '';
      for(let i=0; i<printQty; i++) {
          content += `
            <div class="label">
                <div class="item-name">${item.name}</div>
                <img src="${qrUrl}" class="qr-img" />
                <div class="item-footer">Loc: ${item.location}</div>
                <div class="scan-text">Scan for Info</div>
            </div>
          `;
      }
      
      printWindow.document.write(content);
      printWindow.document.write('</div>');
      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-gray-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{item.category} • {item.location}</p>
          
          <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-gray-100 shadow-inner">
            <img src={qrUrl} alt="Item QR Code" className="w-40 h-40 mix-blend-multiply" />
            <p className="text-[10px] text-gray-400 mt-2 font-mono">Scans to public info page</p>
          </div>

          {/* Bulk Settings */}
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