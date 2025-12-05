
import React, { useState } from 'react';
import { FlaskConical, Lock, User, AlertCircle, Eye, EyeOff, Mail, ArrowRight, ArrowLeft, KeyRound, Loader2, Send } from 'lucide-react';
import { AppSettings } from '../types';

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
  
  // EmailJS Settings passed from App.tsx (which gets them from storage/settings)
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
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1 = Email, 2 = OTP, 3 = New Pass
  const [inputEmail, setInputEmail] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

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

  const sendOtpEmail = async (email: string, otp: string) => {
      if (!window.emailjs || !settings?.emailJsServiceId || !settings?.emailJsTemplateId || !settings?.emailJsPublicKey) {
          throw new Error("Email service not configured. Please contact administrator to configure EmailJS in Settings.");
      }

      await window.emailjs.send(
          settings.emailJsServiceId,
          settings.emailJsTemplateId,
          {
              to_email: email,
              otp: otp,
              to_name: 'Admin User'
          },
          settings.emailJsPublicKey
      );
  };

  const handleResetStep1 = async (e: React.FormEvent) => {
      e.preventDefault();
      setResetError('');

      // Check against stored recovery email
      const validEmail = recoveryEmail || 'admin@school.edu';

      if (inputEmail.trim().toLowerCase() === validEmail.toLowerCase()) {
          // Generate OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(otp);
          setIsSendingOtp(true);

          try {
              // Try to send real email
              await sendOtpEmail(validEmail, otp);
              setResetStep(2);
          } catch (err: any) {
              console.error("Email send failed", err);
              
              let msg = "Failed to send verification email. Check internet connection.";

              // Handle specific EmailJS/Gmail errors
              if (err.text && (typeof err.text === 'string')) {
                  if (err.text.includes("Gmail_API") || err.text.includes("insufficient authentication scopes")) {
                      msg = "Configuration Error: The EmailJS Gmail service has insufficient permissions. Please reconnect your Gmail account in the EmailJS dashboard.";
                  } else if (err.status === 412) {
                      msg = "Email Provider Error: Precondition failed (412). Please check your EmailJS service settings.";
                  } else {
                      msg = `Email Service Error: ${err.text}`;
                  }
              } else if (err.message) {
                  msg = err.message;
              }
              
              setResetError(msg);
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
      
      if (inputOtp === generatedOtp) {
          setResetStep(3);
      } else {
          setResetError('Invalid verification code.');
      }
  };

  const handleResetStep3 = (e: React.FormEvent) => {
      e.preventDefault();
      setResetError('');

      if (newPassword.length < 4) {
          setResetError('Password is too short.');
          return;
      }

      if (newPassword !== confirmPassword) {
          setResetError('Passwords do not match.');
          return;
      }

      if (onPasswordReset) {
          onPasswordReset(newPassword);
          setResetSuccess('Password updated successfully! Redirecting to login...');
          setTimeout(() => {
              setIsResetMode(false);
              setResetStep(1);
              setResetSuccess('');
              setInputEmail('');
              setInputOtp('');
              setGeneratedOtp('');
              setNewPassword('');
              setConfirmPassword('');
          }, 2000);
      }
  };

  return (
    <div 
      className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat transition-all duration-500 relative"
      style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined }}
    >
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl shadow-lg bg-white/90 p-2 backdrop-blur-sm" />
            ) : (
                <div className="bg-blue-600/90 p-4 rounded-xl shadow-lg text-white backdrop-blur-sm">
                    <FlaskConical className="w-12 h-12" />
                </div>
            )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white drop-shadow-lg tracking-tight">
          {appName}
        </h2>
        <p className="mt-2 text-center text-sm text-white/90 drop-shadow-md font-medium">
          {isResetMode ? 'Account Recovery' : 'Sign in to manage your laboratory inventory'}
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Liquid Glass Card */}
        <div className="bg-white/10 backdrop-blur-xl py-8 px-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] sm:rounded-2xl sm:px-10 border border-white/20">
          
          {!isResetMode ? (
            // --- Standard Login Form ---
            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                <label htmlFor="username" className="block text-sm font-medium text-white drop-shadow-md">
                    Username
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-700" />
                    </div>
                    <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/80 transition-all shadow-inner"
                    placeholder="Enter your username"
                    />
                </div>
                </div>

                <div>
                <label htmlFor="password" className="block text-sm font-medium text-white drop-shadow-md">
                    Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-700" />
                    </div>
                    <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white/80 transition-all shadow-inner"
                    placeholder="Enter your password"
                    />
                    <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    >
                    {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    ) : (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    )}
                    </button>
                </div>
                <div className="flex justify-end mt-1">
                    <button 
                        type="button" 
                        onClick={() => setIsResetMode(true)}
                        className="text-xs text-blue-200 hover:text-white font-medium drop-shadow-sm transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>
                </div>

                {error && (
                <div className="rounded-lg bg-red-500/20 p-4 border border-red-500/50 backdrop-blur-sm">
                    <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-100" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-50 shadow-sm">{error}</h3>
                    </div>
                    </div>
                </div>
                )}

                <div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-blue-600/90 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all backdrop-blur-sm hover:scale-[1.02]"
                >
                    Sign in
                </button>
                </div>
            </form>
          ) : (
            // --- Reset Password Flow ---
            <div className="space-y-6">
                {resetStep === 1 && (
                    <form onSubmit={handleResetStep1} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-4">
                            <Mail className="mx-auto h-12 w-12 text-blue-200 opacity-80" />
                            <h3 className="mt-2 text-lg font-bold text-white drop-shadow-md">Verify Recovery Email</h3>
                            <p className="text-xs text-white/80 mt-1">We will send a verification code to your registered recovery email.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-white drop-shadow-md mb-1">Recovery Email</label>
                            <input
                                type="email"
                                required
                                value={inputEmail}
                                onChange={(e) => setInputEmail(e.target.value)}
                                className="block w-full px-4 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400"
                                placeholder="e.g. admin@school.edu"
                            />
                        </div>

                        {resetError && (
                            <div className="bg-red-500/30 p-3 rounded border border-red-500/40 flex gap-2 items-start">
                                <AlertCircle className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-100">{resetError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(false); setResetError(''); }}
                                className="flex-1 py-2.5 border border-white/40 rounded-lg text-white hover:bg-white/10 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSendingOtp}
                                className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-lg text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-wait"
                            >
                                {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                                <span>{isSendingOtp ? 'Sending...' : 'Send Code'}</span>
                            </button>
                        </div>
                    </form>
                )}
                
                {resetStep === 2 && (
                    <form onSubmit={handleResetStep2} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="text-center mb-4">
                            <KeyRound className="mx-auto h-12 w-12 text-blue-200 opacity-80" />
                            <h3 className="mt-2 text-lg font-bold text-white drop-shadow-md">Enter Verification Code</h3>
                            <p className="text-xs text-white/80 mt-1">Please enter the 6-digit code sent to <strong>{inputEmail}</strong>.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white drop-shadow-md mb-1">Verification Code</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={inputOtp}
                                onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                className="block w-full px-4 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400 text-center text-xl tracking-widest font-mono"
                                placeholder="000000"
                            />
                        </div>

                        {resetError && (
                            <div className="bg-red-500/30 p-3 rounded border border-red-500/40 flex gap-2 items-start">
                                <AlertCircle className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-100">{resetError}</p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                             <button
                                type="button"
                                onClick={() => setResetStep(1)}
                                className="flex-1 flex justify-center items-center gap-2 py-2.5 border border-white/40 rounded-lg text-white hover:bg-white/10 text-sm font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                             <button
                                type="submit"
                                className="flex-1 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg shadow-lg text-sm font-bold transition-all"
                            >
                                Verify
                            </button>
                        </div>
                    </form>
                )}

                {resetStep === 3 && (
                    <form onSubmit={handleResetStep3} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                         {resetSuccess ? (
                            <div className="text-center p-4 bg-green-500/30 border border-green-500/50 rounded-lg">
                                <p className="text-white font-medium">{resetSuccess}</p>
                            </div>
                         ) : (
                             <>
                                <div className="text-center mb-4">
                                    <Lock className="mx-auto h-10 w-10 text-blue-200 opacity-80" />
                                    <h3 className="mt-2 text-lg font-bold text-white drop-shadow-md">Set New Password</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white drop-shadow-md mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full px-4 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white drop-shadow-md mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full px-4 sm:text-sm border-white/30 rounded-lg py-2.5 bg-white/60 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>

                                {resetError && (
                                    <div className="bg-red-500/30 p-3 rounded border border-red-500/40 flex gap-2 items-start">
                                        <AlertCircle className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-100">{resetError}</p>
                                    </div>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="submit"
                                        className="w-full py-2.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg shadow-lg text-sm font-bold transition-all"
                                    >
                                        Update Password
                                    </button>
                                </div>
                             </>
                         )}
                    </form>
                )}
            </div>
          )}
        </div>
      </div>
      
      {customFooterText && (
        <div className="absolute bottom-4 left-0 right-0 text-center z-10 px-4">
            <p className="text-white/60 text-xs font-medium tracking-wide drop-shadow-sm uppercase">
                {customFooterText}
            </p>
        </div>
      )}
    </div>
  );
};

export default Login;
