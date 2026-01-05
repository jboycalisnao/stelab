
import React, { useState, useEffect, useMemo } from 'react';
import { BorrowRequest, RequestStatus, AppSettings } from '../types';
import * as storage from '../services/storageService';
import * as notifications from '../services/notificationService';
import { Search, CheckCircle, XCircle, Trash2, Printer, Eye, Loader2, X, Calendar, MapPin, Tag, Info, Hand, FileText } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import BorrowerAgreementModal from './BorrowerAgreementModal';

const RequestsList: React.FC = () => {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // View Details Modal State
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  // Formal Documentation Modal State (Agreement/Permit)
  const [agreementRequest, setAgreementRequest] = useState<BorrowRequest | null>(null);

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
    storage.getSettings().then(setSettings);
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
        const data = await storage.getBorrowRequests();
        data.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        setRequests(data);
    } catch (e) {
        console.error("Failed to load requests", e);
    } finally {
        setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase();
      return requests.filter(req => {
          const matchesRequest = 
              req.borrowerName.toLowerCase().includes(lowerTerm) || 
              req.referenceCode.toLowerCase().includes(lowerTerm) ||
              req.id.toLowerCase().includes(lowerTerm);
          
          const matchesItems = req.items && req.items.some(item => 
              item.itemName.toLowerCase().includes(lowerTerm) ||
              item.itemId.toLowerCase().includes(lowerTerm)
          );

          const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
          return (matchesRequest || matchesItems) && matchesStatus;
      });
  }, [requests, searchTerm, statusFilter]);

  const handleApprove = async (req: BorrowRequest) => {
      setProcessingId(req.id);
      try {
          const result = await storage.processApprovedRequest(req);
          if (result.success) {
              const currentSettings = await storage.getSettings();
              // Notify student
              await notifications.notifyBorrowerOfStatusChange(currentSettings, req, 'Approved');
              await loadRequests();
          } else {
              alert(result.message || "Approval failed.");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setProcessingId(null);
      }
  };

  const handleRelease = async (req: BorrowRequest) => {
      setProcessingId(req.id);
      try {
          await storage.updateBorrowRequestStatus(req.id, 'Released');
          const currentSettings = await storage.getSettings();
          // Notify student
          await notifications.notifyBorrowerOfStatusChange(currentSettings, req, 'Released');
          await loadRequests();
      } catch (err) {
          console.error(err);
      } finally {
          setProcessingId(null);
      }
  };

  const handleReject = async (req: BorrowRequest) => {
      setProcessingId(req.id);
      try {
          await storage.updateBorrowRequestStatus(req.id, 'Rejected');
          const currentSettings = await storage.getSettings();
          // Notify student
          await notifications.notifyBorrowerOfStatusChange(currentSettings, req, 'Rejected');
          await loadRequests();
      } catch (err) {
          console.error(err);
      } finally {
          setProcessingId(null);
      }
  };

  const handleDeleteRequest = async (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: "Delete Request",
          message: "Permanently remove this request record? This cannot be undone.",
          isDestructive: true,
          onConfirm: async () => {
              setProcessingId(id);
              await storage.deleteBorrowRequest(id);
              await loadRequests();
              setProcessingId(null);
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // Triggers the unified permit/agreement modal
  const handlePrintSlip = (req: BorrowRequest) => {
      setAgreementRequest(req);
  };

  const getStatusBadge = (status: RequestStatus | string) => {
      switch (status) {
          case 'Approved': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Approved</span>;
          case 'Pending': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
          case 'Rejected': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Rejected</span>;
          case 'Released': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">Released</span>;
          case 'Returned': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">Returned</span>;
          default: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
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
                    placeholder="Search by name, ref, or equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                />
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(['All', 'Pending', 'Approved', 'Released', 'Rejected'] as const).map(status => (
                    <button 
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-100/50">
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500"/></div>
            ) : filteredRequests.length > 0 ? (
                filteredRequests.map(req => (
                    <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        {processingId === req.id && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm text-center min-w-[80px]">
                                    <span className="block text-[10px] text-gray-400 font-mono font-bold uppercase">Ref</span>
                                    <span className="block font-bold text-gray-800 tracking-tight">{req.referenceCode}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 truncate">{req.borrowerName}</h4>
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                                        <span className="truncate">{req.borrowerId}</span>
                                        <span className="flex-shrink-0 opacity-40">•</span>
                                        <span className="flex items-center gap-1 font-medium"><Calendar className="w-3 h-3" /> {new Date(req.requestDate).toLocaleDateString()}</span>
                                        
                                        {req.reservationSlot && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100 ml-1">
                                                <MapPin className="w-3 h-3" /> 
                                                <span>Lab: {req.reservationDate ? new Date(req.reservationDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''} @ {req.reservationSlot}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <div className="mb-1">{getStatusBadge(req.status)}</div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setSelectedRequest(req)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent"
                                        title="View Details"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handlePrintSlip(req)}
                                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent"
                                        title="Generate & Print Official Permit"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    
                                    {/* Action Buttons */}
                                    {req.status === 'Pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(req)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReject(req)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold shadow-sm"
                                            >
                                                <XCircle className="w-3 h-3" /> Reject
                                            </button>
                                        </>
                                    )}

                                    {req.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleRelease(req)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold shadow-sm"
                                        >
                                            <Hand className="w-3 h-3" /> Release Items
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => handleDeleteRequest(req.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Request"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-32 text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-medium">No requests match your filter.</p>
                </div>
            )}
        </div>

        {/* View Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Info className="w-5 h-5" /></div>
                            <h3 className="font-bold text-gray-800 text-lg">Request Overview</h3>
                        </div>
                        <button onClick={() => setSelectedRequest(null)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Borrower Info</div>
                                <p className="font-bold text-gray-800 text-lg">{selectedRequest.borrowerName}</p>
                                <p className="text-sm text-gray-500 font-medium">{selectedRequest.borrowerId}</p>
                                <p className="text-xs text-blue-600 truncate">{selectedRequest.borrowerEmail || 'No email provided'}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
                                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Lab Reservation</div>
                                {selectedRequest.reservationSlot ? (
                                    <>
                                        <p className="font-bold text-blue-800 text-lg">{selectedRequest.reservationDate ? new Date(selectedRequest.reservationDate).toLocaleDateString() : 'Unspecified'}</p>
                                        <p className="text-sm text-blue-600 font-medium">{selectedRequest.reservationSlot}</p>
                                    </>
                                ) : <p className="text-sm text-gray-400 italic py-4">No reservation requested</p>}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><Tag className="w-4 h-4 text-gray-400" /> Requested Items</h4>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                        <tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-center">Qty</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedRequest.items.map((item, i) => (
                                            <tr key={i} className="bg-white">
                                                <td className="px-4 py-3 font-medium text-gray-700">{item.itemName}</td>
                                                <td className="px-4 py-3 text-center font-bold text-blue-600">{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                        <button onClick={() => handlePrintSlip(selectedRequest)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-white text-gray-700 font-bold text-sm transition-all shadow-sm"><Printer className="w-4 h-4" /> Print Permit</button>
                        <button onClick={() => setSelectedRequest(null)} className="px-8 py-2 bg-gray-800 text-white rounded-xl font-bold text-sm shadow-md">Close</button>
                    </div>
                </div>
            </div>
        )}

        {/* Formal Documentation Modal */}
        {agreementRequest && settings && (
          <BorrowerAgreementModal 
            request={agreementRequest} 
            onClose={() => setAgreementRequest(null)} 
            appName={settings.appName} 
            logoUrl={settings.logoUrl}
            labInCharge={settings.labInCharge}
          />
        )}

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
