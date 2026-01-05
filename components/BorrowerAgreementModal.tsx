
import React, { useMemo } from 'react';
import { BorrowRequest } from '../types';
import { X, Printer, FileText, CheckCircle2, ShieldCheck, AlertCircle, QrCode } from 'lucide-react';

interface BorrowerAgreementModalProps {
  request: BorrowRequest;
  onClose: () => void;
  appName: string;
  logoUrl?: string;
  labInCharge?: string;
}

const BorrowerAgreementModal: React.FC<BorrowerAgreementModalProps> = ({ request, onClose, appName, logoUrl, labInCharge }) => {
  
  const qrUrl = useMemo(() => {
    const trackingUrl = `${window.location.origin}?ref=${request.referenceCode}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`;
  }, [request.referenceCode]);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=900,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Lab Utilization Permit</title>');
      printWindow.document.write(`
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          @media print {
            @page { size: A4; margin: 1.2cm; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          }
          body { 
            font-family: 'Inter', sans-serif; 
            color: #000; 
            line-height: 1.4; 
            font-size: 10pt; 
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
            position: relative;
          }
          .print-logo {
            height: 75px;
            width: auto;
            margin-bottom: 8px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .print-ref-badge {
            position: absolute;
            top: 0;
            right: 0;
            border: 1.5px solid #000;
            padding: 4px 10px;
            font-weight: 800;
            font-size: 9pt;
            background: #f9f9f9;
          }
          .print-app-name {
            font-size: 16pt;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.02em;
          }
          .print-sub-header {
            font-size: 9pt;
            color: #444;
            margin: 2px 0 0;
            font-weight: 600;
          }
          .doc-title {
            text-align: center;
            font-weight: 800;
            font-size: 13pt;
            margin: 20px 0;
            text-decoration: underline;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .meta-item {
            border-bottom: 1px solid #ddd;
            padding-bottom: 3px;
          }
          .meta-label {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #666;
            display: block;
          }
          .meta-value {
            font-weight: 700;
            font-size: 10.5pt;
          }
          .section-heading {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9pt;
            border-bottom: 1.5px solid #000;
            margin-bottom: 10px;
            padding-bottom: 2px;
            width: fit-content;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 9.5pt;
          }
          th {
            background-color: #f2f2f2;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8pt;
          }
          .terms-list {
            font-size: 8.5pt;
            padding-left: 18px;
            margin: 10px 0;
          }
          .terms-list li {
            margin-bottom: 6px;
            text-align: justify;
          }
          .signature-area {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            align-items: flex-end;
          }
          .sig-box {
            text-align: center;
            width: 45%;
          }
          .sig-line {
            border-top: 1.5px solid #000;
            padding-top: 4px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10pt;
          }
          .sig-label {
            font-size: 8pt;
            color: #555;
          }
          .qr-container {
            text-align: right;
          }
          .qr-img {
            width: 75px;
            height: 75px;
            border: 1px solid #eee;
          }
          .footer-note {
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 8px;
            font-size: 7.5pt;
            color: #888;
            font-style: italic;
            display: flex;
            justify-content: space-between;
          }
        </style>
      `);
      printWindow.document.write('</head><body>');
      
      // Manually construct the printable content for absolute control over layout
      printWindow.document.write(`
        <div class="print-header">
          <div class="print-ref-badge">REF: ${request.referenceCode}</div>
          ${logoUrl ? `<img src="${logoUrl}" class="print-logo" />` : ''}
          <h1 class="print-app-name">${appName}</h1>
          <p class="print-sub-header">Science, Technology, and Engineering (STE) Laboratory</p>
          <p class="print-sub-header">Official Utilization Permit & Accountability Agreement</p>
        </div>

        <div class="doc-title">Laboratory Utilization Permit</div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Authorized Borrower</span>
            <span class="meta-value">${request.borrowerName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID / Grade & Section</span>
            <span class="meta-value">${request.borrowerId}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Utilization Date</span>
            <span class="meta-value">${new Date(request.requestDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Required Return Date</span>
            <span class="meta-value" style="color: #AF1456;">${request.returnDate}</span>
          </div>
        </div>

        <div class="section-heading">I. Equipment Tracking (Lent Items)</div>
        <table>
          <thead>
            <tr>
              <th>Description of Equipment / Apparatus</th>
              <th style="width: 60px; text-align: center;">Qty</th>
              <th>Release State</th>
            </tr>
          </thead>
          <tbody>
            ${request.items.map(item => `
              <tr>
                <td style="font-weight: 600;">${item.itemName}</td>
                <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
                <td style="font-style: italic;">Verified Functional</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-heading">II. Binding Accountability Terms</div>
        <ol class="terms-list">
          <li><strong>ABSOLUTE STEWARDSHIP:</strong> The Borrower assumes full physical and legal responsibility for the listed items from release until formal return verification.</li>
          <li><strong>PRE-USE INSPECTION:</strong> Discrepancies must be reported <em>immediately</em> upon collection; failure to do so indicates acceptance of current state.</li>
          <li><strong>LIABILITY FOR DAMAGE:</strong> Breakage, loss, or theft due to negligence requires full restitution via replacement with a new identical unit or payment of current market value.</li>
          <li><strong>TEMPORAL COMPLIANCE:</strong> Return must be initiated on or before the indicated due date. Late returns may trigger utilization suspension and administrative penalties.</li>
          <li><strong>SAFETY PROTOCOL:</strong> Strict adherence to lab safety standards and equipment handling guidelines is mandatory throughout the borrowing period.</li>
        </ol>

        <p style="text-align: center; font-style: italic; margin-top: 25px; font-weight: 600;">"I certify that I have read, understood, and voluntarily bound myself to these terms."</p>

        <div class="signature-area">
          <div class="sig-box">
            <div class="sig-line">${request.borrowerName}</div>
            <div class="sig-label">Signature of Borrower</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">${labInCharge || '&nbsp;'}</div>
            <div class="sig-label">Laboratory Custodian In-Charge</div>
          </div>
          <div class="qr-container">
            <img src="${qrUrl}" class="qr-img" />
            <div style="font-size: 6pt; font-weight: 800; text-transform: uppercase; margin-top: 2px;">Verify Record</div>
          </div>
        </div>

        <div class="footer-note">
          <div>System Generated • SciLab Inventory Pro • Digital Ref: ${request.referenceCode}</div>
          <div>Printed: ${new Date().toLocaleString()} • Page 1 of 1</div>
        </div>
      `);

      printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-300 border border-gray-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-gray-900 text-white flex justify-between items-center shadow-lg flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg"><FileText className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Utilization Permit Preview</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Standard A4 Single-Page Slip</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Preview Area (Interactive/Screen view) */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50">
          <div className="bg-white p-10 shadow-sm border border-gray-200 max-w-[210mm] mx-auto min-h-[297mm] text-gray-900 font-sans leading-normal relative">
            
            <div className="text-right mb-4">
              <span className="inline-block border-2 border-black px-4 py-1 font-black text-sm bg-gray-50">REF: {request.referenceCode}</span>
            </div>

            <div className="text-center border-b-2 border-black pb-4 mb-6">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-20 mx-auto mb-3 block object-contain" />}
              <h1 className="m-0 text-[22px] uppercase font-black tracking-tight">{appName}</h1>
              <p className="m-0 text-[12px] font-bold text-gray-600">Science, Technology, and Engineering (STE) Laboratory</p>
              <p className="m-0 text-[12px] font-bold text-gray-600 uppercase">Official Utilization Permit & Borrower Agreement</p>
            </div>

            <div className="text-center font-black text-[16px] my-6 underline tracking-widest uppercase">LABORATORY UTILIZATION PERMIT</div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
              <div className="border-b border-gray-300 pb-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter">Authorized Borrower</span>
                <span className="text-[14px] font-bold">{request.borrowerName}</span>
              </div>
              <div className="border-b border-gray-300 pb-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter">ID / Grade & Section</span>
                <span className="text-[14px] font-bold">{request.borrowerId}</span>
              </div>
              <div className="border-b border-gray-300 pb-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter">Utilization Date</span>
                <span className="text-[14px] font-bold">{new Date(request.requestDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="border-b border-gray-300 pb-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter">Required Return Date</span>
                <span className="text-[14px] font-bold text-maroon-600">{request.returnDate}</span>
              </div>
            </div>

            <div className="mb-6">
              <span className="font-black uppercase text-[12px] border-b-2 border-black block mb-3 px-1">I. Inventory Tracking (Lent Items)</span>
              <table className="w-full border-collapse border border-black text-[13px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-left uppercase text-[11px]">Description of Equipment / Apparatus</th>
                    <th className="border border-black p-2 text-center w-20 uppercase text-[11px]">Qty</th>
                    <th className="border border-black p-2 text-left uppercase text-[11px]">Release State</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, i) => (
                    <tr key={i}>
                      <td className="border border-black p-2 font-bold text-gray-800">{item.itemName}</td>
                      <td className="border border-black p-2 text-center font-black text-blue-700">{item.quantity}</td>
                      <td className="border border-black p-2 italic text-[11px]">Verified Functional</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <span className="font-black uppercase text-[12px] border-b-2 border-black block mb-3 px-1">II. Binding Accountability Terms</span>
              <div className="text-[12px] leading-tight space-y-2">
                <ol className="list-decimal pl-5 space-y-2 font-medium">
                  <li><strong>ABSOLUTE STEWARDSHIP:</strong> The Borrower assumes full legal responsibility for the listed items from release until formal return verification.</li>
                  <li><strong>PRE-USE INSPECTION:</strong> Discrepancies must be reported <em>immediately</em> upon collection; failure to do so indicates acceptance of current state.</li>
                  <li><strong>LIABILITY FOR DAMAGE:</strong> Breakage, loss, or theft due to negligence requires full restitution via replacement with a new identical unit.</li>
                  <li><strong>TEMPORAL COMPLIANCE:</strong> Return must be initiated on or before the indicated date. Late returns may trigger utilization suspension.</li>
                  <li><strong>SAFETY PROTOCOL:</strong> Strict adherence to lab safety standards is mandatory throughout the borrowing period.</li>
                </ol>
              </div>
            </div>

            <div className="mt-10 text-[13px] italic text-gray-700 font-semibold text-center border-t border-gray-100 pt-4">
              <p>"I hereby certify that I have read, understood, and voluntarily bound myself to this agreement."</p>
            </div>

            <div className="flex justify-between items-end mt-12 px-2">
              <div className="flex-1 flex gap-12">
                <div className="flex-1 text-center">
                  <div className="border-t-2 border-black pt-1 font-black uppercase text-[13px]">{request.borrowerName}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Signature of Borrower</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="border-t-2 border-black pt-1 font-black uppercase text-[13px]">{labInCharge || '&nbsp;'}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Custodian In-Charge</div>
                </div>
              </div>
              <div className="ml-12 text-right">
                <div className="p-2 border border-gray-100 rounded-lg inline-block bg-white shadow-sm">
                  <img src={qrUrl} alt="Tracking QR" className="w-20 h-20" />
                </div>
                <span className="block text-[8px] font-black text-gray-400 mt-1 uppercase tracking-widest">Verify Record</span>
              </div>
            </div>

            <div className="mt-12 pt-4 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between items-center italic">
              <div>SciLab Inventory Pro • Document Ref: {request.referenceCode}</div>
              <div className="font-bold">SYSTEM GENERATED: {new Date().toLocaleString()}</div>
              <div>Page 1 of 1</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Professional Serif-Free</div>
            <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-blue-500" /> Fixed Logo Scale</div>
            <div className="flex items-center gap-1"><QrCode className="w-4 h-4 text-indigo-500" /> Tracking Enabled</div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"
            >
              Close
            </button>
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-all shadow-lg shadow-indigo-200"
            >
              <Printer className="w-4 h-4" /> 
              Print Formal Slip
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BorrowerAgreementModal;
