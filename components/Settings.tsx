
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

  // Updated SQL Schema Snippet to include all recent field additions
  const SCHEMA_CODE = `-- 1. Add Lab In-Charge to Settings Table
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS "labInCharge" TEXT;

-- 2. Add Instructor/Supervisor to Borrow Requests Table
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS "instructorName" TEXT;`;

  const GAS_CODE = `function doPost(e) {
  // This script handles email sending for SciLab Inventory
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Check if this is a test ping
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
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
           .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: error.toString()}))
           .setMimeType(ContentService.MimeType.JSON);
  }
}

function performDailyMaintenance() {
  // Maintenance Logic
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
      if (!formData.googleAppsScriptUrl) {
          alert("Please enter a deployment URL first.");
          return;
      }
      setIsTestingConnection(true);
      try {
          await fetch(formData.googleAppsScriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ type: 'ping' })
          });
          alert("Connection trigger sent! Check your Google Script logs to confirm.");
      } catch (e) {
          alert("Connection failed. Check URL and Web App permissions.");
      } finally {
          setIsTestingConnection(false);
      }
  };

  const handleSendTestEmail = async () => {
    if (!formData.googleAppsScriptUrl || !formData.notificationEmails) {
        alert("Script URL and Recipient Emails are required to send a test.");
        return;
    }
    
    setIsSendingTestEmail(true);
    try {
        const recipients = formData.notificationEmails.split(',')[0].trim();
        const testPayload = {
            to_email: recipients,
            subject: "🧪 SciLab Connection Test",
            body: `This is a test email from your Laboratory Inventory System (${formData.appName}). If you are reading this, your Gmail Automation is successfully configured!`,
            html_body: `<div style="font-family: sans-serif; padding: 20px; border: 2px solid #2005A2; border-radius: 12px; text-align: center;">
                <h2 style="color: #2005A2;">Connection Successful!</h2>
                <p>This is a test email confirming that your Google Apps Script integration is working correctly.</p>
                <div style="background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 12px; color: #64748b;">
                    Sent from: ${formData.appName}
                </div>
            </div>`,
            app_name: formData.appName
        };

        await fetch(formData.googleAppsScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(testPayload)
        });
        alert(`Test email sent to: ${recipients}. Please check your inbox (and spam folder).`);
    } catch (e) {
        alert("Failed to send test email. Verify your Script URL and internet connection.");
    } finally {
        setIsSendingTestEmail(false);
    }
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                          <input type="text" name="appName" value={formData.appName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Laboratory In-Charge (Permit Signatory)</label>
                          <input type="text" name="labInCharge" value={formData.labInCharge || ''} onChange={handleChange} placeholder="e.g. Prof. Albert Einstein" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm font-semibold" />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text</label>
                        <input type="text" name="customFooterText" value={formData.customFooterText || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Header Logo</label>
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 shadow-inner">
                                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs">No Logo</span>}
                            </div>
                            <button type="button" onClick={() => logoInputRef.current?.click()} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"><Upload className="w-4 h-4 inline mr-2"/>Upload</button>
                            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                        <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                            <Database className="w-4 h-4" />
                            <h4 className="text-sm">Database Schema Migration</h4>
                        </div>
                        <p className="text-xs text-blue-600 mb-3">Run these SQL commands in your Supabase SQL Editor to support Laboratory In-Charge and Instructor tracking:</p>
                        <div className="relative group">
                            <pre className="bg-slate-900 text-blue-300 p-4 rounded-lg text-[10px] font-mono overflow-x-auto shadow-inner leading-relaxed">
                                {SCHEMA_CODE}
                            </pre>
                            <button type="button" onClick={() => copyCode(SCHEMA_CODE)} className="absolute right-2 top-2 p-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400" /> Security Credentials</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Admin Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" name="adminUsername" value={formData.adminUsername || 'admin'} onChange={handleChange} className="w-full pl-10 px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="Username" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Admin Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type={showAdminPassword ? "text" : "password"} name="adminPassword" value={formData.adminPassword || 'admin123'} onChange={handleChange} className="w-full pl-10 px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="Password" />
                                    <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all font-bold">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            Save All Settings
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
                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter category name (e.g., Robotics)" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                        <button onClick={handleAddCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5"/> Add
                        </button>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {categories.map(cat => (
                                <li key={cat.id} className="px-6 py-4 flex justify-between items-center group bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="font-medium text-gray-700">{cat.name}</span>
                                        {cat.isDefault && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full font-bold">System Default</span>}
                                    </div>
                                    {!cat.isDefault && (
                                        <button onClick={() => storage.deleteCategory(cat.id).then(loadCategories)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'automation' && (
            <div className={`${CardStyle} p-8 animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Gmail & Sync Automation</h3>
                        <p className="text-sm text-gray-500">Manage email notifications and background maintenance tasks.</p>
                    </div>
                    <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 shadow-inner">
                        <Zap className="w-8 h-8" />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold border-b border-indigo-50 pb-3">
                            <Server className="w-5 h-5" />
                            <h4>Service Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Google Apps Script Web App URL</label>
                                <p className="text-xs text-gray-400 mb-2">The endpoint created from your Google Script project. Ensure it's deployed as a Web App.</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            name="googleAppsScriptUrl" 
                                            value={formData.googleAppsScriptUrl || ''} 
                                            onChange={handleChange} 
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-indigo-900 bg-gray-50/30" 
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={handleTestConnection}
                                            disabled={isTestingConnection}
                                            className="flex-1 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold whitespace-nowrap"
                                            title="Send a silent ping to verify connectivity"
                                        >
                                            {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                            Test Link
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleSendTestEmail}
                                            disabled={isSendingTestEmail}
                                            className="flex-1 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl border border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center gap-2 text-sm font-bold whitespace-nowrap"
                                            title="Send a real test email to the first recipient"
                                        >
                                            {isSendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin"/> : <MailCheck className="w-4 h-4" />}
                                            Send Test Email
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notification Recipients</label>
                                <p className="text-xs text-gray-400 mb-2">Emails that will receive alerts for new student borrow requests. Separate with commas.</p>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="notificationEmails" 
                                        value={formData.notificationEmails || ''} 
                                        onChange={handleChange} 
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" 
                                        placeholder="admin@school.edu, technician@school.edu"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900 shadow-sm">
                        <h4 className="font-bold flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-amber-600"/> Setup Guide</h4>
                        <div className="space-y-4 text-sm">
                            <p>Web applications cannot send emails directly from the browser. We use <strong>Google Apps Script</strong> to bridge the gap.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                                <div className="space-y-2">
                                    <h5 className="font-bold text-amber-800">1. Setup Script</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-amber-700">
                                        <li>Visit <a href="https://script.google.com" target="_blank" className="text-indigo-600 underline font-bold">Google Scripts</a></li>
                                        <li>Create a "New Project"</li>
                                        <li>Copy the code block below into the editor</li>
                                        <li>Save and click <strong>"Deploy > New Deployment"</strong></li>
                                    </ol>
                                </div>
                                <div className="space-y-2">
                                    <h5 className="font-bold text-amber-800">2. Configure Access</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-amber-700">
                                        <li>Select Type: <strong>Web App</strong></li>
                                        <li>Execute as: <strong>Me</strong></li>
                                        <li>Who has access: <strong>Anyone</strong></li>
                                        <li>Authorize permissions and copy the <strong>Web App URL</strong></li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Code className="w-5 h-5 text-gray-400" />
                                Script Project Code
                            </h4>
                            <button type="button" onClick={() => copyCode(GAS_CODE)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 text-gray-600">
                                <Copy className="w-3.5 h-3.5" /> Copy Code
                            </button>
                        </div>
                        <div className="relative group">
                            <pre className="bg-slate-900 text-green-400 p-8 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                                {GAS_CODE}
                            </pre>
                        </div>
                    </div>

                    <div className="pt-6 border-t flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 text-green-700 rounded-xl shadow-inner">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Maintenance Logic Ready</p>
                                <p className="text-xs text-gray-500">The app will automatically sync overdue items whenever an admin logs in.</p>
                            </div>
                        </div>
                        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-bold flex items-center gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            Apply Automation Changes
                        </button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default Settings;
