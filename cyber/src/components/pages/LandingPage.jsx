/**
 * LandingPage.jsx  —  CrimeCast Public Landing
 * Hero · Stats · How it Works · Animated counter · CTA
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Shield, Zap, CheckCircle, ArrowRight,
  MapPin, FileText, TrendingUp, AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import LoginModal  from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';

/* ── Inline keyframes ────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

  .cc-glow {
    box-shadow: 0 0 60px rgba(249,115,22,0.18), 0 0 120px rgba(239,68,68,0.08);
  }
  .cc-text-grad {
    background: linear-gradient(135deg, #f97316, #ef4444);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .cc-border-grad {
    border-image: linear-gradient(135deg,#f97316,#ef4444) 1;
  }
  @keyframes cc-float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes cc-orbit {
    from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
  }
  @keyframes cc-pulse-ring {
    0%   { transform:scale(1);  opacity:0.7; }
    100% { transform:scale(2.4);opacity:0; }
  }
  .cc-float    { animation: cc-float 4s ease-in-out infinite; }
  .cc-orbit    { animation: cc-orbit 6s linear infinite; }
  .cc-pulse-ring {
    position:absolute; inset:0; border-radius:50%;
    border:2px solid rgba(249,115,22,0.6);
    animation: cc-pulse-ring 2s ease-out infinite;
  }
  .cc-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  }
  * { font-family: 'Inter', system-ui, sans-serif; }
`;

/* ── Animated number counter ─────────────────────────────────────────── */
const useCountUp = (target, duration = 2000, start = false) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTs = null;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return val;
};

const CounterStat = ({ prefix='', value, suffix='', label, color='#f97316', duration=2000 }) => {
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count = useCountUp(value, duration, inView);
  return (
    <div ref={ref} className="text-center space-y-2">
      <p className="text-4xl md:text-5xl font-black" style={{ color }}>
        {prefix}{count.toLocaleString('en-IN')}{suffix}
      </p>
      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest max-w-[140px] mx-auto leading-relaxed">
        {label}
      </p>
    </div>
  );
};

/* ── How it Works step ───────────────────────────────────────────────── */
const HowStep = ({ step, icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
    transition={{ duration:0.5, delay }}
    viewport={{ once:true }}
    className="flex flex-col items-center text-center space-y-4 relative"
  >
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center cc-glow"
           style={{ background:'linear-gradient(135deg,#f97316,#ef4444)' }}>
        <Icon className="w-7 h-7 text-black" />
      </div>
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-black border border-orange-500/40 flex items-center justify-center">
        <span className="text-[9px] font-black text-orange-400">{step}</span>
      </div>
    </div>
    <h3 className="text-sm font-black text-white uppercase tracking-wide">{title}</h3>
    <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[200px]">{desc}</p>
  </motion.div>
);

/* ── Floating orbit animation (hero graphic) ─────────────────────────── */
const HeroGraphic = () => (
  <div className="relative w-64 h-64 flex items-center justify-center cc-float select-none pointer-events-none">
    {/* Centre shield */}
    <div className="relative z-10 w-24 h-24 rounded-2xl flex items-center justify-center cc-glow"
         style={{ background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15))',
                  border:'1px solid rgba(249,115,22,0.4)' }}>
      <div className="cc-pulse-ring" />
      <div className="cc-pulse-ring" style={{ animationDelay:'0.7s' }} />
      <Shield className="w-12 h-12 text-orange-400 relative z-10" />
    </div>

    {/* Orbiting dots */}
    {[
      { bg:'#ef4444', delay:'0s',    icon:'₹' },
      { bg:'#f97316', delay:'2s',    icon:'🎯' },
      { bg:'#3b82f6', delay:'4s',    icon:'📍' },
    ].map(({ bg, delay, icon }, i) => (
      <div key={i} className="absolute w-full h-full" style={{ animation:`cc-orbit ${6+i}s linear infinite`, animationDelay:delay }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg"
             style={{ background:bg, boxShadow:`0 0 12px ${bg}80` }}>
          {icon}
        </div>
      </div>
    ))}

    {/* Rings */}
    {[100, 148, 196].map((r, i) => (
      <div key={i} className="absolute rounded-full border"
           style={{ width:r, height:r, borderColor:'rgba(249,115,22,0.08)' }} />
    ))}
  </div>
);

/* ── Feature card ────────────────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
    transition={{ duration:0.4, delay }}
    viewport={{ once:true }}
    className="p-5 rounded-2xl border border-zinc-800/60 space-y-3 hover:border-orange-500/30 transition-all group"
    style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)' }}
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
         style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.25)' }}>
      <Icon className="w-5 h-5 text-orange-400" />
    </div>
    <h3 className="text-sm font-black text-white uppercase">{title}</h3>
    <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
  </motion.div>
);

/* ══ Main Landing Page ═════════════════════════════════════════════════ */
const LandingPage = ({ onEnter, onLogin, navigate }) => {
  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [recoverable,  setRecoverable]  = useState(0);
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once:true });

  /* Animate the recoverable counter (₹567 crore ~5% of ₹11,333Cr) */
  useEffect(() => {
    if (!heroInView) return;
    let v = 0; const target = 567; const step = target / 60;
    const id = setInterval(() => {
      v = Math.min(v + step, target);
      setRecoverable(Math.round(v));
      if (v >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [heroInView]);

  const handleLoginSuccess = useCallback((userData) => {
    setShowLogin(false);
    setShowRegister(false);
    if (typeof onLogin === 'function') {
      onLogin(userData);
    }
    if (typeof onEnter === 'function') {
      onEnter(userData);
    }
    if (typeof navigate === 'function') {
      navigate('predictions/heatmap');
    }
  }, [onEnter, onLogin, navigate]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="min-h-screen overflow-x-hidden" style={{ background:'#000', color:'#fff' }}>

        {/* ── Navbar ─────────────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
             style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(16px)',
                      borderBottom:'1px solid rgba(249,115,22,0.10)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background:'linear-gradient(135deg,#f97316,#ef4444)' }}>
              <Shield className="w-4 h-4 text-black" />
            </div>
            <span className="font-black text-sm uppercase tracking-widest cc-text-grad">CrimeCast</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLogin(true)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white transition-colors">
              Login
            </button>
            <button onClick={() => setShowRegister(true)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
              style={{ background:'linear-gradient(135deg,#f97316,#ef4444)', color:'black' }}>
              Get Access
            </button>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────── */}
        <section ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden cc-noise">

          {/* Background radial glow */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background:'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-10 pointer-events-none"
               style={{ background:'linear-gradient(135deg,#f97316,#ef4444)' }} />

          {/* Badge */}
          <motion.div
            initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 mb-8"
            style={{ background:'rgba(249,115,22,0.06)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
              SIH 2026 · Problem Statement 26184
            </span>
          </motion.div>

          {/* Hero graphic */}
          <motion.div
            initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.6, delay:0.1 }}
            className="mb-10">
            <HeroGraphic />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black uppercase leading-none tracking-tight max-w-4xl mb-6">
            <span className="text-white">CrimeCast —</span>{' '}
            <span className="cc-text-grad block md:inline">Predict Where</span>
            <br className="hidden md:block"/>
            <span className="text-white">Stolen Money Goes</span>
            <br/>
            <span className="cc-text-grad">Before Criminals Cash Out</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:0.35 }}
            className="text-base md:text-lg text-zinc-400 font-bold max-w-2xl mb-6 uppercase tracking-wide">
            AI-Powered Cybercrime Intelligence for Indian Law Enforcement
          </motion.p>

          {/* Animated recoverable counter */}
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            transition={{ delay:0.5 }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-green-500/20 mb-10"
            style={{ background:'rgba(34,197,94,0.05)' }}>
            <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm font-black text-white uppercase tracking-wide">
              <span className="text-green-400 text-xl">₹{recoverable}</span>
              <span className="text-zinc-400"> crore potentially recoverable with AI interception</span>
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.55 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <button onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black uppercase transition-all hover:opacity-90 hover:scale-105 cc-glow"
              style={{ background:'linear-gradient(135deg,#f97316,#ef4444)', color:'black' }}>
              <Shield className="w-4 h-4" />
              Login to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setShowRegister(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black uppercase border border-zinc-700 text-zinc-400 hover:text-white hover:border-orange-500/40 transition-all">
              Request Access
            </button>
          </motion.div>

          {/* Scroll cue */}
          <motion.div animate={{ y:[0,6,0] }} transition={{ repeat:Infinity, duration:2 }}
            className="flex flex-col items-center gap-1 text-zinc-700">
            <span className="text-[8px] font-black uppercase tracking-widest">Scroll</span>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </section>

        {/* ── CRISIS STATS ───────────────────────────────────────────── */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0" style={{ background:'rgba(239,68,68,0.02)' }} />
          <div className="max-w-4xl mx-auto space-y-12">
            <motion.div
              initial={{ opacity:0 }} whileInView={{ opacity:1 }}
              viewport={{ once:true }}
              className="text-center space-y-2">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">The Problem</p>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase">India's Cybercrime Crisis</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-4">
              <CounterStat value={11333} prefix="₹" suffix=" Cr"
                label="lost to cybercrime in India (2023)" color="#ef4444" duration={2500} />
              <CounterStat value={5} suffix="%"
                label="average fraud recovery rate" color="#f97316" duration={1500} />
              <CounterStat value={8000} suffix="+"
                label="complaints filed daily on NCRP portal" color="#eab308" duration={1500} />
            </div>

            <motion.div
              initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }}
              className="p-5 rounded-2xl border border-red-500/20 flex items-start gap-4"
              style={{ background:'rgba(239,68,68,0.04)' }}>
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-zinc-400 leading-relaxed font-bold uppercase">
                Mule accounts cash out stolen funds within <span className="text-red-400">2–8 hours</span> of the fraud.
                Police receive reports <span className="text-red-400">24–72 hours</span> later — after the money has vanished.
                CrimeCast closes this gap using machine learning.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto space-y-16">
            <motion.div
              initial={{ opacity:0 }} whileInView={{ opacity:1 }}
              viewport={{ once:true }}
              className="text-center space-y-2">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">The Solution</p>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase">How CrimeCast Works</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* connector line (desktop) */}
              <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px"
                   style={{ background:'linear-gradient(90deg,transparent,#f97316,#ef4444,transparent)' }} />

              <HowStep step="01" icon={FileText} title="File Complaint"
                desc="Officer enters victim details, fraud amount, and the transaction chain (mule accounts) into CrimeCast."
                delay={0} />
              <HowStep step="02" icon={Zap} title="AI Prediction"
                desc="Our LightGBM model (Single Calibrated LightGBM) predicts the top-5 cash-out districts with probability and ETA."
                delay={0.15} />
              <HowStep step="03" icon={CheckCircle} title="Police Interception"
                desc="Alerts are dispatched to field units nearest the predicted zones before the cash-out window closes."
                delay={0.3} />
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────────── */}
        <section className="py-20 px-6"
                 style={{ background:'linear-gradient(180deg, #000, rgba(249,115,22,0.03), #000)' }}>
          <div className="max-w-5xl mx-auto space-y-12">
            <motion.div
              initial={{ opacity:0 }} whileInView={{ opacity:1 }}
              viewport={{ once:true }}
              className="text-center space-y-2">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Capabilities</p>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase">Built for Investigators</h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <FeatureCard icon={Zap}          title="30.8% Top-3 Accuracy"     desc="Single Calibrated LightGBM classifier over 40 cash-out districts — beats nearest-district baseline (8.1%) by +22.7 points on a temporally held-out evaluation set." delay={0} />
              <FeatureCard icon={MapPin}       title="Geospatial Prediction"    desc="Top-5 predicted districts overlaid on a live map with historical fraud density heatmap." delay={0.05} />
              <FeatureCard icon={AlertTriangle}title="Real-Time Alerts"         desc="WebSocket alerts pushed to officers the moment a prediction is generated — with sound and browser notifications." delay={0.1} />
              <FeatureCard icon={TrendingUp}   title="Explainable Predictions"  desc="Every prediction includes gain-based feature importance so investigators understand exactly why a district was flagged." delay={0.15} />
              <FeatureCard icon={FileText}     title="Structured Intake"        desc="Multi-step complaint form captures victim details, fraud method, and full transaction hop chain." delay={0.2} />
              <FeatureCard icon={Shield}       title="I4C Aligned"              desc="Designed around NCRP data patterns and I4C cybercrime district intelligence for maximum relevance." delay={0.25} />
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────────────────── */}
        <section className="py-28 px-6 text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity:0, scale:0.9 }} whileInView={{ opacity:1, scale:1 }}
              viewport={{ once:true }}
              className="space-y-4">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Ready to Intercept</p>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase leading-tight">
                Stop the Cash-Out.<br/>
                <span className="cc-text-grad">Recover the Money.</span>
              </h2>
              <p className="text-zinc-500 text-sm font-bold uppercase">
                CrimeCast is purpose-built for Indian law enforcement agencies.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
              transition={{ delay:0.2 }}
              viewport={{ once:true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black uppercase transition-all hover:opacity-90 hover:scale-105 cc-glow"
                style={{ background:'linear-gradient(135deg,#f97316,#ef4444)', color:'black' }}>
                <Shield className="w-4 h-4" />
                Login to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="py-8 px-6 text-center"
                style={{ borderTop:'1px solid rgba(249,115,22,0.08)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md flex items-center justify-center"
                 style={{ background:'linear-gradient(135deg,#f97316,#ef4444)' }}>
              <Shield className="w-3 h-3 text-black" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest cc-text-grad">CrimeCast</span>
          </div>
          <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
            Smart India Hackathon 2026 · Problem 26184 · Predictive Cybercrime Analytics
          </p>
        </footer>
      </div>

      {showLogin && (
        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLogin={handleLoginSuccess}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
        />
      )}
      {showRegister && (
        <RegisterModal
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          onLogin={handleLoginSuccess}
          onSuccess={handleLoginSuccess}
          onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}
    </>
  );
};

export default LandingPage;
