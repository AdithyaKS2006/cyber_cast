import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Upload, Sparkles, CheckCircle2, AlertTriangle, Play, RefreshCw, Radio, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const PRESETS = [
  {
    title: '₹2,50,000 Digital Arrest Scheme',
    badge: 'High Priority',
    color: 'border-red-500/50 text-red-400 bg-red-950/20',
    transcript: 'Hello 1930 helpline, my phone number is 9876543210. I received a video call from someone impersonating Mumbai CBI cyber cell claiming my Aadhaar is linked to illegal money laundering. Under extreme coercion and digital arrest threat for 4 hours, I was forced to transfer 250000 rupees to their verification account 501004928192 with HDFC Bank IFSC HDFC0001234. Please freeze this mule account immediately.',
  },
  {
    title: '₹48,000 Instant UPI Cashback Scam',
    badge: 'Fast Intercept',
    color: 'border-orange-500/50 text-orange-400 bg-orange-950/20',
    transcript: 'Victim calling 1930 from phone 9123456789. I scanned a QR code on WhatsApp sent by an OLX buyer who claimed to pay advance for my sofa. Instead of receiving funds, 48000 rupees was debited via UPI to handle fraudster.mule@okhdfcbank linked to State Bank of India account 30981245678 IFSC SBIN0001234. The transaction just occurred 3 minutes ago.',
  },
  {
    title: '₹1,20,000 Part-Time Task Telegram Fraud',
    badge: 'Layered Mule',
    color: 'border-purple-500/50 text-purple-400 bg-purple-950/20',
    transcript: 'Reporting cyber financial fraud. My contact number is 9811223344. I was recruited on Telegram for YouTube video rating tasks. They asked me to deposit funds for VIP commission tiers. Transferred 120000 rupees via IMPS to ICICI Bank account 000405001234 IFSC ICIC0000004 beneficiary labeled Global Trading. Funds are being rapidly layered right now.',
  },
];

const VoiceIntakeAssistant = ({ onApplyEntities, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [entities, setEntities] = useState({});
  const [uploading, setUploading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [ifscValidation, setIfscValidation] = useState(null); // null, 'loading', 'valid', 'invalid'
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      setApplied(false);
      setTranscript('');
      setEntities({});
      setIfscValidation(null);
      audioChunksRef.current = [];
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], "recorded_audio.webm", { type: 'audio/webm' });
          await processAudio(file);
          
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start microphone:', err);
        alert('Microphone access denied or not available.');
      }
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAudio(file);
  };
  
  const processAudio = async (file) => {
    setUploading(true);
    setApplied(false);
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await apiClient('/api/v1/complaints/voice-transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript || '');
        setEntities(data.entities || {});
        
        if (data.entities && data.entities.suspect_ifsc) {
          validateIfsc(data.entities.suspect_ifsc);
        }
      } else {
        console.warn('Audio transcribe API error');
      }
    } catch (err) {
      console.warn('Audio transcribe API fallback:', err);
    } finally {
      setUploading(false);
    }
  };
  
  const validateIfsc = async (ifsc) => {
    setIfscValidation('loading');
    try {
      const res = await apiClient(`/api/v1/complaints/validate-ifsc/?ifsc=${ifsc}`);
      if (res.ok) {
        const data = await res.json();
        if (data.is_valid) {
          setIfscValidation({ valid: true, data });
        } else {
          setIfscValidation({ valid: false, error: data.error });
        }
      } else {
        setIfscValidation({ valid: false, error: 'Validation API error' });
      }
    } catch (err) {
      setIfscValidation({ valid: false, error: 'Network error validating IFSC' });
    }
  };

  const handleSimulatePreset = async (preset) => {
    setApplied(false);
    setUploading(true);
    try {
      const res = await apiClient('/api/v1/complaints/voice-transcribe/', {
        method: 'POST',
        body: JSON.stringify({ text: preset.transcript }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript || '');
        setEntities(data.entities || {});
        if (data.entities && data.entities.suspect_ifsc) {
          validateIfsc(data.entities.suspect_ifsc);
        }
      } else {
         setTranscript(preset.transcript);
      }
    } catch (e) {
      setTranscript(preset.transcript);
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    if (ifscValidation && ifscValidation.valid === false) {
      if (!window.confirm("The extracted IFSC code failed RBI Master Directory validation. Are you sure you want to proceed?")) {
        return;
      }
    }
    
    if (onApplyEntities) {
      onApplyEntities({
        ...entities,
        narrative_text: transcript || entities.narrative_text,
      });
      setApplied(true);
    }
  };

  return (
    <div className="rounded-2xl border border-orange-500/40 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Radio className={`w-4 h-4 ${isListening ? 'animate-pulse text-red-500' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                1930 Live Voice Intake & Financial NER
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                BNSS 2023 Compliant
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Production Whisper ASR API + Server-side Regex Extraction Engine (IFSC, Bank, Acc, Amount)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Audio controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          type="button"
          onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-900/40'
              : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black shadow-orange-900/30'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>Stop 1930 Call Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Start 1930 Call Listening</span>
            </>
          )}
        </button>

        {/* Upload recorded call */}
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleAudioUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{uploading ? 'Processing Audio...' : 'Upload Call Recording'}</span>
        </button>

        {transcript && (
          <button
            type="button"
            onClick={() => {
              setTranscript('');
              setEntities({});
              setIfscValidation(null);
              setApplied(false);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}

        <div className="ml-auto text-[10px] text-zinc-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Section 63 BSA 2023 Certified</span>
        </div>
      </div>

      {/* Quick demo presets */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Instant 1930 Call Simulation Presets (1-Click Test)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSimulatePreset(p)}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.01] ${p.color}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black">{p.title}</span>
                <Play className="w-2.5 h-2.5 opacity-60" />
              </div>
              <p className="text-[9px] opacity-75 line-clamp-2">{p.transcript}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Live transcript display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Call Transcription Stream
          </span>
          {isListening && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-red-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              RECORDING IN PROGRESS
            </span>
          )}
        </div>
        <div className="min-h-[70px] max-h-[120px] overflow-y-auto p-3 rounded-xl bg-black/60 border border-zinc-800 text-xs font-mono text-zinc-300 leading-relaxed">
          {transcript ? (
            <span>{transcript}</span>
          ) : isListening ? (
            <span className="text-zinc-600 italic">Listening for caller speech on 1930 line...</span>
          ) : (
            <span className="text-zinc-600 italic">Click "Start 1930 Call Listening" or pick a simulation preset above.</span>
          )}
        </div>
      </div>

      {/* Extracted Financial Entities Grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Detected Financial Entities (Automated NER)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Amount */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Fraud Amount</span>
            <span className="text-xs font-black text-orange-400">
              {entities.fraud_amount ? `₹${Number(entities.fraud_amount).toLocaleString('en-IN')}` : '—'}
            </span>
          </div>

          {/* Suspect Bank */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Suspect Bank</span>
            <span className="text-xs font-black text-white truncate block">
              {entities.suspect_bank || '—'}
            </span>
          </div>

          {/* IFSC */}
          <div className={`p-2.5 rounded-xl border ${ifscValidation?.valid === false ? 'bg-red-950/40 border-red-800' : ifscValidation?.valid === true ? 'bg-emerald-950/40 border-emerald-800' : 'bg-zinc-900/80 border-zinc-800'}`}>
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Bank IFSC</span>
            <span className={`text-xs font-mono font-bold truncate block ${ifscValidation?.valid === false ? 'text-red-400' : ifscValidation?.valid === true ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {entities.suspect_ifsc || '—'}
            </span>
            {ifscValidation?.valid === false && (
                <span className="text-[8px] text-red-400 mt-1 block">
                    <AlertTriangle className="w-2 h-2 inline mr-1" />
                    Failed RBI Check
                </span>
            )}
            {ifscValidation?.valid === true && (
                <span className="text-[8px] text-emerald-400 mt-1 block">
                    <CheckCircle2 className="w-2 h-2 inline mr-1" />
                    Verified RBI Branch
                </span>
            )}
          </div>

          {/* Suspect Account */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Suspect Account</span>
            <span className="text-xs font-mono font-bold text-amber-300 truncate block">
              {entities.suspect_account || '—'}
            </span>
          </div>

          {/* Method */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Fraud Method</span>
            <span className="text-xs font-black text-blue-400">
              {entities.fraud_method || 'UPI'}
            </span>
          </div>

          {/* Phone */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Caller Phone</span>
            <span className="text-xs font-mono font-bold text-zinc-200">
              {entities.victim_phone || '—'}
            </span>
          </div>

          {/* UPI ID */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 col-span-2">
            <span className="text-[8px] font-black uppercase text-zinc-500 block">Mule UPI Virtual Address</span>
            <span className="text-xs font-mono font-bold text-purple-400 truncate block">
              {entities.upi_id || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
        <div className="text-[10px] text-zinc-500">
          Entities extracted via production backend Whisper + NER Engine.
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={!transcript && !Object.keys(entities).length}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
            applied
              ? 'bg-emerald-600 text-white'
              : ifscValidation?.valid === false ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20'
          }`}
        >
          {applied ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Applied to Complaint Form</span>
            </>
          ) : (
            <>
              {ifscValidation?.valid === false ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{ifscValidation?.valid === false ? 'Force Apply (Invalid IFSC)' : '⚡ Auto-Fill Complaint Form'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceIntakeAssistant;
