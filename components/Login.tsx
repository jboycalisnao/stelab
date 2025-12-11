

import React, { useState, useEffect } from 'react';
import { FlaskConical, Lock, User, AlertCircle, Eye, EyeOff, Mail, ArrowRight, ArrowLeft, KeyRound, Loader2, Send, ShoppingBag, Search, QrCode, MapPin, Activity, Box, Tag } from 'lucide-react';
import { AppSettings, BorrowRequest, InventoryItem } from '../types';
import * as storage from '../services/storageService';
import PublicRequestModal from './PublicRequestModal';
import { getCategoryColor, getCategoryIcon } from '../constants';

// Declare EmailJS global
declare global {
  interface Window {
    emailjs: any;
  }
}

interface LoginProps {
  appName: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  customFooterText?: string;
  expectedUsername?: string;
  expectedPassword?: string;
  recoveryEmail?: string;
  settings?: AppSettings; 
  onLogin: (status: boolean) => void;
  onPasswordReset?: (newPassword: string) => void;
}

const Login: React.FC<LoginProps> = ({ 
    appName, 
    logoUrl, 
    backgroundImageUrl, 
    customFooterText, 
    expectedUsername,
    expectedPassword,
    recoveryEmail,
    settings,
    onLogin,
    onPasswordReset
}) => {
  // Mode: 'landing' | 'admin' | 'reset' | 'item_view'
  const [viewMode, setViewMode] = useState<'landing' | 'admin' | 'reset' | 'item_view'>('landing');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Request State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<BorrowRequest | null | 'not_found'>(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);

  // Item View State
  const [publicItem, setPublicItem] = useState<InventoryItem | null>(null);
  const [isItemLoading, setIsItemLoading] = useState(false);

  // Forgot Password State
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [inputEmail, setInputEmail] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Check URL for reference code or item ID on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const viewItem = params.get('view_item');

    if (viewItem) {
        setViewMode('item_view');
        loadPublicItem(viewItem);
    } else if (ref) {
        setTrackCode(ref);
        // Automatically trigger search
        handleTrackRequest(undefined, ref);
    }
  }, []);

  const loadPublicItem = async (id: string) => {
      setIsItemLoading(true);
      const item = await storage.getInventoryItem(id);
      setPublicItem(item);
      setIsItemLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validUser = expectedUsername || 'admin';
    const validPass = expectedPassword || 'admin123';

    if (username === validUser && password === validPass) {
      onLogin(true);
    } else {
      setError('Invalid username or password');
    }
  };

  const handleTrackRequest = async (e?: React.FormEvent, codeOverride?: string) => {
      if (e) e.preventDefault();
      const code = codeOverride || trackCode;
      
      if (!code.trim()) return;
      
      setIsTrackLoading(true);
      setTrackResult(null);
      const res = await storage.getBorrowRequestByCode(code.trim().toUpperCase());
      setTrackResult(res || 'not_found');
      setIsTrackLoading(false);
  };

  // --- Reset Password Logic (Same as before) ---
  const sendOtpEmail = async (email: string, otp: string) => {
      if (!window.emailjs || !settings?.emailJsServiceId || !settings?.emailJsTemplateId || !settings?.emailJsPublicKey) {
          throw new Error("Email service not configured. Please contact administrator to configure EmailJS in Settings.");
      }
      await window.emailjs.send(
          settings.emailJsServiceId,
          settings.emailJsTemplateId,
          { to_email: email, otp: otp, to_name: 'Admin User' },
          settings.emailJsPublicKey
      );
  };

  const handleResetStep1 = async (e: React.FormEvent) => {
      e.preventDefault();
      setResetError('');
      const validEmail = recoveryEmail || 'admin@school.edu';
      if (inputEmail.trim().toLowerCase() === validEmail.toLowerCase()) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(otp);
          setIsSendingOtp(true);
          try {
              await sendOtpEmail(validEmail, otp);
              setResetStep(2);
          } catch (err: any) {
              setResetError(err.message || "Failed to send verification email.");
          } finally {
              setIsSendingOtp(false);
          }
      } else {
          setResetError('Email address does not match the recovery email on file.');
      }
  };

  const handleResetStep2 = (e: React.FormEvent) => {
      e.preventDefault();
      setResetError('');
      if (inputOtp === generatedOtp) setResetStep(3);
      else setResetError('Invalid verification code.');
  };

  const handleResetStep3 = (e: React.FormEvent) => {
      e.preventDefault();
      setResetError('');
      if (newPassword.length < 4) { setResetError('Password is too short.'); return; }
      if (newPassword !== confirmPassword) { setResetError('Passwords do not match.'); return; }
      if (onPasswordReset) {
          onPasswordReset(newPassword);
          setResetSuccess('Password updated successfully!');
          setTimeout(() => {
              setViewMode('admin');
              setResetStep(1);
              setResetSuccess('');
          }, 2000);
      }
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Approved': return 'text-green-600 bg-green-50 border-green-200';
          case 'Pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
          case 'Rejected': return 'text-maroon-600 bg-maroon-50 border-maroon-200';
          case 'Completed': return 'text-blue-600 bg-blue-50 border-blue-200';
          case 'Released': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
          case 'Returned': return 'text-teal-600 bg-teal-50 border-teal-200';
          default: return 'text-gray-600 bg-gray-50';
      }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      
      {/* Brand Header */}
      <div className="relative z-10 mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex justify-center mb-4">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl shadow-md bg-white p-2 border border-gray-100" />
            ) : (
                <div className="bg-blue-600 p-4 rounded-xl shadow-md text-white">
                    <FlaskConical className="w-12 h-12" />
                </div>
            )}
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">{appName}</h2>
        <p className="text-gray-500 mt-2 font-medium">Laboratory Equipment Inventory System</p>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        
        {viewMode === 'landing' && (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Main Content: Student Portal */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center items-center relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-maroon-50 to-transparent opacity-50"></div>
                    <div className="relative z-10 text-center space-y-8 w-full max-w-2xl">
                        <div>
                            <div className="bg-maroon-100/50 p-5 rounded-full inline-flex mb-4">
                                <ShoppingBag className="w-12 h-12 text-maroon-600" />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800">Student / Guest Portal</h3>
                            <p className="text-gray-500 mt-2 text-lg">Browse available equipment and submit borrow requests instantly.</p>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={() => setShowRequestModal(true)}
                                className="px-8 py-4 bg-maroon-600 hover:bg-maroon-700 text-white rounded-xl font-bold shadow-lg shadow-maroon-200 transition-all hover:scale-105 flex items-center gap-3 text-lg"
                            >
                                <ShoppingBag className="w-6 h-6" /> Start Request
                            </button>
                        </div>
                        
                        {/* Tracker Section */}
                        <div className="mt-10 pt-8 border-t border-gray-100 w-full max-w-md mx-auto">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-4">Already have a request?</p>
                            <form onSubmit={(e) => handleTrackRequest(e)} className="relative shadow-sm rounded-lg">
                                <input 
                                    type="text" 
                                    value={trackCode}
                                    onChange={(e) => setTrackCode(e.target.value)}
                                    placeholder="Enter Reference Code (e.g. REQ-1234)" 
                                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-maroon-500 outline-none transition-all"
                                />
                                <button type="submit" className="absolute right-2 top-2 bottom-2 p-2 text-gray-400 hover:text-maroon-600">
                                    {isTrackLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5" />}
                                </button>
                            </form>
                            
                            {/* Track Result */}
                            {trackResult && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                    {trackResult === 'not_found' ? (
                                        <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-600 text-sm flex items-center gap-2 justify-center font-medium">
                                            <AlertCircle className="w-4 h-4"/> Request not found
                                        </div>
                                    ) : (
                                        <div className={`p-4 rounded-lg border flex justify-between items-center bg-white shadow-sm`}>
                                            <div className="text-left">
                                                <div className="text-gray-900 font-bold">{trackResult.borrowerName}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">Ref: {trackResult.referenceCode}</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(trackResult.status)}`}>
                                                {trackResult.status === 'Released' ? 'Released (Active)' : (trackResult.status === 'Completed' || trackResult.status === 'Returned') ? 'Returned' : trackResult.status}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer: Admin Access */}
                <div className="py-4 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                    <button 
                        onClick={() => setViewMode('admin')}
                        className="text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                        <Lock className="w-3 h-3" /> Lab Admin Access
                    </button>
                </div>
            </div>
        )}

        {viewMode === 'item_view' && (
            <div className="flex-1 flex flex-col p-8 md:p-12 animate-in fade-in zoom-in duration-300">
                 <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
                    <button onClick={() => { setViewMode('landing'); window.history.replaceState({}, '', window.location.pathname); }} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm transition-colors mb-6 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Back to Portal
                    </button>

                    {isItemLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-maroon-600 animate-spin mb-4" />
                            <p className="text-gray-500">Loading Equipment Details...</p>
                        </div>
                    ) : publicItem ? (
                        <div className="space-y-8">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{publicItem.name}</h2>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                            {publicItem.category}
                                        </span>
                                        {publicItem.shortId && (
                                            <span className="px-3 py-1 rounded-full text-sm font-mono bg-blue-50 text-blue-700 border border-blue-100">
                                                ID: {publicItem.shortId}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div style={{ color: getCategoryColor(publicItem.category) }}>
                                        {getCategoryIcon(publicItem.category)}
                                    </div>
                                </div>
                            </div>

                            {/* Availability Card */}
                            <div className="bg-gradient-to-r from-maroon-50 to-white border border-maroon-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <Box className="w-5 h-5 text-maroon-600" />
                                    <h3 className="text-lg font-bold text-gray-800">Availability Status</h3>
                                </div>
                                {(() => {
                                    // Use Borrow Limit if defined
                                    const limit = publicItem.maxBorrowable !== undefined ? publicItem.maxBorrowable : publicItem.quantity;
                                    const available = Math.max(0, limit - (publicItem.borrowedQuantity || 0));
                                    const percentage = (available / limit) * 100;
                                    
                                    return (
                                        <>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-extrabold text-maroon-600">
                                                    {available}
                                                </span>
                                                <span className="text-lg text-gray-500 font-medium">
                                                    pieces available
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                                                <div 
                                                    className="bg-maroon-500 h-full rounded-full transition-all duration-500" 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 text-right">
                                                {publicItem.maxBorrowable !== undefined 
                                                    ? `Limited Stock (Total Inventory: ${publicItem.quantity} ${publicItem.unit || 'units'})`
                                                    : `Total in Inventory: ${publicItem.quantity} ${publicItem.unit || 'units'}`
                                                }
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                                        <MapPin className="w-4 h-4" /> Location
                                    </div>
                                    <p className="text-gray-600">{publicItem.location}</p>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                                        <Activity className="w-4 h-4" /> Condition
                                    </div>
                                    <p className="text-gray-600">{publicItem.condition}</p>
                                </div>
                            </div>

                            {/* Description */}
                            {publicItem.description && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2">Description</h4>
                                    <p className="text-gray-600 leading-relaxed bg-white p-4 border border-gray-100 rounded-xl">
                                        {publicItem.description}
                                    </p>
                                </div>
                            )}

                             {/* Safety Notes */}
                             {publicItem.safetyNotes && (
                                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> Safety Notes
                                    </h4>
                                    <p className="text-orange-700 text-sm leading-relaxed">
                                        {publicItem.safetyNotes}
                                    </p>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Item Not Found</h3>
                            <p className="text-gray-500 mt-2">The requested equipment could not be found or has been removed.</p>
                        </div>
                    )}
                 </div>
            </div>
        )}

        {viewMode === 'admin' && (
            <div className="w-full flex-1 p-8 sm:px-12 flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-300 bg-white">
                 <div className="w-full max-w-sm mx-auto">
                    <button onClick={() => setViewMode('landing')} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm transition-colors mb-8">
                        <ArrowLeft className="w-4 h-4" /> Back to Portal
                    </button>
                    
                    <h3 className="text-2xl font-bold text-gray-800 text-center mb-6">Admin Login</h3>
                    
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    placeholder="Username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1">
                                <button 
                                    type="button" 
                                    onClick={() => setViewMode('reset')}
                                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded flex items-center gap-2 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all transform active:scale-[0.99]"
                        >
                            Sign In
                        </button>
                    </form>
                 </div>
            </div>
        )}

        {viewMode === 'reset' && (
            <div className="w-full flex-1 p-8 sm:px-12 flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-300 bg-white">
                <div className="w-full max-w-sm mx-auto">
                    <button onClick={() => setViewMode('admin')} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </button>

                    <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">Recovery</h3>
                    
                    {/* Reset steps logic embedded here for brevity, reuse state from previous implementation */}
                    {resetStep === 1 && (
                        <form onSubmit={handleResetStep1} className="space-y-6 mt-6">
                            <p className="text-center text-gray-500 text-sm">Enter your recovery email to receive a code.</p>
                            <input
                                type="email"
                                required
                                value={inputEmail}
                                onChange={(e) => setInputEmail(e.target.value)}
                                className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                                placeholder="admin@school.edu"
                            />
                            {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                            <button type="submit" disabled={isSendingOtp} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold flex justify-center items-center gap-2 shadow-md">
                                {isSendingOtp && <Loader2 className="w-4 h-4 animate-spin"/>} Send Code
                            </button>
                        </form>
                    )}
                    
                    {resetStep === 2 && (
                        <form onSubmit={handleResetStep2} className="space-y-6 mt-6">
                            <p className="text-center text-gray-500 text-sm">Enter the 6-digit code sent to you.</p>
                            <input
                                type="text"
                                value={inputOtp}
                                onChange={(e) => setInputOtp(e.target.value)}
                                className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500"
                            />
                            {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md">Verify</button>
                        </form>
                    )}

                    {resetStep === 3 && (
                        <form onSubmit={handleResetStep3} className="space-y-6 mt-6">
                            {resetSuccess ? (
                                <div className="text-green-600 text-center font-bold">{resetSuccess}</div>
                            ) : (
                                <>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 mb-4 focus:ring-2 focus:ring-blue-500" />
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500" />
                                    {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                                    <button type="submit" className="w-full py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-md">Update Password</button>
                                </>
                            )}
                        </form>
                    )}
                 </div>
            </div>
        )}

      </div>
      
      {customFooterText && (
        <div className="absolute bottom-4 left-0 right-0 text-center z-0 px-4">
            <p className="text-gray-400 text-xs font-medium tracking-wide uppercase">
                {customFooterText}
            </p>
        </div>
      )}

      {showRequestModal && <PublicRequestModal onClose={() => setShowRequestModal(false)} />}
    </div>
  );
};

export default Login;