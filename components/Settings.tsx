import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Category } from '../types';
import * as storage from '../services/storageService';
import { Upload, Save, CheckCircle, Plus, Trash2, Edit2, X, Loader2, Type, Lock, User, Eye, EyeOff, Mail, Server, FileCode, Key, Users, Send, ExternalLink, Copy, Code } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

// Helper for image compression
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
        if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
        }
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
    
    // Support both plain text and HTML bodies
    var body = data.body || "New request received."; 
    var htmlBody = data.html_body;

    var options = {
      name: appName // Sender Name
    };

    if (htmlBody) {
      options.htmlBody = htmlBody;
    }

    if (to) {
      GmailApp.sendEmail(to, subject, body, options);
    }
    
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
      const cats = await storage.getCategories();
      setCategories(cats);
  };

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

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
        const maxWidth = 400; 
        const quality = 0.8; 
        const compressedDataUrl = await processImage(file, maxWidth, quality);
        setFormData(prev => ({ ...prev, logoUrl: compressedDataUrl }));
    } catch (error) {
        console.error("Image processing failed:", error);
        alert("Failed to process image.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRemoveImage = () => {
      setFormData(prev => ({ ...prev, logoUrl: undefined }));
      setSaved(false);
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
        } catch (error: any) {
            console.error(error);
            alert("Failed to save settings. " + error.message);
        } finally {
            setIsSaving(false);
        }
    }, 100);
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(GAS_CODE);
    alert("Code copied to clipboard!");
  };

  const handleTestEmail = async () => {
      const { googleAppsScriptUrl, notificationEmails, recoveryEmail, appName } = formData;
      
      if (!googleAppsScriptUrl) {
          alert("Please provide the Google Apps Script Web App URL first.");
          return;
      }
      
      const recipient = notificationEmails?.split(',')[0].trim() || recoveryEmail;
      if (!recipient) {
          alert("Please enter a Notification Email or Recovery Email to receive the test.");
          return;
      }

      setIsProcessing(true);
      try {
          // Send raw text body to avoid CORS preflight issues with application/json
          await fetch(googleAppsScriptUrl, {
              method: 'POST',
              mode: 'no-cors', // Important for GAS interaction from browser
              headers: {
                  'Content-Type': 'text/plain'
              },
              body: JSON.stringify({
                  to_email: recipient,
                  subject: `Test Connection - ${appName}`,
                  body: "This is a test email to verify your Google Apps Script connection is working correctly.",
                  html_body: "<h3>Test Successful</h3><p>Your Google Apps Script connection is working correctly.</p><p>This email confirms that the <strong>HTML</strong> functionality is active.</p>",
                  app_name: appName
              })
          });
          
          alert(`Test request sent! Check ${recipient} in a few moments. If no email arrives, check your Script deployment settings.`);
      } catch (e: any) {
          console.error(e);
          alert("Request failed: " + (e.message || "Unknown error"));
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
        await storage.addCategory(newCategory.trim());
        await loadCategories();
        setNewCategory('');
    } catch (e) {
        alert("Failed to add category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
      if (window.confirm("Are you sure? Items with this category will remain but the category option will be removed from new entries.")) {
          await storage.deleteCategory(id);
          await loadCategories();
      }
  };

  const handleUpdateCategory = async () => {
      if (!editingCategory || !editingCategory.name.trim()) return;
      await storage.updateCategory(editingCategory.id, editingCategory.name.trim());
      await loadCategories();
      setEditingCategory(null);
  };

  const CardStyle = "bg-white border border-gray-200 rounded-xl shadow-lg";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`${CardStyle} p-8 h-fit`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">General Settings</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                  <input type="text" name="appName" value={formData.appName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500" placeholder="e.g. STE Lab System" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text</label>
                  <div className="relative">
                      <input type="text" name="customFooterText" value={formData.customFooterText || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500" placeholder="e.g. Property of Leon National High School" />
                      <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Header Logo</label>
                  <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                      {isProcessing ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : formData.logoUrl ? <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs text-center px-2">No Logo</span>}
                      </div>
                      <div className="space-y-2">
                          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={isProcessing} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"><Upload className="w-4 h-4" /><span>Upload New Logo</span></button>
                          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                          {formData.logoUrl && !isProcessing && <button type="button" onClick={handleRemoveImage} className="text-sm text-red-500 hover:text-red-700 block">Remove Logo</button>}
                      </div>
                  </div>
                </div>

                {/* Admin Credentials */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-500" />Admin Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <div className="relative">
                            <input type="text" name="adminUsername" value={formData.adminUsername || 'admin'} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <input type={showAdminPassword ? "text" : "password"} name="adminPassword" value={formData.adminPassword || 'admin123'} onChange={handleChange} className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                      </div>
                  </div>
                  <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recovery Email</label>
                      <div className="relative">
                          <input type="email" name="recoveryEmail" value={formData.recoveryEmail || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      </div>
                  </div>
                </div>

                {/* Google Apps Script Integration */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-bold text-gray-800 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500" />Direct Gmail (via Apps Script)</h4>
                  </div>
                  
                  {/* Setup Guide */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 text-sm text-blue-800 leading-relaxed">
                    <p className="font-bold flex items-center gap-1 mb-2"><ExternalLink className="w-3 h-3"/> Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1 text-blue-700 text-xs">
                        <li>Go to <a href="https://script.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">script.google.com</a> and create a <strong>New Project</strong>.</li>
                        <li>Paste the code below into the script editor (replace existing code).</li>
                        <li>Click <strong>Deploy</strong> &gt; <strong>New deployment</strong>.</li>
                        <li>Select type: <strong>Web app</strong>.</li>
                        <li>Set <strong>Who has access</strong> to <strong>"Anyone"</strong> (Required).</li>
                        <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong> below.</li>
                    </ol>
                    
                    <div className="mt-3 relative">
                        <pre className="bg-slate-800 text-green-400 p-3 rounded-md text-[10px] overflow-x-auto font-mono custom-scrollbar border border-slate-700">
                            {GAS_CODE}
                        </pre>
                        <button 
                            type="button" 
                            onClick={copyCodeToClipboard}
                            className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                            title="Copy Code"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Web App URL</label>
                        <div className="relative">
                            <input type="text" name="googleAppsScriptUrl" value={formData.googleAppsScriptUrl || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-xs" placeholder="https://script.google.com/macros/s/..." />
                            <Code className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      
                      {/* Notification Recipients */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notification Recipients</label>
                        <div className="relative">
                            <input type="text" name="notificationEmails" value={formData.notificationEmails || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900" placeholder="admin@school.edu, teacher@school.edu" />
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Comma-separated email addresses to be notified when a new request is submitted.</p>
                      </div>

                      <div className="pt-2">
                        <button 
                            type="button" 
                            onClick={handleTestEmail}
                            disabled={isProcessing || !formData.googleAppsScriptUrl}
                            className="text-sm flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 font-medium disabled:opacity-50"
                        >
                             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                             Test Connection
                        </button>
                      </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button type="submit" disabled={isSaving || isProcessing} className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-medium ${isSaving || isProcessing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-md`}>
                    {(isSaving || isProcessing) ? <Loader2 className="w-4 h-4 animate-spin" /> : (saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                    <span>{isProcessing ? 'Processing...' : (isSaving ? 'Saving...' : (saved ? 'Saved!' : 'Save Settings'))}</span>
                </button>
                </div>
            </form>
        </div>

        {/* Category Management */}
        <div className={`${CardStyle} p-8 h-fit`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Manage Categories</h3>
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500" />
                    <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"><Plus className="w-5 h-5" /></button>
                </div>
                <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(cat => (
                        <li key={cat.id} className="py-3 flex justify-between items-center group">
                            {editingCategory?.id === cat.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input type="text" value={editingCategory.name} onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})} className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900" autoFocus />
                                    <button onClick={handleUpdateCategory} className="text-green-600 hover:text-green-800"><CheckCircle className="w-4 h-4"/></button>
                                    <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-gray-700">{cat.name}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingCategory({id: cat.id, name: cat.name})} className="text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );
};

export default Settings;