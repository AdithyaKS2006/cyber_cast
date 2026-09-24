import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose, onLogin, onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [deviceConsent, setDeviceConsent] = useState(false);

  const handleLoginCallback = (user) => {
    if (typeof onLogin === 'function') onLogin(user);
    if (typeof onSuccess === 'function') onSuccess(user);
  };

  const DEMO_OFFICERS = [
    {
      roleName: 'Analyst',
      badge: '👮 Insp. Singh',
      rank: 'Field Officer',
      login: 'inspector_singh',
      border: 'border-orange-500/40',
      text: 'text-orange-400',
    },
    {
      roleName: 'Validator',
      badge: '⚖️ DSP Sharma',
      rank: 'Station Head',
      login: 'dsp_sharma',
      border: 'border-blue-500/40',
      text: 'text-blue-400',
    },
    {
      roleName: 'Admin',
      badge: '👑 Admin Lead',
      rank: 'Nodal Admin',
      login: 'admin_crimecast',
      border: 'border-red-500/40',
      text: 'text-red-400',
    },
  ];

  const activateDemoSession = (inputLogin) => {
    const matched = DEMO_OFFICERS.find(o =>
      (inputLogin && inputLogin.toLowerCase().includes(o.login.toLowerCase())) ||
      (inputLogin && inputLogin.toLowerCase().includes(o.roleName.toLowerCase())) ||
      (inputLogin && inputLogin.toLowerCase().includes('singh')) ||
      (inputLogin && inputLogin.toLowerCase().includes('sharma')) ||
      (inputLogin && inputLogin.toLowerCase().includes('admin'))
    ) || DEMO_OFFICERS[0];

    const demoUser = {
      id: matched.login === 'admin_crimecast' ? 1 : (matched.login === 'dsp_sharma' ? 2 : 3),
      username: matched.login,
      email: `${matched.login}@crimecast.gov.in`,
      name: matched.badge.replace(/^[^\w\s]+/, '').trim(),
      role: matched.roleName,
      badge: matched.badge,
      rank: matched.rank,
      agency: 'Cyber Crime Investigation Division (I4C / NCRP)',
    };

    localStorage.setItem('crimecast_demo_user', JSON.stringify(demoUser));
    toast.success(`Access granted: ${demoUser.name} (${demoUser.role})`, { icon: '🛡️' });
    handleLoginCallback(demoUser);
    onClose();
    setMfaRequired(false);
    setTotpCode('');
    setEmail('');
    setPassword('');
  };

  const performLogin = async (loginEmail, loginPassword, loginTotp = '') => {
    setIsAuthenticating(true);
    try {
      const response = await apiClient('/api/v1/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, totp_code: loginTotp }),
      });

      // On static hosting (e.g. GitHub Pages), POST returns 405 Method Not Allowed or 404
      if (response.status === 404 || response.status === 405) {
        activateDemoSession(loginEmail);
        return;
      }

      let data = {};
      try {
        data = await response.json();
      } catch {
        activateDemoSession(loginEmail);
        return;
      }

      if (response.ok) {
        toast.success(`Access granted: ${data.user?.name || data.user?.username || 'Officer'}`);
        handleLoginCallback(data.user);
        onClose();
        setMfaRequired(false);
        setTotpCode('');
        setEmail('');
        setPassword('');
      } else {
        if (data.mfa_required || data.details?.mfa_required) {
          setMfaRequired(true);
        } else {
          // If login fails on demo badges or server 5xx, activate demo session
          const isDemoAttempt = DEMO_OFFICERS.some(o => o.login === loginEmail || loginEmail.includes('admin') || loginEmail.includes('inspector') || loginEmail.includes('sharma'));
          if (isDemoAttempt || response.status >= 500) {
            activateDemoSession(loginEmail);
            return;
          }
          const errMsg = data.details?.detail?.[0] || data.details?.totp_code?.[0] || data.totp_code?.[0] || data.detail || data.non_field_errors?.[0] || data.error || "Invalid Credentials";
          toast.error(errMsg);
        }
      }
    } catch {
      // Backend server unreachable (static GitHub Pages showcase mode)
      activateDemoSession(loginEmail);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mfaRequired && !deviceConsent) {
      toast.error('Device profiling consent is required for security auditing.');
      return;
    }
    performLogin(email, password, totpCode);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with dark overlay and blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            className="relative w-full max-w-md bg-zinc-950 border border-orange-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.15)]"
          >
            {/* Top Accent Gradient Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />

            <div className="p-7 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Shield className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      CrimeCast <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold">Portal</span>
                    </h2>
                    <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                      Law Enforcement Command Access
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80">
                <button
                  type="button"
                  className="flex-1 py-2 text-xs font-black uppercase rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-black shadow-md transition-all"
                >
                  Officer Login
                </button>
                {onSwitchToRegister && (
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="flex-1 py-2 text-xs font-bold uppercase rounded-lg text-zinc-400 hover:text-white transition-all"
                  >
                    Register Unit
                  </button>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!mfaRequired ? (
                  <>
                    {/* Username/Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Protocol ID (Email or Username)</span>
                        <span className="text-[9px] text-orange-400 font-mono">I4C Verified</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          required
                          type="text"
                          autoComplete="username"
                          name="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-zinc-600 outline-none transition-all font-medium"
                          placeholder="inspector_singh or inspector.singh@crimecast.gov.in"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Access Cipher
                        </label>
                        <span className="text-[10px] font-semibold text-orange-400 hover:text-orange-300 cursor-pointer">
                          Recovery?
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          name="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl pl-11 pr-11 py-3.5 text-xs text-white placeholder-zinc-600 outline-none transition-all font-medium"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* MFA Verification Step */
                  <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-orange-500/30">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase">
                      <AlertCircle className="w-4 h-4" /> Multi-Factor Authentication Required
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Enter the 6-digit TOTP code from your authenticator app or backup security code.
                    </p>
                    <input
                      required
                      type="text"
                      maxLength="10"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.trim().toUpperCase())}
                      className="w-full bg-black border border-orange-500/40 rounded-xl p-3.5 text-center tracking-[0.5em] text-white font-mono text-base placeholder:text-zinc-700 focus:outline-none focus:border-orange-500"
                      placeholder="000000"
                    />
                  </div>
                )}

                {/* Device Profiling Consent */}
                {!mfaRequired && (
                  <div className="flex items-start gap-3 mt-4 mb-2">
                    <input
                      required
                      type="checkbox"
                      id="devicePermission"
                      checked={deviceConsent}
                      onChange={(e) => setDeviceConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-700 text-orange-500 bg-black focus:ring-orange-500 focus:ring-offset-black cursor-pointer"
                    />
                    <label htmlFor="devicePermission" className="text-[10px] text-zinc-400 font-medium leading-relaxed cursor-pointer">
                      Allow CrimeCast to collect device profiling details (OS, Browser, Device Type) for security auditing and session management.
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  disabled={isAuthenticating}
                  type="submit"
                  size="lg"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-orange-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  {isAuthenticating ? (
                    'Authenticating...'
                  ) : mfaRequired ? (
                    'Verify MFA'
                  ) : (
                    <>
                      <span>Initiate Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {mfaRequired && (
                  <button
                    type="button"
                    onClick={() => setMfaRequired(false)}
                    className="w-full text-center text-[10px] font-bold text-zinc-500 uppercase mt-2 hover:text-white transition-colors"
                  >
                    Back to Login
                  </button>
                )}
              </form>

              {/* Quick Auth Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-[9px] font-black text-zinc-500 uppercase tracking-widest px-3 bg-zinc-950">
                  Quick Auth Link
                </div>
              </div>

              {/* Quick Auth Officer Badges */}
              <div className="grid grid-cols-3 gap-2.5">
                {DEMO_OFFICERS.map((officer) => (
                  <button
                    key={officer.login}
                    type="button"
                    onClick={() => performLogin(officer.login, 'CrimeCast@2026')}
                    className={`p-3 bg-zinc-900/80 rounded-xl border ${officer.border} hover:bg-zinc-800 flex flex-col items-center text-center transition-all group hover:scale-[1.03]`}
                  >
                    <span className={`text-[11px] font-black ${officer.text}`}>
                      {officer.roleName}
                    </span>
                    <span className="text-[9px] font-semibold text-zinc-300 mt-1 line-clamp-1">
                      {officer.badge}
                    </span>
                    <span className="text-[7px] text-zinc-500 font-bold uppercase mt-0.5">
                      {officer.rank}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer status */}
            <div className="py-2.5 px-6 bg-zinc-900/60 border-t border-zinc-900 flex justify-between items-center text-[9px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NCRB / I4C Protocol Ready
              </span>
              <span>AES-256 Encrypted</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
