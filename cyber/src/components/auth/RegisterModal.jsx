import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, CheckCircle2, Building2, Users, UserPlus, ArrowRight, Lock, User, Mail, Award, Check } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import apiClient from '../../utils/apiClient';

const RegisterModal = ({ isOpen, onClose, onLogin, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'Analyst',
    tos: false,
    deviceConsent: true,
    orgMode: 'create', // 'create' | 'join' | 'none'
    orgName: 'State Cyber Crime Cell',
    industry: 'Government',
    inviteCode: '',
  });
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let s = 0;
    if (formData.password.length >= 8) s += 25;
    if (/[A-Z]/.test(formData.password)) s += 25;
    if (/[0-9]/.test(formData.password)) s += 25;
    if (/[^A-Za-z0-9]/.test(formData.password)) s += 25;
    setStrength(s);
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      toast.error('Passcodes do not match');
      return;
    }
    if (!formData.tos) {
      toast.error('Law Enforcement Protocols agreement required');
      return;
    }
    if (!formData.deviceConsent) {
      toast.error('Device audit consent is required.');
      return;
    }

    const [firstName = '', lastName = ''] = formData.name.trim().split(/ (.+)/);
    const username = formData.email.includes('@') ? formData.email.split('@')[0] : formData.name.toLowerCase().replace(/\s+/g, '_');

    const body = {
      username,
      email: formData.email,
      first_name: firstName,
      last_name: lastName,
      password: formData.password,
      confirm_password: formData.confirm,
      role: formData.role.toLowerCase(),
    };
    if (formData.orgMode === 'create' && formData.orgName.trim()) {
      body.org_name = formData.orgName.trim();
      body.industry = formData.industry.trim();
    } else if (formData.orgMode === 'join' && formData.inviteCode.trim()) {
      body.invite_code = formData.inviteCode.trim().toUpperCase();
    }

    setLoading(true);
    try {
      const response = await apiClient('/api/v1/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Officer Profile Provisioned Successfully ✅`);
        const userWithName = {
          ...data.user,
          name: data.user.full_name ||
                `${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() ||
                data.user.username || 'Officer',
        };
        if (typeof onLogin === 'function') onLogin(userWithName);
        onClose();
      } else {
        const errMsg =
          data.error ||
          data.detail ||
          (data.username ? `Username: ${data.username[0]}` : null) ||
          (data.email ? `Email: ${data.email[0]}` : null) ||
          (data.password ? `Password: ${data.password[0]}` : null) ||
          (data.non_field_errors ? data.non_field_errors[0] : null) ||
          'Registration failed';
        toast.error(errMsg);
      }
    } catch {
      toast.error('Provisioning server unreachable');
    } finally {
      setLoading(false);
    }
  };

  const ORG_MODES = [
    { id: 'create', icon: Building2, label: 'New Cyber Cell', sub: 'Create Unit Hub' },
    { id: 'join', icon: Users, label: 'Join Existing Unit', sub: 'Use Unit Code' },
    { id: 'none', icon: UserPlus, label: 'Individual Officer', sub: 'Solo Access' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-orange-500/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.15)]"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />

            <div className="flex flex-col md:flex-row min-h-[500px]">
              {/* Left Panel */}
              <div className="w-full md:w-[36%] bg-gradient-to-b from-orange-600 via-orange-700 to-red-700 p-7 flex flex-col justify-between text-black relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-black/10 blur-xl pointer-events-none" />

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mb-6 shadow-xl">
                    <Shield className="w-7 h-7 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-black uppercase leading-tight tracking-tight text-black">
                    {step === 1 ? <>Officer<br />Accreditation</> : <>Department<br />Unit Setup</>}
                  </h3>

                  <div className="mt-8 space-y-3">
                    {[
                      { stepNum: 1, title: 'Officer Profile', desc: 'Identity & Passcode' },
                      { stepNum: 2, title: 'Department / Unit', desc: 'Jurisdiction & Access' },
                    ].map((s) => (
                      <div key={s.stepNum} className={`flex items-center gap-3 ${step === s.stepNum ? 'opacity-100' : 'opacity-60'}`}>
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black border-2 border-black ${step >= s.stepNum ? 'bg-black text-orange-400' : 'bg-transparent text-black'}`}>
                          {step > s.stepNum ? <Check className="w-4 h-4 text-orange-400" /> : s.stepNum}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider leading-none text-black">{s.title}</p>
                          <p className="text-[9px] font-bold text-black/70 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-black/15">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/80">
                    CrimeCast SIH 2026 Security Protocol
                  </p>
                </div>
              </div>

              {/* Right Panel */}
              <div className="flex-1 p-7 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">
                        {step === 1 ? 'Officer Accreditation' : 'Department Assignment'}
                      </h2>
                      <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">
                        Step {step} of 2
                      </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mode Switcher */}
                  <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 mb-6">
                    {onSwitchToLogin && (
                      <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="flex-1 py-1.5 text-xs font-bold uppercase rounded-lg text-zinc-400 hover:text-white transition-all"
                      >
                        Officer Login
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex-1 py-1.5 text-xs font-black uppercase rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-black shadow-md transition-all"
                    >
                      Register Unit
                    </button>
                  </div>

                  <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit} className="space-y-4">
                    {/* STEP 1 */}
                    {step === 1 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Official Full Name</label>
                            <input
                              required
                              type="text"
                              autoComplete="name"
                              name="name"
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                              placeholder="Insp. Rajesh Kumar"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Official / Work Email</label>
                            <input
                              type="email"
                              required
                              autoComplete="email"
                              name="email"
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                              placeholder="rajesh.kumar@police.gov.in"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Access Cipher (Passcode)</label>
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="new-password"
                            name="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                            placeholder="••••••••••••"
                          />
                          <div className="h-1.5 flex gap-1 mt-1.5">
                            {[25, 50, 75, 100].map(s => (
                              <div key={s} className={`flex-1 rounded-full transition-all duration-300 ${strength >= s ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'bg-zinc-800'}`} />
                            ))}
                          </div>
                          <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Entropy: {strength}%</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Confirm Passcode</label>
                          <input
                            type="password"
                            required
                            autoComplete="new-password"
                            name="confirm_password"
                            value={formData.confirm}
                            onChange={e => setFormData({ ...formData, confirm: e.target.value })}
                            className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                            placeholder="••••••••••••"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Operational Role</label>
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              { id: 'Analyst', sub: 'Threat Hunter & Field Officer' },
                              { id: 'Validator', sub: 'Station Head & Verification' },
                            ].map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, role: r.id })}
                                className={`p-3 rounded-xl border flex flex-col items-center transition-all ${formData.role === r.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700'}`}
                              >
                                <span className="text-xs font-black uppercase">{r.id}</span>
                                <span className="text-[8px] font-semibold text-zinc-500 mt-0.5">{r.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button type="submit" size="lg" className="w-full py-3.5 mt-2 bg-gradient-to-r from-orange-500 to-red-500 text-black font-black uppercase text-xs">
                          Next: Department Setup →
                        </Button>
                      </>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Cyber Cell Unit Assignment</label>
                          <div className="grid grid-cols-3 gap-2">
                            {ORG_MODES.map(m => {
                              const Icon = m.icon;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, orgMode: m.id })}
                                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${formData.orgMode === m.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-800 bg-black text-zinc-500 hover:border-zinc-700'}`}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="text-[9px] font-black uppercase">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {formData.orgMode === 'create' && (
                          <div className="space-y-2.5">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-300 uppercase">Unit / Department Name</label>
                              <input
                                value={formData.orgName}
                                onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                                className="w-full bg-black/70 border border-zinc-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                                placeholder="Cyber Crime Cell - Zone 4"
                              />
                            </div>
                          </div>
                        )}

                        {formData.orgMode === 'join' && (
                          <div className="space-y-2.5">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-300 uppercase">Unit Access Code</label>
                              <input
                                value={formData.inviteCode}
                                onChange={e => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                                className="w-full bg-black/70 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-blue-400 font-mono tracking-widest uppercase outline-none"
                                placeholder="CELL-9921"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 pt-2">
                          <div onClick={() => setFormData({ ...formData, tos: !formData.tos })} className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${formData.tos ? 'bg-orange-500 border-orange-500 text-black' : 'border-zinc-700 bg-black'}`}>
                              {formData.tos && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <span className="text-[10px] text-zinc-400 leading-snug">
                              Protocol Rules of Engagement: I accept all operating protocols and consent to security auditing.
                            </span>
                          </div>

                          <div onClick={() => setFormData({ ...formData, deviceConsent: !formData.deviceConsent })} className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${formData.deviceConsent ? 'bg-orange-500 border-orange-500 text-black' : 'border-zinc-700 bg-black'}`}>
                              {formData.deviceConsent && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <span className="text-[10px] text-zinc-400 leading-snug">
                              Allow CrimeCast to verify device environment for secure session auditing.
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase"
                          >
                            Back
                          </button>
                          <Button disabled={loading} type="submit" size="lg" className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-black font-black uppercase text-xs">
                            {loading ? 'Initialize Protocol...' : 'Initialize Protocol'}
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterModal;
