import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, Category } from '../types';
import * as storage from '../services/storageService';
import { Upload, Save, CheckCircle, Plus, Trash2, Edit2, X, Image as ImageIcon, Loader2, LayoutDashboard, Type, Lock, User, Eye, EyeOff, Mail, Server, FileCode, Key, AlertCircle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

// Helper for image compression (unchanged)
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
  const [showEmailJsKey, setShowEmailJsKey] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const dashboardBgInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'loginBackgroundUrl' | 'dashboardBackgroundUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSaved(false);

    try {
        const maxWidth = field === 'logoUrl' ? 400 : 1280; 
        const quality = field === 'logoUrl' ? 0.8 : 0.6; 
        const compressedDataUrl = await processImage(file, maxWidth, quality);
        setFormData(prev => ({ ...prev, [field]: compressedDataUrl }));
    } catch (error) {
        console.error("Image processing failed:", error);
        alert("Failed to process image.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRemoveImage = (field: 'logoUrl' | 'loginBackgroundUrl' | 'dashboardBackgroundUrl') => {
      setFormData(prev => ({ ...prev, [field]: undefined }));
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

  const CardGlass = "bg-white/70 backdrop-blur-xl border border-white/50 rounded-xl shadow-sm";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`${CardGlass} p-8 h-fit`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">General Settings</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                  <input type="text" name="appName" value={formData.appName} onChange={handleChange} className="w-full px-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 backdrop-blur-sm" placeholder="e.g. STE Lab System" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Footer Text</label>
                  <div className="relative">
                      <input type="text" name="customFooterText" value={formData.customFooterText || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 backdrop-blur-sm" placeholder="e.g. Property of Leon National High School" />
                      <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Header Logo</label>
                  <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 bg-white/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/50 shadow-inner">
                      {isProcessing ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : formData.logoUrl ? <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs text-center px-2">No Logo</span>}
                      </div>
                      <div className="space-y-2">
                          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={isProcessing} className="flex items-center space-x-2 px-4 py-2 border border-white/60 bg-white/40 rounded-lg hover:bg-white/60 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"><Upload className="w-4 h-4" /><span>Upload New Logo</span></button>
                          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logoUrl')} />
                          {formData.logoUrl && !isProcessing && <button type="button" onClick={() => handleRemoveImage('logoUrl')} className="text-sm text-red-500 hover:text-red-700 block">Remove Logo</button>}
                      </div>
                  </div>
                </div>

                {/* Login BG Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Login Background</label>
                  <div className="flex items-center space-x-6">
                      <div className="w-32 h-20 bg-white/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/50 bg-cover bg-center shadow-inner" style={{ backgroundImage: formData.loginBackgroundUrl && !isProcessing ? `url(${formData.loginBackgroundUrl})` : undefined }}>
                      {isProcessing ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : !formData.loginBackgroundUrl && <span className="text-gray-400 text-xs text-center px-2">No Image</span>}
                      </div>
                      <div className="space-y-2">
                          <button type="button" onClick={() => bgInputRef.current?.click()} disabled={isProcessing} className="flex items-center space-x-2 px-4 py-2 border border-white/60 bg-white/40 rounded-lg hover:bg-white/60 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"><ImageIcon className="w-4 h-4" /><span>Upload Login BG</span></button>
                          <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'loginBackgroundUrl')} />
                          {formData.loginBackgroundUrl && !isProcessing && <button type="button" onClick={() => handleRemoveImage('loginBackgroundUrl')} className="text-sm text-red-500 hover:text-red-700 block">Remove Background</button>}
                      </div>
                  </div>
                </div>

                {/* Dashboard BG Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Background</label>
                  <div className="flex items-center space-x-6">
                      <div className="w-32 h-20 bg-white/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/50 bg-cover bg-center shadow-inner" style={{ backgroundImage: formData.dashboardBackgroundUrl && !isProcessing ? `url(${formData.dashboardBackgroundUrl})` : undefined }}>
                      {isProcessing ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : !formData.dashboardBackgroundUrl && <span className="text-gray-400 text-xs text-center px-2">No Image</span>}
                      </div>
                      <div className="space-y-2">
                          <button type="button" onClick={() => dashboardBgInputRef.current?.click()} disabled={isProcessing} className="flex items-center space-x-2 px-4 py-2 border border-white/60 bg-white/40 rounded-lg hover:bg-white/60 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"><LayoutDashboard className="w-4 h-4" /><span>Upload Dash BG</span></button>
                          <input type="file" ref={dashboardBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'dashboardBackgroundUrl')} />
                          {formData.dashboardBackgroundUrl && !isProcessing && <button type="button" onClick={() => handleRemoveImage('dashboardBackgroundUrl')} className="text-sm text-red-500 hover:text-red-700 block">Remove Background</button>}
                      </div>
                  </div>
                </div>

                {/* Admin Credentials */}
                <div className="pt-4 border-t border-white/40">
                  <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-500" />Admin Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <div className="relative">
                            <input type="text" name="adminUsername" value={formData.adminUsername || 'admin'} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <input type={showAdminPassword ? "text" : "password"} name="adminPassword" value={formData.adminPassword || 'admin123'} onChange={handleChange} className="w-full pl-10 pr-10 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                      </div>
                  </div>
                  <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recovery Email</label>
                      <div className="relative">
                          <input type="email" name="recoveryEmail" value={formData.recoveryEmail || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      </div>
                  </div>
                </div>

                {/* EmailJS */}
                <div className="pt-4 border-t border-white/40">
                  <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500" />Email Service Configuration (EmailJS)</h4>
                  <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service ID</label>
                        <div className="relative">
                            <input type="text" name="emailJsServiceId" value={formData.emailJsServiceId || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Template ID</label>
                        <div className="relative">
                            <input type="text" name="emailJsTemplateId" value={formData.emailJsTemplateId || ''} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                            <FileCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Public Key</label>
                        <div className="relative">
                            <input type={showEmailJsKey ? "text" : "password"} name="emailJsPublicKey" value={formData.emailJsPublicKey || ''} onChange={handleChange} className="w-full pl-10 pr-10 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 backdrop-blur-sm" />
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <button type="button" onClick={() => setShowEmailJsKey(!showEmailJsKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showEmailJsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                      </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/30 flex items-center justify-end">
                <button type="submit" disabled={isSaving || isProcessing} className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-medium ${isSaving || isProcessing ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-md`}>
                    {(isSaving || isProcessing) ? <Loader2 className="w-4 h-4 animate-spin" /> : (saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                    <span>{isProcessing ? 'Processing...' : (isSaving ? 'Saving...' : (saved ? 'Saved!' : 'Save Settings'))}</span>
                </button>
                </div>
            </form>
        </div>

        {/* Category Management */}
        <div className={`${CardGlass} p-8 h-fit`}>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Manage Categories</h3>
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name..." className="flex-1 px-4 py-2 border border-white/60 bg-white/50 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 backdrop-blur-sm" />
                    <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"><Plus className="w-5 h-5" /></button>
                </div>
                <ul className="divide-y divide-gray-100/50 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
