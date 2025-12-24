
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Category } from '../types';
import * as storage from '../services/storageService';
// Added AlertTriangle to imports to fix "Cannot find name 'AlertTriangle'" error
import { Upload, Save, CheckCircle, Plus, Trash2, Edit2, X, Loader2, Type, Lock, User, Eye, EyeOff, Mail, Server, FileCode, Key, Users, Send, ExternalLink, Copy, Code, Zap, Clock, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const processImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Failed to get canvas context")); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'automation'>('general');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const GAS_CODE = `function doPost(e) {
  // This script handles email sending for SciLab Inventory
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to_email;
    var subject = data.subject || ("Lab Request: " + (data.reference_code || "Unknown"));
    var appName = data.app_name || "Lab Inventory System";
    var body = data.body || "New request received."; 
    var htmlBody = data.html_body;
    var options = { name: appName };
    if (htmlBody) options.htmlBody = htmlBody;
    if (to) GmailApp.sendEmail(to, subject, body, options);
    return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ADD THIS TO YOUR SCRIPT PROJECT:
 * Automated Maintenance "Heartbeat"
 * Sets this to run on a 'Time-driven' trigger (Daily)
 */
function performDailyMaintenance() {
  const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; 
  const SUPABASE_KEY = "YOUR_SUPABASE_KEY_HERE";
  
  // 1. Fetch Overdue Loans directly from Supabase
  const today = new Date().toISOString().split('T')[0];
  const url = SUPABASE_URL + "/rest/v1/borrow_records?status=eq.Borrowed&dueDate=lt." + today;
  
  const response = UrlFetchApp.fetch(url, {
    "method": "get",
    "headers": {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    }
  });
  
  const overdueItems = JSON.parse(response.getContentText());
  
  if (overdueItems.length > 0) {
    // 2. Update them to 'Overdue' status in DB
    const ids = overdueItems.map(item => item.id);
    UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/borrow_records?id=in.(" + ids.join(',') + ")", {
      "method": "patch",
      "headers": {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      "payload": JSON.stringify({ "status": "Overdue" })
    });
    
    // 3. Send Summary Notification to Admin
    const adminEmail = "YOUR_ADMIN_EMAIL_HERE";
    GmailApp.sendEmail(adminEmail, "Daily Lab Maintenance: " + overdueItems.length + " Overdue Items Found", 
      "System identified " + overdueItems.length + " items past their due date today. Statuses have been updated in the system.");
  }
}`;

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { setCategories(await storage.getCategories()); };
  useEffect(() => { setFormData(settings); }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setSaved(false);
    try {
        const compressedDataUrl = await processImage(file, 400, 0.8);
        setFormData(prev => ({ ...prev, logoUrl: compressedDataUrl }));
    } catch (error) { alert("Failed to process image."); } finally { setIsProcessing(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsSaving(true);
    setSaved(false);
    setTimeout(async () => {
        try {
            await onSave(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error: any) { alert("Failed to save settings."); } finally { setIsSaving(false); }
    }, 100);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    alert("Code copied!");
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await storage.addCategory(newCategory.trim());
    await loadCategories();
    setNewCategory('');
  };

  const CardStyle = "bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden";

  return (
    <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-xl w-fit border border-gray-200">
            <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>General</button>
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Categories</button>
            <button onClick={() => setActiveTab('automation')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'automation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Automation</div>
            </button>
        </div>

        {activeTab === 'general' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <h3 className="text-xl font-bold text-gray-800 mb-6">General Settings</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                        <input type="text" name="appName" value={formData.appName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text</label>
                        <input type="text" name="customFooterText" value={formData.customFooterText || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Header Logo</label>
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs">No Logo</span>}
                            </div>
                            <button type="button" onClick={() => logoInputRef.current?.click()} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"><Upload className="w-4 h-4 inline mr-2"/>Upload</button>
                            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Credentials</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" name="adminUsername" value={formData.adminUsername || 'admin'} onChange={handleChange} className="px-4 py-2 border rounded-lg" placeholder="Username" />
                            <div className="relative">
                                <input type={showAdminPassword ? "text" : "password"} name="adminPassword" value={formData.adminPassword || 'admin123'} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" placeholder="Password" />
                                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-2.5">{showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        )}

        {activeTab === 'categories' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <h3 className="text-xl font-bold text-gray-800 mb-6">Equipment Categories</h3>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category..." className="flex-1 px-4 py-2 border rounded-lg" />
                        <button onClick={handleAddCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg"><Plus className="w-5 h-5"/></button>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {categories.map(cat => (
                            <li key={cat.id} className="py-3 flex justify-between items-center group">
                                <span className="text-gray-700">{cat.name}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                                    <button onClick={() => storage.deleteCategory(cat.id).then(loadCategories)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        )}

        {activeTab === 'automation' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Background Automation</h3>
                        <p className="text-sm text-gray-500">Perform maintenance checks even when you are offline.</p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
                        <h4 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4"/> How it works:</h4>
                        <p>Web apps cannot run while closed. To monitor the lab 24/7, we use <strong>Google Apps Script</strong> (which runs on Google's servers) to wake up once a day, check for overdue items, and send you an email alert.</p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800">1. Deployment Instructions</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2">
                            <li>Open <a href="https://script.google.com" target="_blank" className="text-blue-600 underline">Google Apps Script</a>.</li>
                            <li>Paste the code below into your existing project.</li>
                            <li>Replace <code className="bg-gray-100 px-1 rounded text-red-600">YOUR_SUPABASE_URL</code> and <code className="bg-gray-100 px-1 rounded text-red-600">KEY</code> with your project credentials.</li>
                            <li>Click the <strong>Alarm Clock Icon</strong> (Triggers) in the left sidebar.</li>
                            <li>Add a new trigger: <strong>performDailyMaintenance</strong> &gt; <strong>Time-driven</strong> &gt; <strong>Day timer</strong> (e.g., Midnight).</li>
                        </ol>
                    </div>

                    <div className="relative">
                        <div className="absolute top-2 right-2 z-10">
                            <button onClick={copyCode} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors" title="Copy Code">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <pre className="bg-slate-900 text-green-400 p-6 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                            {GAS_CODE}
                        </pre>
                    </div>

                    <div className="pt-4 border-t flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Maintenance Logic is Ready</p>
                            <p className="text-xs text-gray-500">The app will also perform a "Catch-up" audit whenever you log in.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;
