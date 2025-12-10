

import React, { useState, useEffect } from 'react';
import { InventoryItem, BorrowRecord, AppSettings, Category } from './types';
import * as storage from './services/storageService';
import { supabase } from './supabaseClient';
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
import { LayoutDashboard, List, Plus, FlaskConical, HandPlatter, Settings as SettingsIcon, LogOut, ScanLine, Loader2, Inbox } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [view, setView] = useState<'dashboard' | 'inventory' | 'lending' | 'scanner' | 'settings' | 'requests'>('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [qrItem, setQrItem] = useState<InventoryItem | undefined>(undefined);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | undefined>(undefined);
  
  // Borrow Modal State
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [preSelectedBorrowItem, setPreSelectedBorrowItem] = useState<InventoryItem | undefined>(undefined);
  const [borrowSpecificId, setBorrowSpecificId] = useState<string | undefined>(undefined);

  // Return Modal State
  const [returnModalState, setReturnModalState] = useState<{ isOpen: boolean; record?: BorrowRecord; item?: InventoryItem }>({ isOpen: false });

  const refreshData = React.useCallback(async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
          const [loadedItems, loadedRecords, loadedSettings, loadedCats] = await Promise.all([
              storage.getInventory(),
              storage.getBorrowRecords(),
              storage.getSettings(),
              storage.getCategories()
          ]);
          setItems(loadedItems);
          setBorrowRecords(loadedRecords);
          setSettings(loadedSettings);
          setCategories(loadedCats);
      } catch (e) {
          console.error("Data Load Error", e);
      } finally {
          if (!silent) setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('scilab_auth');
    if (auth === 'true') {
        setIsAuthenticated(true);
    }
    refreshData();

    // Real-time Subscriptions
    const channels = [
        supabase.channel('public:inventory_items').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => refreshData(true)).subscribe(),
        supabase.channel('public:borrow_records').on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_records' }, () => refreshData(true)).subscribe(),
        supabase.channel('public:app_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => refreshData(true)).subscribe(),
        supabase.channel('public:categories').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => refreshData(true)).subscribe(),
        supabase.channel('public:borrow_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'borrow_requests' }, () => refreshData(true)).subscribe(),
    ];

    return () => {
        channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [refreshData]);

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
            setView('scanner');
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.title = settings.appName;
    const updateFavicon = (url: string) => {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = url;
    };
    if (settings.logoUrl) {
      updateFavicon(settings.logoUrl);
    } else {
      const defaultFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2'/%3E%3Cpath d='M8.5 2h7'/%3E%3Cpath d='M7 16h10'/%3E%3C/svg%3E";
      updateFavicon(defaultFavicon);
    }
  }, [settings]);

  const handleLogin = (status: boolean) => {
      if (status) {
          localStorage.setItem('scilab_auth', 'true');
          setIsAuthenticated(true);
          if (window.innerWidth < 768) {
              setView('scanner');
          }
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('scilab_auth');
      setIsAuthenticated(false);
      setView('dashboard');
  };

  const handleSave = async (item: InventoryItem) => {
    await storage.saveItem(item);
    // Refresh handled by subscription, but manual refresh ensures immediate local feedback if sub is slow
    await refreshData(true);
    setIsFormOpen(false);
    setEditingItem(undefined);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await storage.deleteItem(id);
      await refreshData(true);
    }
  };

  const handleBorrowConfirm = async (
      item: InventoryItem, 
      borrowerName: string, 
      borrowerId: string, 
      quantity: number, 
      dueDate: string, 
      specificId?: string
  ) => {
    const result = await storage.borrowItem(item.id, borrowerName, borrowerId, quantity, dueDate, specificId);
    if (result.success) {
        await refreshData(true);
        setIsBorrowModalOpen(false);
        setPreSelectedBorrowItem(undefined);
        setBorrowSpecificId(undefined);
    } else {
        alert(result.message || "Failed to borrow item.");
    }
  };

  const initiateReturn = (recordId: string) => {
      const record = borrowRecords.find(r => r.id === recordId);
      if (!record) return;
      const item = items.find(i => i.id === record.itemId);
      setReturnModalState({ isOpen: true, record, item });
  };

  const handleReturnConfirm = async (details: { good: number; defective: number; disposed: number }) => {
      if (!returnModalState.record) return;
      
      const result = await storage.returnItem(returnModalState.record.id, details);
      if (result.success) {
          await refreshData(true);
          setReturnModalState({ isOpen: false });
      } else {
          alert(result.message || "Failed to return item.");
      }
  };

  const handleBulkReturn = async (recordIds: string[]) => {
      if (window.confirm(`Confirm return of ${recordIds.length} selected items? (Assumes all items are returned in good condition)`)) {
          const result = await storage.returnItems(recordIds);
          if (result.success) {
              await refreshData(true);
          } else {
              alert("Failed to return items.");
          }
      }
  };

  const handleDeleteBorrowRecord = async (recordId: string) => {
      if (window.confirm("Are you sure you want to delete this history record? If the item is currently 'Borrowed', this will cancel the loan and restore stock count.")) {
          const result = await storage.deleteBorrowRecord(recordId);
          if (result.success) {
              await refreshData(true);
          } else {
              alert(result.message || "Failed to delete record.");
          }
      }
  };

  const handleBulkDeleteBorrowRecords = async (recordIds: string[]) => {
       if (window.confirm(`Delete ${recordIds.length} records? This action cannot be undone.`)) {
          const result = await storage.deleteBorrowRecords(recordIds);
           if (result.success) {
              await refreshData(true);
          } else {
              alert("Failed to delete records.");
          }
       }
  };

  const handleSettingsSave = async (newSettings: AppSettings) => {
      await storage.saveSettings(newSettings);
      await refreshData(true);
  };

  const handlePasswordReset = async (newPassword: string) => {
    if (settings) {
        const updatedSettings = { ...settings, adminPassword: newPassword };
        await storage.saveSettings(updatedSettings);
        setSettings(updatedSettings);
        await refreshData(true);
    }
  };

  const openAddForm = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const openBorrowModal = (item?: InventoryItem, specificId?: string) => {
    setPreSelectedBorrowItem(item);
    setBorrowSpecificId(specificId);
    setIsBorrowModalOpen(true);
  };

  // Loading State
  if (!settings) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-800">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p>Loading System...</p>
              </div>
          </div>
      );
  }

  const AppBrand = () => (
      <div className="flex items-center space-x-3">
          {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 border border-gray-200" />
          ) : (
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm">
                 <FlaskConical className="w-6 h-6" />
              </div>
          )}
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">{settings.appName}</h1>
      </div>
  );

  if (!isAuthenticated) {
      return (
          <Login 
            appName={settings.appName} 
            logoUrl={settings.logoUrl} 
            backgroundImageUrl={undefined}
            customFooterText={settings.customFooterText}
            expectedUsername={settings.adminUsername || 'admin'}
            expectedPassword={settings.adminPassword || 'admin123'}
            recoveryEmail={settings.recoveryEmail}
            settings={settings} 
            onLogin={handleLogin}
            onPasswordReset={handlePasswordReset}
          />
      );
  }

  return (
    <div className="flex h-screen text-gray-800 bg-transparent">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-full shadow-sm z-20">
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
           <AppBrand />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-5 h-5" /><span>Dashboard</span>
          </button>
          <button onClick={() => setView('inventory')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'inventory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <List className="w-5 h-5" /><span>Inventory List</span>
          </button>
          <button onClick={() => setView('requests')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'requests' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Inbox className="w-5 h-5" /><span>Requests</span>
          </button>
          <button onClick={() => setView('scanner')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'scanner' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ScanLine className="w-5 h-5" /><span>Scanner / ID</span>
          </button>
          <button onClick={() => setView('lending')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'lending' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <HandPlatter className="w-5 h-5" /><span>Lending / Borrow</span>
          </button>
          <button onClick={() => setView('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${view === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <SettingsIcon className="w-5 h-5" /><span>Settings</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
            {settings.customFooterText && <div className="text-[10px] text-gray-400 mb-4 text-center px-2 font-medium uppercase tracking-wide">{settings.customFooterText}</div>}
            <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium">
                <LogOut className="w-5 h-5" /><span>Log Out</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 md:hidden flex justify-between items-center flex-shrink-0 sticky top-0 z-30">
             <div className="flex items-center space-x-2">
                {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" /> : <div className="bg-blue-600 p-1.5 rounded-lg text-white"><FlaskConical className="w-5 h-5" /></div>}
                <span className="font-bold truncate max-w-[150px] text-gray-800">{settings.appName}</span>
             </div>
             {!isMobile ? (
                <div className="flex space-x-2">
                    <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><LayoutDashboard className="w-5 h-5"/></button>
                    <button onClick={() => setView('scanner')} className={`p-2 rounded ${view === 'scanner' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><ScanLine className="w-5 h-5"/></button>
                    <button onClick={() => setView('lending')} className={`p-2 rounded ${view === 'lending' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}><HandPlatter className="w-5 h-5"/></button>
                    <button onClick={handleLogout} className="p-2 rounded text-red-500"><LogOut className="w-5 h-5"/></button>
                </div>
             ) : (
                 <button onClick={handleLogout} className="p-2 rounded text-red-500/80 hover:bg-red-50"><LogOut className="w-5 h-5"/></button>
             )}
        </header>

        <div className="flex-1 overflow-y-auto">
            <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200/50 px-6 py-6 md:px-8 mb-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                    {view === 'dashboard' && 'Laboratory Overview'}
                    {view === 'inventory' && 'Equipment Inventory'}
                    {view === 'requests' && 'Borrow Requests'}
                    {view === 'scanner' && 'Scan Barcode / ID Search'}
                    {view === 'lending' && 'Borrowed Items'}
                    {view === 'settings' && 'System Configuration'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 font-medium">
                        {isLoading ? 'Loading data...' : 'Manage your science assets efficiently.'}
                    </p>
                </div>
                {view === 'inventory' && !isMobile && (
                    <button onClick={openAddForm} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md font-medium hover:scale-105">
                        <Plus className="w-5 h-5" /><span>Add Equipment</span>
                    </button>
                )}
                </div>
            </div>

            <div className="px-6 md:px-8 pb-8">
                <div className="max-w-7xl mx-auto">
                    {isLoading && items.length === 0 ? (
                        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
                    ) : (
                        <>
                            {view === 'dashboard' && !isMobile && <Dashboard items={items} />}
                            {view === 'inventory' && !isMobile && (
                                <InventoryList 
                                    items={items}
                                    categories={categories} 
                                    onEdit={openEditForm} 
                                    onDelete={handleDelete} 
                                    onShowQR={setQrItem}
                                    onPrintBarcodes={setBarcodeItem}
                                    onBorrow={(item) => openBorrowModal(item)}
                                />
                            )}
                            {view === 'requests' && !isMobile && (
                                <RequestsList />
                            )}
                            {view === 'scanner' && (
                                <Scanner 
                                    items={items}
                                    borrowRecords={borrowRecords}
                                    onBorrow={openBorrowModal}
                                    onReturn={initiateReturn}
                                />
                            )}
                            {view === 'lending' && !isMobile && (
                                <LendingList 
                                    records={borrowRecords}
                                    onReturn={initiateReturn}
                                    onReturnBulk={handleBulkReturn}
                                    onDelete={handleDeleteBorrowRecord}
                                    onDeleteBulk={handleBulkDeleteBorrowRecords}
                                />
                            )}
                            {view === 'settings' && !isMobile && (
                                <Settings 
                                    settings={settings}
                                    onSave={handleSettingsSave}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      </main>

      {isFormOpen && <InventoryForm initialData={editingItem} categories={categories} onSubmit={handleSave} onCancel={() => setIsFormOpen(false)} />}
      {qrItem && <QRCodeModal item={qrItem} onClose={() => setQrItem(undefined)} />}
      {barcodeItem && <BulkBarcodeModal item={barcodeItem} onClose={() => setBarcodeItem(undefined)} />}
      
      {isBorrowModalOpen && (
        <BorrowModal 
            availableItems={items} 
            initialItem={preSelectedBorrowItem} 
            specificId={borrowSpecificId} 
            onConfirm={handleBorrowConfirm} 
            onCancel={() => { setIsBorrowModalOpen(false); setBorrowSpecificId(undefined); }} 
        />
      )}
      
      {returnModalState.isOpen && returnModalState.record && (
          <ReturnModal
            record={returnModalState.record}
            item={returnModalState.item}
            onConfirm={handleReturnConfirm}
            onCancel={() => setReturnModalState({ isOpen: false })}
          />
      )}
    </div>
  );
};

export default App;