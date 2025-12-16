import React, { useState, useEffect, useMemo } from 'react';
import { BorrowRequest, RequestStatus } from '../types';
import * as storage from '../services/storageService';
import { getUserStatusUpdateTemplate } from '../services/emailTemplates';
import { Search, CheckCircle, XCircle, Trash2, Printer, Eye, Clock, FileText, Loader2, Send } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface RequestsListProps {
  // 
}

const RequestsList: React.FC<RequestsListProps> = () => {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All' | 'Released'>('All');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const data = await storage.getBorrowRequests();
    // Sort by date desc
    data.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    setRequests(data);
    setLoading(false);
  };

  const filteredRequests = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase();
      return requests.filter(req => {
          // Check Request Level Details: Borrower, Reference Code, Internal ID
          const matchesRequest = 
              req.borrowerName.toLowerCase().includes(lowerTerm) || 
              req.referenceCode.toLowerCase().includes(lowerTerm) ||
              req.id.toLowerCase().includes(lowerTerm);
          
          // Check Item Level Details: Name, Item ID, Linked Record ID
          const matchesItems = req.items && req.items.some(item => 
              item.itemName.toLowerCase().includes(lowerTerm) ||
              item.itemId.toLowerCase().includes(lowerTerm) ||
              (item.linkedRecordId && item.linkedRecordId.toLowerCase().includes(lowerTerm))
          );

          const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
          return (matchesRequest || matchesItems) && matchesStatus;
      });
  }, [requests, searchTerm, statusFilter]);

  const confirmAction = (title: string, message: string, action: () => void, isDestructive = false) => {
    setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
            action();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        isDestructive
    });
  };

  const sendUserUpdateEmail = async (request: BorrowRequest, status: 'Approved' | 'Released') => {
      if (!request.borrowerEmail) return;

      try {
          const settings = await storage.getSettings();
          if (!settings.googleAppsScriptUrl) return;

          const htmlBody = getUserStatusUpdateTemplate({
              borrowerName: request.borrowerName,
              referenceCode: request.referenceCode,
              status: status,
              returnDate: request.returnDate,
              appName: settings.appName,
              items: request.items.map(i => ({ name: i.itemName, qty: i.quantity }))
          });

          let subject = `Request Update: ${request.referenceCode} - ${status}`;
          let plainBody = `Dear ${request.borrowerName},\n\nYour borrow request (${request.referenceCode}) has been ${status}.\n`;
          
          if (status === 'Approved') {
              plainBody += `Please proceed to the laboratory to collect your items.\n`;
          } else if (status === 'Released') {
              plainBody += `You have successfully collected your items. Please return them by ${request.returnDate}.\n`;
          }
          
          plainBody += `\nThank you,\n${settings.appName}`;

          await fetch(settings.googleAppsScriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                  to_email: request.borrowerEmail,
                  subject: subject,
                  body: plainBody,
                  html_body: htmlBody,
                  app_name: settings.appName
              })
          });
      } catch (e) {
          console.error("Failed to send user update email", e);
      }
  };

  const handleApprove = async (request: BorrowRequest) => {
      confirmAction(
        "Approve Request",
        `Are you sure you want to approve request ${request.referenceCode}? This will deduct inventory and create active borrow records.`,
        async () => {
             setProcessingId(request.id);
            const result = await storage.processApprovedRequest(request);
            if (result.success) {
                // Send notification if email exists
                if (request.borrowerEmail) {
                    await sendUserUpdateEmail(request, 'Approved');
                }
                await loadRequests();
            } else {
                alert("Failed to process request: " + result.message);
            }
            setProcessingId(null);
        },
        false
      );
  };

  const handleRelease = async (request: BorrowRequest) => {
      confirmAction(
        "Release Items",
        `Mark items for ${request.referenceCode} as Released? This confirms the borrower has physically taken the items.`,
        async () => {
             setProcessingId(request.id);
             // We use a custom status 'Released' which isn't in the strict enum initially but we can cast or handle it
             await storage.updateBorrowRequestStatus(request.id, 'Released' as RequestStatus);
             
             // Send notification if email exists
             if (request.borrowerEmail) {
                 await sendUserUpdateEmail(request, 'Released');
             }
             
             await loadRequests();
             setProcessingId(null);
        },
        false
      );
  };

  const handleReject = async (id: string) => {
      confirmAction(
        "Reject Request",
        "Are you sure you want to reject this request?",
        async () => {
            await storage.updateBorrowRequestStatus(id, 'Rejected');
            await loadRequests();
        },
        true
      );
  };

  const handleDelete = async (id: string) => {
      confirmAction(
        "Delete Request Record",
        "Permanently delete this request record? If this request was approved/released, the associated borrow records will also be deleted from the system and inventory restored.",
        async () => {
             await storage.deleteBorrowRequest(id);
             await loadRequests();
        },
        true
      );
  };

  const handlePrintSlip = async (req: BorrowRequest) => {
      // Fetch settings for Logo and School Name
      const settings = await storage.getSettings();
      
      const trackingUrl = `${window.location.origin}?ref=${req.referenceCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingUrl)}`;
      
      const printWindow = window.open('', '', 'height=900,width=800');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Borrower Form</title>');
          printWindow.document.write(`
            <style>
                @media print {
                    @page { size: A4; margin: 2cm; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                }
                body { font-family: sans-serif; color: #000; background: white; line-height: 1.4; }
                .container { width: 100%; max-width: 210mm; margin: 0 auto; }
                
                /* Header */
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .logo { height: 60px; width: auto; margin-bottom: 10px; }
                .header h1 { margin: 0; font-size: 18pt; text-transform: uppercase; letter-spacing: 1px; }
                .header p { margin: 2px 0; font-size: 10pt; }
                .form-title { text-align: center; font-weight: bold; font-size: 14pt; margin: 20px 0; text-decoration: underline; }

                /* Info Grid */
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 11pt; }
                .info-row { display: flex; margin-bottom: 5px; }
                .label { font-weight: bold; width: 130px; }
                .value { border-bottom: 1px solid #999; flex: 1; padding-left: 5px; }

                /* Items Table */
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10pt; }
                th, td { border: 1px solid #000; padding: 8px; }
                th { background-color: #f0f0f0; text-transform: uppercase; font-weight: bold; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }

                /* Terms */
                .terms { font-size: 9pt; margin-bottom: 30px; text-align: justify; }
                .terms h3 { font-size: 10pt; text-transform: uppercase; margin-bottom: 5px; }
                .terms ol { padding-left: 20px; margin-top: 5px; }
                .terms li { margin-bottom: 4px; }

                /* Signatures */
                .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 11pt; }
                .sig-block { width: 45%; }
                .sig-line { border-top: 1px solid #000; margin-top: 40px; text-align: center; padding-top: 5px; font-weight: bold; text-transform: uppercase; }
                .sig-role { text-align: center; font-size: 9pt; font-style: italic; }

                /* Footer/QR */
                .footer { margin-top: 30px; border-top: 1px dashed #999; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #555; }
                .qr-box { text-align: center; }
                .qr-box img { width: 60px; height: 60px; }
            </style>
          `);
          printWindow.document.write('</head><body>');
          printWindow.document.write(`
            <div class="container">
                <div class="header">
                    ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
                    <h1>${settings.appName}</h1>
                    <p>Science Laboratory Department</p>
                </div>

                <div class="form-title">EQUIPMENT BORROWER'S FORM</div>

                <div class="info-grid">
                    <div>
                        <div class="info-row"><span class="label">Borrower Name:</span><span class="value">${req.borrowerName}</span></div>
                        <div class="info-row"><span class="label">ID / Section:</span><span class="value">${req.borrowerId}</span></div>
                        <div class="info-row"><span class="label">Contact Info:</span><span class="value">${req.borrowerEmail || 'N/A'}</span></div>
                    </div>
                    <div>
                        <div class="info-row"><span class="label">Reference No:</span><span class="value"><strong>${req.referenceCode}</strong></span></div>
                        <div class="info-row"><span class="label">Date Requested:</span><span class="value">${new Date(req.requestDate).toLocaleDateString()}</span></div>
                        <div class="info-row"><span class="label">Due Date:</span><span class="value">${req.returnDate}</span></div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%">Item Description / Equipment Name</th>
                            <th style="width: 15%" class="text-center">Quantity</th>
                            <th style="width: 35%">Remarks / Condition Issued</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${req.items.map(i => `
                            <tr>
                                <td>${i.itemName}</td>
                                <td class="text-center"><strong>${i.quantity}</strong></td>
                                <td>Good Working Condition</td>
                            </tr>
                        `).join('')}
                        <!-- Empty rows for manual additions if needed -->
                        <tr><td>&nbsp;</td><td></td><td></td></tr>
                        <tr><td>&nbsp;</td><td></td><td></td></tr>
                    </tbody>
                </table>

                <div class="terms">
                    <h3>Terms and Conditions</h3>
                    <ol>
                        <li><strong>Receipt & Inspection:</strong> I acknowledge that I have received the equipment listed above in good working condition and free from defects, unless otherwise noted in the "Remarks" column.</li>
                        <li><strong>Usage:</strong> I agree to use the equipment solely for educational or approved laboratory purposes and in accordance with all safety guidelines and instructions provided.</li>
                        <li><strong>Care & Custody:</strong> I will maintain the equipment in a secure manner and take all reasonable precautions to prevent loss, theft, or damage while it is in my possession.</li>
                        <li><strong>Liability & Replacement:</strong> I understand that I am financially responsible for this equipment. In the event of loss, theft, or damage due to negligence or misuse, I agree to replace the item(s) with the same model/specifications or pay the full replacement cost as determined by the Laboratory Office.</li>
                        <li><strong>Return Policy:</strong> I will return all items by the specified Due Date. I understand that late returns may result in disciplinary action or suspension of borrowing privileges.</li>
                    </ol>
                </div>

                <div class="signatures">
                    <div class="sig-block">
                        <p>Borrowed by:</p>
                        <div class="sig-line">${req.borrowerName}</div>
                        <div class="sig-role">Signature over Printed Name</div>
                    </div>
                    <div class="sig-block">
                        <p>Approved / Issued by:</p>
                        <div class="sig-line">&nbsp;</div>
                        <div class="sig-role">Laboratory In-Charge / Custodian</div>
                    </div>
                </div>

                <div class="footer">
                    <div>
                        System Generated Form • ${settings.appName}<br>
                        Printed on: ${new Date().toLocaleString()}
                    </div>
                    <div class="qr-box">
                        <img src="${qrUrl}" />
                        <br>${req.referenceCode}
                    </div>
                </div>
            </div>
          `);
          printWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
          printWindow.document.write('</body></html>');
          printWindow.document.close();
      }
  };

  const getStatusBadge = (status: RequestStatus | string) => {
      switch (status) {
          case 'Approved': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Approved</span>;
          case 'Pending': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
          case 'Rejected': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Rejected</span>;
          case 'Completed': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Completed</span>;
          case 'Released': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">Released</span>;
          case 'Returned': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">Returned</span>;
          default: return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 rounded-t-xl">
             <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search by borrower, code, item name, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                />
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(['All', 'Pending', 'Approved', 'Released'] as const).map(status => (
                    <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-100/50">
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
            ) : filteredRequests.length > 0 ? (
                filteredRequests.map(req => (
                    <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm text-center min-w-[80px]">
                                    <span className="block text-xs text-gray-400 font-mono">CODE</span>
                                    <span className="block font-bold text-gray-800 tracking-tight">{req.referenceCode}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{req.borrowerName}</h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{req.borrowerId}</span>
                                        {req.borrowerEmail && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 truncate max-w-[150px]">{req.borrowerEmail}</span>}
                                        <span>• {new Date(req.requestDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {req.items.map((item, idx) => (
                                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200 flex items-center gap-1">
                                                <span className="font-semibold">{item.quantity}x</span> {item.itemName}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 font-mono">ID: {req.id}</div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <div className="mb-1">{getStatusBadge(req.status)}</div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handlePrintSlip(req)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                        title="Print Form"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    
                                    {req.status === 'Pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(req)}
                                                disabled={processingId === req.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm font-bold disabled:opacity-50"
                                            >
                                                {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <CheckCircle className="w-3 h-3" />}
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReject(req.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-bold"
                                            >
                                                <XCircle className="w-3 h-3" />
                                                Reject
                                            </button>
                                        </>
                                    )}

                                    {req.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleRelease(req)}
                                            disabled={processingId === req.id}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-bold disabled:opacity-50"
                                        >
                                            <Send className="w-3 h-3" />
                                            Release
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={() => handleDelete(req.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    No requests found matching criteria.
                </div>
            )}
        </div>

        <ConfirmModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            isDestructive={confirmModal.isDestructive}
        />
    </div>
  );
};

export default RequestsList;