import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Category } from '../types';
import * as storage from '../services/storageService';
import { 
  Upload, Save, CheckCircle, Plus, Trash2, Edit2, X, Loader2, Type, Lock, 
  User, Eye, EyeOff, Mail, Server, FileCode, Key, Users, Send, 
  ExternalLink, Copy, Code, Zap, Clock, AlertTriangle, Link as LinkIcon, MailCheck, Database
} from 'lucide-react';

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
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const SCHEMA_CODE = `-- 1. Add Lab In-Charge to Settings Table
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "labInCharge" TEXT;

-- 2. Add Instructor/Supervisor to Borrow Requests Table
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS "instructorName" TEXT;`;

  const GAS_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type === 'ping') {
       return ContentService.createTextOutput(JSON.stringify({result: 'success', message: 'Connection Active'}))
              .setMimeType(ContentService.MimeType.JSON);
    }
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
}`;

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { setCategories(await storage.getCategories()); };
  useEffect(() => { setFormData(settings); }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleTestConnection = async () => {
      if (!formData.googleAppsScriptUrl) { alert("Please enter a deployment URL first."); return; }
      setIsTestingConnection(true);
      try {
          await fetch(formData.googleAppsScriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ type: 'ping' }) });
          alert("Connection trigger sent!");
      } catch (e) { alert("Connection failed."); } finally { setIsTestingConnection(false); }
  };

  const handleSendTestEmail = async () => {
    if (!formData.googleAppsScriptUrl || !formData.notificationEmails) { alert("Script URL and Recipient Emails are required."); return; }
    setIsSendingTestEmail(true);
    try {
        const recipients = formData.notificationEmails.split(',')[0].trim();
        await fetch(formData.googleAppsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ to_email: recipients, subject: "🧪 SciLab Connection Test", body: "Automation Working!", app_name: formData.appName })
        });
        alert(`Test email sent to: ${recipients}`);
    } catch (e) { alert("Failed to send test email."); } finally { setIsSendingTestEmail(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsSaving(true);
    setTimeout(async () => {
        try { await onSave(formData); setSaved(true); setTimeout(() => setSaved(false), 3000); } 
        catch (error) { alert("Failed to save settings."); } finally { setIsSaving(false); }
    }, 100);
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); alert("Code copied!"); };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await storage.addCategory(newCategory.trim());
    await loadCategories();
    setNewCategory('');
  };

  const CardStyle = "bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden";

  return (
    <div className="space-y-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                          <input type="text" name="appName" value={formData.appName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Laboratory In-Charge</label>
                          <input type="text" name="labInCharge" value={formData.labInCharge || ''} onChange={handleChange} placeholder="e.g. Prof. Einstein" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm font-semibold" />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text</label>
                        <input type="text" name="customFooterText" value={formData.customFooterText || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                        <div className="flex items-center gap-2 text-blue-800 font-bold mb-2"><Database className="w-4 h-4" /><h4>Database Migration</h4></div>
                        <div className="relative group">
                            <pre className="bg-slate-900 text-blue-300 p-4 rounded-lg text-[10px] font-mono overflow-x-auto">{SCHEMA_CODE}</pre>
                            <button type="button" onClick={() => copyCode(SCHEMA_CODE)} className="absolute right-2 top-2 p-1.5 bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all font-bold">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Save Settings
                        </button>
                    </div>
                </form>
            </div>
        )}

        {activeTab === 'categories' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <h3 className="text-xl font-bold text-gray-800 mb-6">Equipment Categories</h3>
                <div className="space-y-6">
                    <div className="flex gap-2">
                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none" />
                        <button onClick={handleAddCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold">Add</button>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {categories.map(cat => (
                                <li key={cat.id} className="px-6 py-4 flex justify-between items-center group bg-white hover:bg-gray-50">
                                    <span className="font-medium text-gray-700">{cat.name}</span>
                                    {!cat.isDefault && <button onClick={() => storage.deleteCategory(cat.id).then(loadCategories)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'automation' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-8">Gmail & Sync Automation</h3>
                <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900 shadow-sm">
                        <h4 className="font-bold flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-600"/> Setup Guide</h4>
                        <div className="space-y-4 text-sm">
                            <p>Web applications cannot send emails directly from the browser. We use <strong>Google Apps Script</strong> as a bridge.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                                <div className="space-y-2">
                                    <h5 className="font-bold text-amber-800">1. Setup Script</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-amber-700">
                                        <li>Visit <a href="https://script.google.com" target="_blank" className="text-indigo-600 underline font-bold">Google Scripts</a></li>
                                        <li>Create a "New Project"</li>
                                        <li>Copy the code block below into the editor</li>
                                        <li>Save and click <strong>"Deploy &gt; New Deployment"</strong></li>
                                    </ol>
                                </div>
                                <div className="space-y-2">
                                    <h5 className="font-bold text-amber-800">2. Configure Access</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-amber-700">
                                        <li>Select Type: <strong>Web App</strong></li>
                                        <li>Execute as: <strong>Me</strong></li>
                                        <li>Who has access: <strong>Anyone</strong></li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center"><h4 className="font-bold text-gray-800">Script Code</h4><button type="button" onClick={() => copyCode(GAS_CODE)} className="px-3 py-1.5 bg-gray-100 rounded text-xs font-bold">Copy Code</button></div>
                        <pre className="bg-slate-900 text-green-400 p-8 rounded-2xl text-[11px] font-mono overflow-x-auto">{GAS_CODE}</pre>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;