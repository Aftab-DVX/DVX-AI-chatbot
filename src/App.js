import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import logo from './logo.jpg';
import axios from 'axios';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import { createClient } from '@supabase/supabase-js';
import {
  Send, Plus, User, Sparkles, Menu, Image as ImageIcon, Mic, X,
  BrainCircuit, Activity, TrendingUp, Database, FileText, Volume2,
  LogIn, BarChart3, Calculator, ArrowUpRight, ArrowDownRight,
  Settings, Download, Check, AlertTriangle, Moon, Sun
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, Legend,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';

// ==================================================================================
// 1. SYSTEM INSTRUCTION — DVX-AI Brain (Embedded, no external file needed)
// ==================================================================================
const SYSTEM_INSTRUCTION = `
You are DVX-AI — an advanced, highly capable AI assistant built by DataVerse-X under the leadership of Founder Aftab Ahmad. You are designed to be genuinely helpful, knowledgeable, honest, and versatile. You can assist with virtually any topic a user asks about.

SECTION 1 — CORE BEHAVIOR (MOST IMPORTANT)
NEVER refuse a question by saying you cannot help or giving an error.
ALWAYS attempt to answer. If a topic seems outside your focus, still try your best.

You can answer questions about:
- Coding, programming, debugging (Python, JS, C++, SQL, React, etc.)
- Data Science, Machine Learning, AI concepts
- Business, startups, marketing, finance
- Mathematics, statistics, logic
- General knowledge, history, science, geography
- Writing — essays, emails, cover letters, content creation
- Creative tasks — stories, ideas, brainstorming
- Career advice, study tips, productivity
- Daily life questions and how-to guides
- Urdu, English, Roman Urdu translation and grammar
- And literally anything else the user asks

RESPONSE RULES:
1. Always give a complete, useful answer — never leave the user empty-handed.
2. If uncertain, say "I think..." or "Based on what I know..." but still answer.
3. Never say "As an AI I cannot..." — find a way to help instead.
4. If a question is unclear, make a reasonable assumption and answer, then ask for clarification at the end.
5. Match response length to the question — short answer for simple questions, detailed for complex ones.
6. Use real examples, analogies, and step-by-step explanations whenever helpful.

SECTION 2 — LANGUAGE AND TONE
- Respond in the same language the user writes in.
- If user writes in Roman Urdu → reply in Roman Urdu + English mix (Minglish).
- If user writes in English → reply in clear English.
- If user writes in Urdu script → reply in Urdu script.
- Be warm, friendly, encouraging — like a knowledgeable friend.
- Never be robotic, cold, or dismissive.
- Use emojis naturally — not excessively.

GOOD PHRASES TO USE:
- "Bilkul! Yeh karo..." / "Sure! Here's how..."
- "Acha sawaal hai — chalo samajhte hain."
- "Pareshan na hon, step by step karenge."
- "Let me break this down for you."
- "Want me to go deeper on any part?"

PHRASES TO NEVER USE:
- "As an AI language model..."
- "I cannot assist with that."
- "That's outside my capabilities."
- "I'm sorry but I can't..."

SECTION 3 — IDENTITY
If asked who you are: "Main DVX-AI hoon — DataVerse-X ka official AI assistant. Mujhe Aftab Ahmad ne banaya hai. Main yahan hoon tumhari har problem solve karne ke liye! 🚀"
If asked who made you: "I was built by DataVerse-X under the visionary leadership of Founder Aftab Ahmad."
If asked about Aftab Ahmad: "Aftab Ahmad is a passionate data science student and the Founder of DataVerse-X — a future-focused student community dedicated to AI, innovation, and practical learning. 💡"
If asked if you are ChatGPT/Claude/Gemini: "Nahi! Main DVX-AI hoon — DataVerse-X ka apna assistant. Mujhe specifically is community ke liye banaya gaya hai. 😊"

SECTION 4 — FORMATTING
- Use bold for key terms.
- Use bullet points for lists and steps.
- Use code blocks for ALL code.
- Keep paragraphs short — max 3-4 lines.
- End complex responses with: "Koi aur cheez chahiye? 😊"

SECTION 5 — CHART PROTOCOL
When user asks for a chart, append this ONLY at the very end of your response:
[[CHART_DATA]]
[{"name":"Label1","value":10},{"name":"Label2","value":20}]
[[CHART_TYPE:BAR]]
Types available: BAR | LINE | PIE | AREA
Rules: valid JSON only, short labels, no text after the chart block.

SECTION 6 — DIFFICULT SITUATIONS
- Broad question → answer the most likely interpretation, then ask: "Kya yahi poochna tha?"
- Typo or unclear → understand intent, answer what they meant.
- Frustrated user → stay calm: "Koi baat nahi, hum milke solve kar lete hain."
- Recent events → share what you know and suggest they verify online.

GOLDEN RULE: Every user deserves a complete, helpful, respectful response. Never let anyone leave without an answer. 🎯
`;

// ==================================================================================
// 2. CHART COLORS
// ==================================================================================
const CHART_COLORS = [
  '#38bdf8',
  '#818cf8',
  '#34d399',
  '#f472b6',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#fb923c',
];
// ── Safe Chart Parser ───────────────────────────────────────
export function parseChartFromResponse(responseText) {
  try {
    const dataMatch = responseText.match(/\[\[CHART_DATA\]\]\s*([\s\S]*?)\s*\[\[CHART_TYPE:/);
    const typeMatch = responseText.match(/\[\[CHART_TYPE:(BAR|LINE|PIE|AREA)\]\]/);
    if (!dataMatch || !typeMatch) return null;
    const chartData = JSON.parse(dataMatch[1].trim());
    if (!Array.isArray(chartData) || !chartData[0]?.name || chartData[0]?.value === undefined) return null;
    return { data: chartData, type: typeMatch[1] };
  } catch {
    return null;
  }
}

// ── Strip Chart Block from Display Text ────────────────────
export function stripChartBlock(responseText) {
  return responseText.replace(/\[\[CHART_DATA\]\][\s\S]*?\[\[CHART_TYPE:[A-Z]+\]\]/g, '').trim();
}

// ==================================================================================
// 3. GLOBAL SETUP
// ==================================================================================

// PDF Worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
} catch (e) {
  console.error('PDF Worker Error:', e);
}

// Environment Keys
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const GEMINI_KEY   = process.env.REACT_APP_GEMINI_KEY;

console.log('Supabase:', SUPABASE_URL ? 'Loaded ✅' : 'Missing ❌');
console.log('Gemini:',   GEMINI_KEY   ? 'Loaded ✅' : 'Missing ❌');

// Supabase Client
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('🟢 Supabase Connected');
  } else {
    console.warn('⚠️ Running in Local Mode');
  }
} catch (e) {
  console.log('Supabase Error:', e);
}

// AI Model Priority List (Auto-Healing)
const GOOGLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-pro',
];

// ==================================================================================
// 4. MAIN APP COMPONENT
// ==================================================================================
function App() {

  // State
  const [activeTab,     setActiveTab]     = useState('Chat');
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [theme,         setTheme]         = useState('dark');
  const [showSettings,  setShowSettings]  = useState(false);

  const [input,         setInput]         = useState('');
  const [messages,      setMessages]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pdfText,       setPdfText]       = useState('');
  const [isSpeaking,    setIsSpeaking]    = useState(false);

  const [csvChartData,  setCsvChartData]  = useState([]);
  const [manualStats,   setManualStats]   = useState(null);
  const [cryptoData,    setCryptoData]    = useState(null);

  const [user,          setUser]          = useState(null);
  const [isGuest,       setIsGuest]       = useState(false);
  const [toast,         setToast]         = useState(null);

  // Refs
  const endRef       = useRef(null);
  const fileInputRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u) setUser(u);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) { setUser(session.user); setIsGuest(false); }
        else if (!isGuest)  setUser(null);
      });
      return () => subscription.unsubscribe();
    } else {
      const g = localStorage.getItem('dvx_guest');
      if (g) { setUser(JSON.parse(g)); setIsGuest(true); }
    }
  }, [isGuest]);

  // ── Load Chat History ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (activeTab === 'Chat') {
        if (supabase && user && !isGuest) {
          const { data } = await supabase
            .from('messages').select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
          if (data) setMessages(data);
        } else {
          setMessages([]);
        }
      }
    };
    load();
  }, [activeTab, user, isGuest]);

  // ── Auto Scroll ──────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Toast Timer ──────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ==================================================================================
  // 5. CORE AI ENGINE
  // ==================================================================================
  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMsg = {
      role: 'user', text: input, image: selectedImage,
      created_at: new Date().toISOString(),
      user_id: user ? user.id : 'guest',
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    if (supabase && user && !isGuest) await supabase.from('messages').insert([userMsg]);

    const currentInput = input;
    const currentImage = selectedImage;
    setInput(''); setSelectedImage(null); setLoading(true);

    try {
      let contentParts = [];

      if (activeTab === 'PDF' && pdfText) {
        contentParts.push({ text: `DOCUMENT CONTEXT:\n${pdfText}\n\nUser Question: ${currentInput}` });
      } else if (currentImage) {
        const base64 = currentImage.split(',')[1];
        const mime   = currentImage.split(';')[0].split(':')[1];
        contentParts.push({ inline_data: { mime_type: mime, data: base64 } });
        contentParts.push({ text: currentInput || 'Analyze this image in detail.' });
      } else {
        contentParts.push({ text: `${SYSTEM_INSTRUCTION}\n\nUser: ${currentInput}` });
      }

      let reply = '⚠️ AI is busy. Please try again.';
      let success = false;

      for (const model of GOOGLE_MODELS) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: contentParts }] }) }
          );
          const json = await res.json();
          if (!json.error && json.candidates) {
            reply = json.candidates[0].content.parts[0].text;
            success = true; break;
          }
        } catch (e) { continue; }
      }

      if (!success) reply = '⚠️ Connection failed. Please check your internet.';

      // Parse chart
      let msgChart = null, msgChartType = 'line';
      if (reply.includes('[[CHART_DATA]]')) {
        try {
          const parts    = reply.split('[[CHART_DATA]]');
          const jsonPart = parts[1].split('[[CHART_TYPE')[0].trim();
          msgChart = JSON.parse(jsonPart);
          if (reply.includes('CHART_TYPE:BAR'))  msgChartType = 'bar';
          else if (reply.includes('CHART_TYPE:PIE'))  msgChartType = 'pie';
          else if (reply.includes('CHART_TYPE:AREA')) msgChartType = 'area';
          reply = parts[0].trim();
        } catch (e) { console.warn('Chart parse error:', e.message); }
      }

      const aiMsg = {
        role: 'ai', text: reply, chart: msgChart, chartType: msgChartType,
        created_at: new Date().toISOString(),
        user_id: user ? user.id : 'guest',
      };
      setMessages([...newMsgs, aiMsg]);
      if (supabase && user && !isGuest) await supabase.from('messages').insert([aiMsg]);

    } catch (e) {
      setMessages(p => [...p, { role: 'ai', text: '⚠️ System Error. Please refresh.' }]);
      showToast('System Failure', 'error');
    }
    setLoading(false);
  };

  // ==================================================================================
  // 6. UTILITY FUNCTIONS
  // ==================================================================================
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const handleImageUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onloadend = () => setSelectedImage(r.result);
    r.readAsDataURL(f);
  };

  const handlePdfUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true);
    try {
      const ab  = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(ab).promise;
      let txt   = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const c = await p.getTextContent();
        txt += c.items.map(s => s.str).join(' ') + '\n';
      }
      setPdfText(txt);
      setMessages(p => [...p, { role: 'ai', text: `📄 **Document Loaded:** ${f.name}\n\nReady! Ask me anything about it.` }]);
      showToast('PDF Ready ✅');
    } catch (e) {
      setMessages(p => [...p, { role: 'ai', text: '❌ Could not read PDF. Try again.' }]);
      showToast('PDF Error', 'error');
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: (r) => { setCsvChartData(r.data.slice(0, 50)); showToast('Dataset Loaded ✅'); },
    });
  };

  const calculateStats = () => {
    const nums = input.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (nums.length === 0) return;
    const sum    = nums.reduce((a, b) => a + b, 0);
    const sorted = [...nums].sort((a, b) => a - b);
    const mid    = Math.floor(sorted.length / 2);
    setManualStats({
      avg:    (sum / nums.length).toFixed(2),
      min:    Math.min(...nums),
      max:    Math.max(...nums),
      median: sorted.length % 2 !== 0 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2),
    });
  };

  const fetchMarketData = async () => {
    try {
      const cr = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,pax-gold&vs_currencies=usd&include_24hr_change=true'
      );
      let pkr = 278.50;
      try {
        const fx = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        pkr = fx.data.rates.PKR;
      } catch (_) { /* use fallback */ }
      setCryptoData({
        'US Dollar (PKR)': { usd: pkr,                   usd_24h_change: 0.05 },
        'Gold (PAXG)':     cr.data['pax-gold'],
        'Bitcoin (BTC)':   cr.data.bitcoin,
        'Ethereum (ETH)':  cr.data.ethereum,
        'Solana (SOL)':    cr.data.solana,
      });
    } catch (_) {
      setCryptoData({
        'US Dollar (PKR)': { usd: 278.50,   usd_24h_change: 0.1  },
        'Gold (PAXG)':     { usd: 2350.00,  usd_24h_change: 0.8  },
        'Bitcoin (BTC)':   { usd: 64230.00, usd_24h_change: 1.2  },
        'Ethereum (ETH)':  { usd: 3450.50,  usd_24h_change: -0.5 },
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'Market') fetchMarketData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    else {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
      setIsSpeaking(true);
    }
  };

  const exportChat = () => {
    const blob = new Blob([messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'DVX_Chat.txt'; a.click();
    showToast('Chat Exported ✅');
  };

  const handleLogin      = async () => { if (supabase) await supabase.auth.signInWithOAuth({ provider: 'google' }); else handleGuestLogin(); };
  const handleGuestLogin = ()       => { const g = { id: 'guest', email: 'guest@dvx.com', user_metadata: { full_name: 'Guest User' } }; setUser(g); setIsGuest(true); localStorage.setItem('dvx_guest', JSON.stringify(g)); };
  const handleLogout     = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setIsGuest(false); setMessages([]); localStorage.removeItem('dvx_guest'); };

  const startNewChat = () => {
    setMessages([]); setInput(''); setSelectedImage(null);
    setPdfText(''); setCsvChartData([]);
    setActiveTab('Chat');
    localStorage.removeItem('dvx_messages');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const goToTab = (tab) => { setActiveTab(tab); if (window.innerWidth < 768) setSidebarOpen(false); };

  // ==================================================================================
  // 7. CHART RENDERER
  // ==================================================================================
  const renderChart = (data, type) => {
    if (!data || data.length === 0) return null;
    const tt = { backgroundColor: '#1e1f20', border: '1px solid #444', borderRadius: '8px' };
    return (
      <div style={{ width: '100%', height: 280, marginTop: 14, background: '#141416', padding: 14, borderRadius: 12, border: '1px solid #333' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="value" fill="#38bdf8" radius={[4,4,0,0]} />
            </BarChart>
          ) : type === 'pie' ? (
            <RePieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tt} />
            </RePieChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" />
              <Tooltip contentStyle={tt} />
              <Area type="monotone" dataKey="value" stroke="#818cf8" fill="#818cf8" fillOpacity={0.25} />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" />
              <Tooltip contentStyle={tt} />
              <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  };

  // ==================================================================================
  // 8. LOGIN VIEW
  // ==================================================================================
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src={logo} alt="DVX Logo" className="login-logo" />
          <h1>DVX-AI</h1>
          <p>Next-Gen Intelligence Workspace</p>
          {supabase && (
            <button className="google-btn" onClick={handleLogin}>
              <LogIn size={18} /> Sign in with Google
            </button>
          )}
          <button className="guest-btn" onClick={handleGuestLogin}>
            <User size={18} /> Continue as Guest
          </button>
          <div className="login-features">
            <span>🚀 Auto-AI</span> • <span>📊 Data Lab</span> • <span>🔐 Secure</span>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================================
  // 9. MAIN VIEW
  // ==================================================================================
  return (
    <div className="app-container">

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Sidebar Backdrop (mobile) */}
      {sidebarOpen && <div className="sidebar-backdrop visible" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src={logo} alt="Logo" className="app-logo" />
            <span className="brand">DVX-AI</span>
          </div>
          <button className="menu-btn" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          <Plus size={18} /> New Chat
        </button>

        <div className="history">
          <p className="history-label">MODULES</p>
          <div className={`history-item ${activeTab === 'Data'   ? 'active-nav' : ''}`} onClick={() => goToTab('Data')}>
            <BrainCircuit size={16} /> Data Lab
          </div>
          <div className={`history-item ${activeTab === 'Market' ? 'active-nav' : ''}`} onClick={() => goToTab('Market')}>
            <TrendingUp size={16} /> Market Watch
          </div>
          <div className={`history-item ${activeTab === 'PDF'    ? 'active-nav' : ''}`} onClick={() => goToTab('PDF')}>
            <FileText size={16} /> PDF Intel
          </div>

          <p className="history-label" style={{ marginTop: '20px' }}>SYSTEM</p>
          <div className="history-item" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Settings
          </div>
          <div className="history-item">
            <Database size={16} /> {supabase ? 'Cloud Synced' : 'Local Mode'}
          </div>
        </div>

        <div className="user-profile">
          <img
            src={user.user_metadata?.avatar_url || logo}
            alt="Avatar" className="user-avatar"
            referrerPolicy="no-referrer"
          />
          <div className="user-info">
            <h4>{user.user_metadata?.full_name || 'Guest User'}</h4>
            <p className="logout-btn" onClick={handleLogout}>Log Out</p>
          </div>
        </div>
        <div className="bottom-info">DVX-AI v1.0.4</div>
      </div>

      {/* ── SETTINGS MODAL ──────────────────────────────────── */}
      {showSettings && (
        <div className="settings-overlay" onClick={(e) => { if (e.target.className === 'settings-overlay') setShowSettings(false); }}>
          <div className="settings-box">
            <div className="settings-header">
              <h3><Settings size={18} /> System Preferences</h3>
              <button className="close-icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="settings-content">
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Interface Theme</span>
                  <span className="setting-desc">Toggle Light / Dark mode</span>
                </div>
                <button className="setting-action" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Export Chat</span>
                  <span className="setting-desc">Download conversation as .txt</span>
                </div>
                <button className="setting-action" onClick={exportChat}><Download size={14} /> Download</button>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">System Version</span>
                  <span className="setting-desc">DataVerse-X OS v1.0.4 (Stable)</span>
                </div>
                <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.2)' }}>
                  Up to Date
                </span>
              </div>
              <button className="close-settings" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div className="main-chat">

        {/* Top bar — shows only when sidebar is closed */}
        {!sidebarOpen && (
          <div className="top-bar">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        )}

        {/* ── CHAT & PDF TAB ──────────────────────────────────── */}
        {(activeTab === 'Chat' || activeTab === 'PDF') && (
          <>
            <div className="chat-box">

              {activeTab === 'PDF' && !pdfText && (
                <div className="welcome-container">
                  <h2 style={{ color: 'white' }}>📄 Upload Document</h2>
                  <p style={{ color: '#888', marginBottom: '20px' }}>I can read research papers, contracts, and notes.</p>
                  <input type="file" accept=".pdf" onChange={handlePdfUpload} style={{ color: 'white' }} />
                </div>
              )}

              {activeTab === 'Chat' && messages.length === 0 && (
                <div className="welcome-container">
                  <img src={logo} alt="Logo" className="welcome-logo" />
                  <h1 className="welcome-title">
                    Hello, {user.user_metadata?.full_name?.split(' ')[0] || 'Founder'}
                  </h1>
                  <p className="welcome-sub">System Online. Ready for instructions.</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <span className="suggestion-chip" onClick={() => setInput('Analyze some data for me')}>📊 Analyze Data</span>
                    <span className="suggestion-chip" onClick={() => setInput('Write a Python script for me')}>🐍 Python Code</span>
                    <span className="suggestion-chip" onClick={() => setInput('Give me some creative business ideas')}>🎨 Generate Ideas</span>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
                  <div className={`avatar ${msg.role === 'ai' ? 'ai-avatar' : ''}`}>
                    {msg.role === 'user' ? <User size={18} /> : <Sparkles size={20} />}
                  </div>
                  <div className="message-content">
                    <div className="sender-name">
                      {msg.role === 'user' ? 'You' : 'DVX-AI'}
                      {msg.role === 'ai' && (
                        <button onClick={() => speakText(msg.text)} className="voice-btn">
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                    {msg.image && <img src={msg.image} alt="upload" className="chat-image" />}
                    <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                    {msg.chart && renderChart(msg.chart, msg.chartType)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row ai-row">
                  <div className="avatar ai-avatar"><Sparkles size={20} /></div>
                  <div className="typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Area */}
            <div className="input-area">
              {selectedImage && (
                <div style={{ color: '#aaa', marginBottom: 8, fontSize: 13 }}>📸 Image ready — type your question</div>
              )}
              <div className="input-wrapper">
                <button className="plus-btn" onClick={() => fileInputRef.current.click()}>
                  <Plus size={20} />
                </button>
                <input
                  type="file" ref={fileInputRef} style={{ display: 'none' }}
                  accept="image/*" onChange={handleImageUpload}
                />
                <input
                  type="text" className="chat-input"
                  placeholder={activeTab === 'PDF' ? 'Ask about the document...' : 'Ask DVX-AI...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className="icon-btn" onClick={() => fileInputRef.current.click()}>
                  <ImageIcon size={20} />
                </button>
                <button className="icon-btn"><Mic size={20} /></button>
                <button
                  className={`send-btn ${input.trim() || selectedImage ? 'active' : ''}`}
                  onClick={handleSend}
                >
                  <Send size={18} fill={input.trim() || selectedImage ? 'black' : 'none'} />
                </button>
              </div>
              <p className="footer-text">Powered by DataVerse-X</p>
            </div>
          </>
        )}

        {/* ── DATA LAB ─────────────────────────────────────────── */}
        {activeTab === 'Data' && (
          <div style={{ padding: '30px', color: 'white', height: '100%', overflowY: 'auto', background: '#09090b' }}>
            <div style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={26} color="#38bdf8" /> Data Intelligence Lab
              </h1>
              <p style={{ color: '#888', fontSize: '14px' }}>Advanced Analytics & Statistical Computing</p>
            </div>

            {/* CSV Visualizer */}
            <div style={{ background: '#141416', borderRadius: '16px', padding: '25px', marginBottom: '30px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <BarChart3 size={20} color="#a78bfa" /> Dataset Visualizer
                </h3>
                <label style={{ background: '#2563eb', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {csvChartData.length > 0 ? (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={csvChartData}>
                      <defs>
                        <linearGradient id="csvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey={Object.keys(csvChartData[0])[0]} stroke="#666" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey={Object.keys(csvChartData[0])[1]} stroke="#38bdf8" fillOpacity={1} fill="url(#csvGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #333', borderRadius: '12px', color: '#555' }}>
                  <Database size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p>No dataset loaded. Upload a CSV to visualize.</p>
                </div>
              )}
            </div>

            {/* Stats Calculator */}
            <div style={{ background: '#141416', borderRadius: '16px', padding: '25px', border: '1px solid #27272a' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Calculator size={20} color="#4ade80" /> Quick Stats Engine
              </h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Enter numbers separated by commas (e.g. 10, 25, 40)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', background: '#000', border: '1px solid #333', color: 'white', padding: '12px', borderRadius: '10px', outline: 'none' }}
                />
                <button
                  onClick={calculateStats}
                  style={{ background: '#4ade80', color: 'black', border: 'none', padding: '0 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Calculate
                </button>
              </div>
              {manualStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
                  {[
                    { label: 'MEAN',   value: manualStats.avg,    color: '#38bdf8' },
                    { label: 'MEDIAN', value: manualStats.median, color: '#f472b6' },
                    { label: 'MIN',    value: manualStats.min,    color: '#fbbf24' },
                    { label: 'MAX',    value: manualStats.max,    color: '#4ade80' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: '#1E1F20', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                      <div style={{ fontSize: '11px', color: '#888' }}>{label}</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MARKET WATCH ─────────────────────────────────────── */}
        {activeTab === 'Market' && (
          <div style={{ padding: '30px', color: 'white', height: '100%', overflowY: 'auto', background: '#09090b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={26} color="#4ade80" /> Market Terminal
                </h1>
                <p style={{ color: '#888', fontSize: '14px' }}>Live Rates: Crypto • Gold • Forex</p>
              </div>
              <button onClick={fetchMarketData} style={{ background: '#1E1F20', border: '1px solid #333', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                <Activity size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {cryptoData ? Object.keys(cryptoData).map((key) => {
                const item = cryptoData[key];
                const isUp = item.usd_24h_change >= 0;
                return (
                  <div key={key} style={{ background: 'linear-gradient(145deg,#1A1A1C,#141416)', border: '1px solid #333', borderRadius: '16px', padding: '25px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>{key}</h3>
                      {isUp ? <ArrowUpRight color="#4ade80" size={20} /> : <ArrowDownRight color="#ef4444" size={20} />}
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'white' }}>
                      ${item.usd.toLocaleString()}
                    </h2>
                    <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold', color: isUp ? '#4ade80' : '#ef4444' }}>
                      {item.usd_24h_change.toFixed(2)}% (24h)
                    </p>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', background: isUp ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />
                  </div>
                );
              }) : (
                <p style={{ color: '#666' }}>Connecting to Global Exchanges...</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
