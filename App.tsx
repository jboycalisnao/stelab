import React, { useState, useEffect, useCallback } from 'react';
import { InventoryItem, BorrowRecord, AppSettings, Category, BorrowRequest } from './types';
import * as storage from './services/storageService';
import * as sync from './services/syncService';
import { supabase, checkConnection } from './supabaseClient';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import LendingList from './components/LendingList';
import InventoryForm from './components/InventoryForm';
import QRCodeModal from './components/QRCodeModal';
import BulkBarcodeModal from './components/BulkBarcodeModal';
import BorrowModal from './components/BorrowModal';
import ReturnModal from './components/ReturnModal';
import Settings from './components/Settings';
import Login from './components/Login';
import Scanner from './components/Scanner';
import RequestsList from './components/RequestsList';
import ConfirmModal from './components/ConfirmModal';
import { getUserStatusUpdateTemplate } from './services/emailTemplates';
import { LayoutDashboard, List, Plus, FlaskConical, HandPlatter, Settings as SettingsIcon, LogOut, ScanLine, Inbox, RefreshCw, Cloud, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Establishing Cloud Link...");
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  
  const [view, setView] = useState<'dashboard' | 'inventory' | 'lending' | 'scanner' | 'settings' | 'requests'>('dashboard');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [qrItem, setQrItem] = useState<InventoryItem | undefined>(undefined);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | undefined>(undefined);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [preSelectedBorrowItem, setPreSelectedBorrowItem] = useState<InventoryItem | undefined>(undefined);
  const [borrowSpecificId, setBorrowSpecificId] = useState<string | undefined>(undefined);
  const [returnModalState, setReturnModalState] = useState<{ isOpen: boolean; record?: BorrowRecord; item?: InventoryItem }>({ isOpen: false });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false });

  const refreshData = useCallback(async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
          if (!silent) setLoadingStatus("Checking Cloud Integrity...");
          const connected = await checkConnection();
          setIsDbConnected(connected);

          if (!connected) {
              if (!silent) setLoadingStatus("Database Connection Failure");
              // We do not throw here, we just set the state so the UI can handle it gracefully
              setIsLoading(false);
              return false;
          }

          if (!silent) setLoadingStatus("Pulling Live Configuration...");
          const loadedSettings = await storage.getSettings();
          setSettings(loadedSettings);

          if (!silent) setLoadingStatus("Synchronizing State...");
          const [loadedItems, loadedRecords, loadedCats, loadedRequests] = await Promise.all([
              storage.getInventory(),
              storage.getBorrowRecords(),
              storage.getCategories(),
              storage.getBorrowRequests()
          ]);
          
          setItems(loadedItems);
          setBorrowRecords(loadedRecords);
          setCategories(loadedCats);
          setRequests(loadedRequests);
          setLastSynced(new Date());
          
          if (!silent) setLoadingStatus("Ready");
          return true;
      } catch (e: any) {
          console.error("Critical Cloud Failure", e);
          setIsDbConnected(false);
          if (!silent) setIsLoading(false);
          return false;
      } finally {
          if (!silent) setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('scilab_auth');
    if (auth === 'true') setIsAuthenticated(true);
    
    refreshData(false)
      .then((success) => {
        if (success) {
            sync.performMaintenanceSync();
        }
        setTimeout(() => setIsFirstLoad(false), 800);
      });

    // Subscriptions only if database is present
    let channels: any[] = [];
    if (isDbConnected) {
        channels = [
            supabase.channel('public:inventory_items').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => refreshData(true).catch(() => {})).subscribe(),
            supabase.channel('public:borrow_records').on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_records' }, () => refreshData(true).catch(() => {})).subscribe(),
            supabase.channel('public:app_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => refreshData(true).catch(() => {})).subscribe(),
            supabase.channel('public:categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => refreshData(true).catch(() => {})).subscribe(),
            supabase.channel('public:borrow_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => refreshData(true).catch(() => {})).subscribe(),
        ];
    }

    const cleanupRefresh = sync.setupAutoRefresh(() => {
        if (isDbConnected) {
            refreshData(true).then((success) => {
                if (success) sync.performMaintenanceSync();
            }).catch(() => {});
        }
    }, 300000); // 5 min auto-refresh

    return () => {
        channels.forEach(ch => supabase.removeChannel(ch));
        cleanupRefresh();
    };
  }, [refreshData, isDbConnected]);

  // Reflect app name and logo in the browser tab (title + favicon)
  useEffect(() => {
    const name = (settings?.appName || 'SciLab Inventory Pro').trim();
    if (name) document.title = name;

    const logoUrl = settings?.logoUrl || '/favicon.svg';
    try {
      let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      const isSvg = typeof logoUrl === 'string' && logoUrl.includes('svg');
      link.type = isSvg ? 'image/svg+xml' : 'image/png';
      link.href = logoUrl;
    } catch (e) {
      console.warn('Failed to update favicon dynamically', e);
    }
  }, [settings]);

  const sendStatusUpdateEmail = async (borrowerEmail: string, borrowerName: string, status: 'Approved' | 'Released' | 'Rejected' | 'Returned', items: {name: string, qty: number}[], returnDate: string) => {
      if (!borrowerEmail || !settings?.googleAppsScriptUrl) return;

      try {
          const htmlBody = getUserStatusUpdateTemplate({
              borrowerName,
              referenceCode: "Active Record",
              status,
              returnDate,
              appName: settings.appName,
              items
          });

          const payload = {
              to_email: borrowerEmail,
              subject: `Update: Laboratory Equipment ${status}`,
              body: `Hello ${borrowerName}, your borrowed equipment status is now: ${status}.`,
              html_body: htmlBody,
              app_name: settings.appName
          };

          await fetch(settings.googleAppsScriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(payload)
          });
      } catch (e) {
          console.error("Failed to send status email", e);
      }
  };

  const AppBrand = () => (
      <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-3">
              {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 border border-gray-200" />
              ) : (
                  <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm">
                     <FlaskConical className="w-6 h-6" />
                  </div>
              )}
              <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-tight">{settings?.appName || 'SciLab Pro'}</h1>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isDbConnected ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {isDbConnected ? <Cloud className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isDbConnected ? 'Cloud Active' : 'Disconnected'}
          </div>
      </div>
  );

  const openBorrowModal = (item?: InventoryItem, sId?: string) => {
      setPreSelectedBorrowItem(item);
      setBorrowSpecificId(sId);
      setIsBorrowModalOpen(true);
  };

  const handleLogin = (status: boolean) => {
      if (status) {
          localStorage.setItem('scilab_auth', 'true');
          setIsAuthenticated(true);
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('scilab_auth');
      setIsAuthenticated(false);
      setView('dashboard');
  };

  const confirmAction = (title: string, message: string, action: () => void, isDestructive = false) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: () => { action(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }, isDestructive });
  };

  const handleSave = async (item: InventoryItem) => {
    const result = await storage.saveItem(item);
    if (result.success) {
        await refreshData(true).catch(() => {});
        setIsFormOpen(false);
        setEditingItem(undefined);
    } else {
        alert("Cloud Save Failed: " + (result.message || "Network Error"));
    }
  };

  const handleDelete = async (id: string) => {
    confirmAction("Delete Equipment", "Permanently remove this item from the cloud? This action is absolute.", async () => {
        await storage.deleteItem(id);
        await refreshData(true).catch(() => {});
    }, true);
  };

  const handleDeleteRecord = async (id: string) => {
      confirmAction(
        "Delete Loan Record",
        "Permanently remove this borrowing record? This will NOT restore inventory. Use Return if the item was physically returned.",
        async () => {
            await storage.deleteBorrowRecord(id);
            await refreshData(true).catch(() => {});
        },
        true
      );
  };

  const handleDeleteRecordsBulk = async (ids: string[]) => {
      confirmAction(
        "Delete Bulk Records",
        `Permanently delete ${ids.length} selected borrowing records?`,
        async () => {
            for (const id of ids) {
                await storage.deleteBorrowRecord(id);
            }
            await refreshData(true).catch(() => {});
        },
        true
      );
  };

  const handleBorrowConfirm = async (item: InventoryItem, bName: string, bId: string, qty: number, dDate: string, borrowerEmail?: string, sId?: string) => {
    const result = await storage.borrowItem(item.id, bName, bId, qty, dDate, borrowerEmail, sId);
    if (result.success) {
        await refreshData(true).catch(() => {});
        setIsBorrowModalOpen(false);
    } else {
        alert(result.message || "Failed to commit loan to cloud.");
    }
  };

  const initiateReturn = (recordId: string) => {
      const record = borrowRecords.find(r => r.id === recordId);
      if (!record) return;
      const item = items.find(i => i.id === record.itemId);
      setReturnModalState({ isOpen: true, record, item });
  };

  const handleReturnConfirm = async (details: any) => {
      const record = returnModalState.record;
      if (!record) return;
      
      const result = await storage.returnItem(record.id, details);
      if (result.success) {
          if (record.borrowerEmail) {
              await sendStatusUpdateEmail(
                  record.borrowerEmail,
                  record.borrowerName,
                  'Returned',
                  [{name: record.itemName, qty: record.quantity}],
                  new Date().toLocaleDateString()
              );
          }
          await refreshData(true).catch(() => {});
          setReturnModalState({ isOpen: false });
      } else {
          alert(result.message || "Failed to finalize return in cloud.");
      }
  };

  if (isFirstLoad) {
      return (
          <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0f172a] to-slate-900"></div>
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
                  <div className="mb-8 p-5 bg-gradient-to-tr from-white/10 to-white/5 rounded-2xl border border-white/20">
                    <FlaskConical className="w-16 h-16 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">{settings?.appName || 'SciLab Pro'}</h1>
                  <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest mb-10">Absolute Cloud Persistence</p>
                  <div className="w-full space-y-4">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-blue-200/60 font-mono">
                          <span>{loadingStatus}</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 w-full ${isDbConnected === false ? 'bg-red-500' : 'animate-pulse'}`}></div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (isDbConnected === false) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
              <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">System Disconnected</h2>
                  <p className="text-gray-500 mb-8">This application is strictly cloud-dependent. A connection to the Supabase database is required to proceed. Please check your internet or project status.</p>
                  <button onClick={() => refreshData(false).catch(() => {})} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5" /> Reconnect Now
                  </button>
              </div>
          </div>
      );
  }

  if (!isAuthenticated) return <Login appName={settings?.appName || 'SciLab Inventory'} logoUrl={settings?.logoUrl} settings={settings || undefined} onLogin={handleLogin} expectedUsername={settings?.adminUsername} expectedPassword={settings?.adminPassword} />;

  return (
    <div className="flex h-screen text-gray-800 bg-transparent">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-full shadow-xl z-20">
        <div className="p-6 border-b border-gray-100 flex-shrink-0"><AppBrand /></div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutDashboard className="w-5 h-5" /><span>Dashboard</span></button>
          <button onClick={() => setView('inventory')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'inventory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><List className="w-5 h-5" /><span>Inventory</span></button>
          <button onClick={() => setView('requests')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'requests' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><Inbox className="w-5 h-5" /><span>Requests</span></button>
          <button onClick={() => setView('scanner')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'scanner' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><ScanLine className="w-5 h-5" /><span>Scanner</span></button>
          <button onClick={() => setView('lending')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'lending' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><HandPlatter className="w-5 h-5" /><span>Lending</span></button>
          <button onClick={() => setView('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}><SettingsIcon className="w-5 h-5" /><span>Settings</span></button>
        </nav>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <div className="text-[9px] text-gray-400 font-mono mb-4 flex items-center gap-1 justify-center">
                <RefreshCw className={`w-2 h-2 ${isLoading ? 'animate-spin' : ''}`} />
                Last Cloud Update: {lastSynced.toLocaleTimeString()}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"><LogOut className="w-5 h-5" /><span>Log Out</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 p-4 md:hidden flex justify-between items-center sticky top-0 z-30 shadow-sm">
             <AppBrand />
             <div className="flex gap-2">
                 <button onClick={() => refreshData(true).catch(() => {})} className={`p-2 rounded-full text-gray-500 hover:bg-gray-100 ${isLoading ? 'animate-spin' : ''}`}><RefreshCw className="w-5 h-5"/></button>
                 <button onClick={handleLogout} className="p-2 text-red-500"><LogOut className="w-5 h-5"/></button>
             </div>
        </header>

        <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-gray-200 px-6 py-6 md:px-8 mb-6 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{view}</h2>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Live Cloud Data Source</p>
                    </div>
                    {view === 'inventory' && (
                        <button onClick={() => setIsFormOpen(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:scale-105 transition-all"><Plus className="w-5 h-5" /><span>Add Equipment</span></button>
                    )}
                </div>
            </div>

            <div className="px-6 md:px-8 pb-8">
                <div className="max-w-7xl mx-auto">
                    {view === 'dashboard' && <Dashboard items={items} borrowRecords={borrowRecords} />}
                    {view === 'inventory' && <InventoryList items={items} categories={categories} onEdit={(item) => { setEditingItem(item); setIsFormOpen(true); }} onDelete={handleDelete} onShowQR={setQrItem} onPrintBarcodes={setBarcodeItem} onBorrow={openBorrowModal} />}
                    {view === 'requests' && <RequestsList />}
                    {view === 'scanner' && <Scanner items={items} borrowRecords={borrowRecords} onBorrow={openBorrowModal} onReturn={initiateReturn} />}
                    {view === 'lending' && <LendingList records={borrowRecords} requests={requests} onReturn={initiateReturn} onReturnBulk={() => {}} onDelete={handleDeleteRecord} onDeleteBulk={handleDeleteRecordsBulk} />}
                    {view === 'settings' && settings && <Settings settings={settings} onSave={storage.saveSettings} />}
                </div>
            </div>
        </div>
      </main>

      {isFormOpen && <InventoryForm initialData={editingItem} categories={categories} onSubmit={handleSave} onCancel={() => { setIsFormOpen(false); setEditingItem(undefined); }} />}
      {qrItem && <QRCodeModal item={qrItem} onClose={() => setQrItem(undefined)} />}
      {barcodeItem && <BulkBarcodeModal item={barcodeItem} onClose={() => setBarcodeItem(undefined)} />}
      {isBorrowModalOpen && <BorrowModal availableItems={items} initialItem={preSelectedBorrowItem} specificId={borrowSpecificId} onConfirm={handleBorrowConfirm} onCancel={() => setIsBorrowModalOpen(false)} />}
      {returnModalState.isOpen && returnModalState.record && <ReturnModal record={returnModalState.record} item={returnModalState.item} onConfirm={handleReturnConfirm} onCancel={() => setReturnModalState({ isOpen: false })} />}
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} isDestructive={confirmModal.isDestructive} />
    </div>
  );
};

export default App;
