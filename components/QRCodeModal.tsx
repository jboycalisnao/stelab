import React from 'react';
import { InventoryItem } from '../types';
import { X, Printer } from 'lucide-react';

interface QRCodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ item, onClose }) => {
  const qrData = JSON.stringify({ id: item.id, name: item.name, loc: item.location });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=400,width=400');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Label</title></head><body>');
      printWindow.document.write(`<div style="text-align:center; font-family: sans-serif;">`);
      printWindow.document.write(`<h2 style="margin-bottom:5px">${item.name}</h2>`);
      printWindow.document.write(`<p style="margin:0; font-size:12px">${item.id}</p>`);
      printWindow.document.write(`<img src="${qrUrl}" style="margin: 10px 0;" />`);
      printWindow.document.write(`<p>Location: ${item.location}</p>`);
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-2xl rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-white/50">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{item.category} • {item.location}</p>
          
          <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-gray-100 shadow-inner">
            <img src={qrUrl} alt="Item QR Code" className="w-40 h-40 mix-blend-multiply" />
          </div>

          <div className="text-xs text-gray-400 font-mono break-all mb-6">
            ID: {item.id}
          </div>

          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;