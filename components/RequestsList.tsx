import React, { useState, useEffect, useMemo } from 'react';
import { BorrowRequest, RequestStatus } from '../types';
import * as storage from '../services/storageService';
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

  const handleApprove = async (request: BorrowRequest) => {
      confirmAction(
        "Approve Request",
        `Are you sure you want to approve request ${request.referenceCode}? This will deduct inventory and create active borrow records.`,
        async () => {
             setProcessingId(request.id);
            const result = await storage.processApprovedRequest(request);
            if (result.success) {
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

  const handlePrintSlip = (req: BorrowRequest) => {
      // Directs to the current app status page
      const trackingUrl = `${window.location.origin}?ref=${req.referenceCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingUrl)}`;
      
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Borrow Slip</title>');
          printWindow.document.write(`
            <style>
                @media print {
                    @page { size: A5 landscape; margin: 0; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                }
                body { font-family: 'Segoe UI', sans-serif; color: #1f2937; background: white; }
                .slip-container { 
                    width: 210mm; /* A5 Landscape Width */
                    height: 148mm; /* A5 Landscape Height */
                    padding: 20px 30px; 
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
                .header h1 { margin: 0; font-size: 1.4em; color: #1e3a8a; }
                .header p { margin: 2px 0 0; color: #6b7280; font-size: 0.8em; text-transform: uppercase; letter-spacing: 1.5px; }
                
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; font-size: 0.85em; }
                .meta-item label { display: block; font-weight: bold; color: #4b5563; font-size: 0.7em; text-transform: uppercase; margin-bottom: 1px; }
                .meta-item div { font-weight: 500; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }

                .items-table-container { flex: 1; min-height: 50px; }
                table { width: 100%; border-collapse: collapse; font-size: 0.8em; }
                th { background: #f3f4f6; text-align: left; padding: 6px; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; font-size: 0.75em; color: #4b5563; }
                td { padding: 6px; border-bottom: 1px solid #e5e7eb; }
                
                .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 10px; }
                
                .signatures { display: flex; gap: 30px; flex: 1; }
                .signature-box { flex: 1; }
                .signature-line { width: 100%; border-top: 1px solid #000; margin-top: 35px; padding-top: 5px; font-size: 0.7em; text-align: center; text-transform: uppercase; color: #4b5563; }
                
                .qr-section { width: 100px; text-align: center; margin-left: 20px; flex-shrink: 0; }
                .qr-section img { width: 80px; height: 80px; }
                .qr-section .code { font-family: monospace; font-weight: bold; font-size: 0.9em; margin-top: 2px; color: #1f2937; }
                .qr-scan-hint { font-size: 0.6em; color: #6b7280; margin-top: 2px; }
            </style>
          `);
          printWindow.document.write('</head><body>');
          printWindow.document.write(`
            <div class="slip-container">
                <div class="header">
                    <h1>Equipment Borrow Slip</h1>
                    <p>Laboratory Inventory System</p>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><label>Reference Code</label><div>${req.referenceCode}</div></div>
                    <div class="meta-item"><label>Date Requested</label><div>${new Date(req.requestDate).toLocaleDateString()}</div></div>
                    <div class="meta-item"><label>Borrower Name</label><div>${req.borrowerName}</div></div>
                    <div class="meta-item"><label>ID / Section</label><div>${req.borrowerId}</div></div>
                    <div class="meta-item"><label>Expected Return</label><div>${req.returnDate}</div></div>
                </div>

                <div class="items-table-container">
                    <table>
                        <thead><tr><th>Item Name</th><th style="text-align:right">Qty</th></tr></thead>
                        <tbody>
                            ${req.items.map(i => `<tr><td>${i.itemName}</td><td style="text-align:right">${i.quantity}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="footer-row">
                    <div class="signatures">
                        <div class="signature-box">
                            <div class="signature-line">Borrower Signature</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">Lab Admin Approval</div>
                        </div>
                    </div>
                    <div class="qr-section">
                        <img src="${qrUrl}" />
                        <div class="code">${req.referenceCode}</div>
                        <div class="qr-scan-hint">Scan to Track</div>
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
                                    <p className="text-sm text-gray-500">{req.borrowerId} • {new Date(req.requestDate).toLocaleDateString()}</p>
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
                                        title="Print Slip"
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