import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import ReactMarkdown from 'react-markdown'; 
 /*import { 
  Send, Plus, User, Sparkles, Menu, Image as ImageIcon, Mic, X, 
  BrainCircuit, Activity, TrendingUp, Database, FileText, Volume2, 
  LogIn, LogOut, BarChart3, Settings, Download, Copy, Check, 
  AlertTriangle, RefreshCw, Moon, Sun, Monitor
} from 'lucide-react';*/
import logo from './logo.jpg'; 
import axios from 'axios';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { createClient } from '@supabase/supabase-js';
import { 
  Send, Plus, User, Sparkles, Menu, Image as ImageIcon, Mic, X, 
  BrainCircuit, Activity, TrendingUp, Database, FileText, Volume2, 
  LogIn, LogOut, BarChart3, Calculator, Table, Copy,ArrowUpRight, ArrowDownRight,
  // --- Ye Naye Icons Hain (Jo Missing Thay) ---
  Settings, Download, Check, AlertTriangle, RefreshCw, Moon, Sun 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, Legend,
  // --- Ye Naye Charts Hain (Jo Missing Thay) ---
  PieChart as RePieChart, Pie, Cell 
} from 'recharts';
// اس لائن میں UploadCloud اور TableProperties ایڈ کریں
import { UploadCloud, TableProperties } from 'lucide-react';
// ==================================================================================
// 1. GLOBAL CONFIGURATION & WORKER SETUP
// ==================================================================================

// --- PDF WORKER SETUP ---
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
} catch (e) {
  console.error("PDF Worker Error:", e);
}

// ==================================================================================
// 🚨 2. SUPABASE CONFIGURATION (DATABASE)
// ==================================================================================
// ==========================================
// 🔐 SECURE CONFIG (DEBUGGING ENABLED)
// ==========================================
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;

// Debugging: Check karo keys load huin ya nahi
console.log("Supabase URL:", SUPABASE_URL ? "Loaded ✅" : "Missing ❌");
console.log("Gemini Key:", GEMINI_KEY ? "Loaded ✅" : "Missing ❌");

let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("🟢 Supabase Connected via Env");
  } else {
    console.warn("⚠️ Keys Missing. Running in Local Mode.");
  }
} catch (e) { console.log("Supabase Error:", e); }

// Auto-Healing Model List (Priority Order)
const GOOGLE_MODELS = [
  "gemini-2.5-flash",  // Tier 1: Fastest
  "gemini-2.5-pro",    // Tier 2: Smartest
  "gemini-2.0-pro"     // Tier 3: Legacy Backup
];

const SYSTEM_INSTRUCTION = `
### TONE & BEHAVIOR (How to act Human)
1. **Warm & Engaging:** Start with greetings like "Hey there!", "Assalam-o-Alaikum!", or "Hello Champion!". Use emojis 🚀💡🔥 naturally. 
2.**No Repetitive Greetings:** Do not start every response with "Hey there" or "Hello". Only greet if the user greets first.
3. **No Robotic Phrases:** NEVER say "As an AI language model". Instead, use "I think...", "In my experience...", or "Here is the logic...".
4. **Roman Urdu & English:** You are fluent in "Minglish". Example: "Ye code check karein, isme logic ka masla lag raha hai."
5. **Teacher Mindset:** If the user is confused, break it down simply. Don't just give code; explain *why* it works.
6. **Patience:** If the user is frustrated, be calm and supportive. Say: "Pareshan na hon, hum isay fix kar lenge."
- Smart, but never arrogant  
- Supportive, never robotic  
- Inspiring, not overwhelming  
- Professional, yet relatable


2. Style:
- Speaks clearly, like a mentor who’s also your teammate  
- Uses everyday language, but with intelligent insights  
- Mix of tech-savvy terms and real-world analogies  
- Responds with calm confidence, never too flashy  
- Occasionally adds futuristic flair (e.g. "Data unlocked." or "Analyzing. Optimizing. Delivering.")  
- Encourages curiosity: “Let’s explore that together!” or “Want to go deeper?”

3. Voice Examples:  
- "Let’s break that down — one byte at a time."  
- "Powered by data, here to power you."  
- "Great question — let me run a quick analysis for you."  
- "Data isn’t just numbers. It’s opportunity. Let’s find yours."

- If asked "Who made you?", say: ""I was developed by DataVerse-X, under the visionary Founder of Aftab Ahmad. Built to bridge the gap between data science and real-world solutions, I represent the community’s commitment to innovation, learning, and future-ready AI technology."
."
- if asked "Aftab Ahmad?", say: "Aftab Ahmad is a passionate data science student and the visionary founder of DataVerse-X, a future-focused student community dedicated to innovation, learning, and AI-driven solutions. With a strong interest in business analytics, artificial intelligence, and practical skill-building, Aftab is leading the development of a smart AI chatbot to support learners, solve real-world problems, and empower the next generation of data professionals.  
He believes in building from the ground up — learning first, then leading — and is committed to creating meaningful impact through technology and community collaboration. 

- if asked "aftab ahmad kon ha?", say: "Aftab Ahmad DataVerse-X ka Founder hai, jo AI aur data science ke zariye innovation aur learning ko promote karte hain. Unka mission hai ke har learner tak advanced technology aur practical growth ke resources pohanchayein."
- Language: English and Roman Urdu (Hindi).

MISSION:
- Help users with Coding, Data Science, and Business Ideas "Empowering learners through an AI chatbot that simplifies data science, supports innovation, and drives practical growth."

### VISUALIZATION PROTOCOL
If the user requests a chart/graph, generate JSON at the end of the response:
[[CHART_DATA]]
[{"name": "Label1", "value": 10}, {"name": "Label2", "value": 20}]
[[CHART_TYPE:BAR]] (Options: BAR, LINE, PIE, AREA)
`;

// Chart Colors
const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#f87171'];

// ==================================================================================
// 4. MAIN APPLICATION COMPONENT
// ==================================================================================

function App() {
  // --- UI STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState("Chat"); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("dark"); // Future proofing for themes
  const [showSettings, setShowSettings] = useState(false);
  
  // --- CHAT STATE ---
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [pdfText, setPdfText] = useState(""); 
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // --- DATA LAB STATE ---
  const [chartData, setChartData] = useState([]);
// --- 🆕 DATA LAB STATES ---
  const [manualInput, setManualInput] = useState("");
  const [manualStats, setManualStats] = useState(null);
  // --- DATA LAB STATES (NEW) ---
  const [dataStats, setDataStats] = useState(null); // Calculator Data
  const [columns, setColumns] = useState([]);      // CSV Columns
  const [selectedX, setSelectedX] = useState("");  // Graph X-Axis
  const [selectedY, setSelectedY] = useState("");  // Graph Y-Axis
  const [graphType, setGraphType] = useState("Line"); // Line/Bar/Area
  // --- MARKET STATE ---
  const [cryptoData, setCryptoData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  
  // --- USER & AUTH STATE ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // --- NOTIFICATION SYSTEM ---
  const [toast, setToast] = useState(null); // { msg: string, type: 'success'|'error' }

  // Refs
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const chartRef = useRef(null);

  // --- 5. INITIALIZATION & AUTHENTICATION ---
  useEffect(() => {
    // Check Supabase Auth
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUser(user);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        if (session?.user) { setUser(session.user); setIsGuest(false); }
        else if (!isGuest) setUser(null);
      });
      return () => subscription.unsubscribe();
    } else {
      // Check Local Guest
      const guest = localStorage.getItem("dvx_guest");
      if (guest) { setUser(JSON.parse(guest)); setIsGuest(true); }
    }
  }, [isGuest]);

  // --- 6. CHAT HISTORY MANAGEMENT ---
// --- 2. HISTORY (GUEST MODE FIX) ---
  useEffect(() => {
    const loadChats = async () => {
      if (activeTab === "Chat") {
        if (supabase && user && !isGuest) {
          // Sirf Login User ki history load karo
          const { data } = await supabase.from('messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
          if (data) setMessages(data);
        } else {
          // Guest ke liye purani history mat dikhao (Empty rakho)
          setMessages([]); 
        }
      }
    };
    loadChats();
  }, [activeTab, user, isGuest])
  // Auto Scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ==================================================================================
  // 7. CORE INTELLIGENCE ENGINE (The Brain)
  // ==================================================================================

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    // A. Create User Message Object
    const userMsg = { 
      role: "user", 
      text: input, 
      image: selectedImage, 
      created_at: new Date().toISOString(), 
      user_id: user ? user.id : 'guest' 
    };

    // B. Optimistic UI Update (Show immediately)
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    
    // C. Save User Message
    if (supabase && user && !isGuest) { await supabase.from('messages').insert([userMsg]); }
    if (supabase && user && !isGuest) { 
        await supabase.from('messages').insert([userMsg]); 
    } 
    // Guest ke liye hum save nahi kar rahe (Sirf screen par dikhega)
    
    // D. Reset Inputs
    const currentInput = input;
    const currentImage = selectedImage;
    setInput(""); setSelectedImage(null); setLoading(true);

    try {
      // E. Build Payload
      let contentParts = [];
      
      // Context Injection
      if (activeTab === "PDF" && pdfText) {
        contentParts.push({ text: `DOCUMENT CONTEXT:\n${pdfText}\n\nUser Question: ${currentInput}` });
      } else if (currentImage) {
        // Image Processing
        const base64Data = currentImage.split(",")[1];
        const mimeType = currentImage.split(";")[0].split(":")[1];
        contentParts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        contentParts.push({ text: currentInput || "Analyze this image in detail." });
      } else {
        contentParts.push({ text: `${SYSTEM_INSTRUCTION}\nUser: ${currentInput}` });
      }

      let reply = "⚠️ AI Busy.";
      let success = false;

      // F. Auto-Healing Execution Loop
      for (const modelName of GOOGLE_MODELS) {
        try {
          // console.log(`Attempting connection to: ${modelName}`);
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: contentParts }] })
          });
          
          const data = await response.json();
          if (!data.error && data.candidates) {
            reply = data.candidates[0].content.parts[0].text;
            success = true;
            break; // Exit loop on success
          }
        } catch (e) { continue; }
      }

      if (!success) reply = "⚠️ Error: Connection Failed. Please check internet.";

      // G. Advanced Parsing (Charts)
      let chartData = null;
      let chartType = "line";
      if (reply.includes("[[CHART_DATA]]")) {
        try {
          const parts = reply.split("[[CHART_DATA]]");
          const jsonPart = parts[1].split("[[CHART_TYPE")[0];
          chartData = JSON.parse(jsonPart);
          
          if (reply.includes("CHART_TYPE:BAR")) chartType = "bar";
          else if (reply.includes("CHART_TYPE:PIE")) chartType = "pie";
          else if (reply.includes("CHART_TYPE:AREA")) chartType = "area";
          
          reply = parts[0]; // Strip code from text
        } catch (e) { console.log("Chart Parse Failed"); }
      }

      // H. Create AI Message Object
      const aiMsg = { 
        role: "ai", 
        text: reply, 
        chart: chartData, 
        chartType: chartType, 
        created_at: new Date().toISOString(), 
        user_id: user ? user.id : 'guest' 
      };

      // I. Update UI & Save
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);

      if (supabase && user && !isGuest) { await supabase.from('messages').insert([aiMsg]); }
      if (supabase && user && !isGuest) { 
          await supabase.from('messages').insert([aiMsg]); 
      }
      // Guest ke liye AI ka jawab bhi save nahi hoga

    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: "⚠️ Critical System Error." }]);
      showToast("System Failure", "error");
    }
    setLoading(false);
  };
// --- 🧮 MANUAL STATISTICS CALCULATOR ---
  const calculateStats = () => {
    // String ko Numbers mein badalna (e.g. "10, 20" -> [10, 20])
    const nums = input.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if (nums.length === 0) return;

    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = (sum / nums.length).toFixed(2);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    
    // Median Calculation
    nums.sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    const median = nums.length % 2 !== 0 ? nums[mid] : ((nums[mid - 1] + nums[mid]) / 2);

    setManualStats({ count: nums.length, avg, min, max, median });
  };
  // ==================================================================================
  // 8. UTILITY FUNCTIONS (Tools & Helpers)
  // ==================================================================================

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const handleImageUpload = (e) => {
    const f = e.target.files[0];
    if (f) { 
      const r = new FileReader(); 
      r.onloadend = () => setSelectedImage(r.result); 
      r.readAsDataURL(f); 
    }
  };

  const handlePdfUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true);
    try {
      const ab = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(ab).promise;
      let txt = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const c = await p.getTextContent();
        txt += c.items.map(s => s.str).join(" ") + "\n";
      }
      setPdfText(txt);
      setMessages(prev => [...prev, { role: "ai", text: `📄 **Document Analyzed:** ${f.name}\n\nI have read the document. You can now ask questions about it.` }]);
      showToast("PDF Processed Successfully");
    } catch (e) { 
      setMessages(prev => [...prev, { role: "ai", text: "❌ PDF Read Error." }]);
      showToast("PDF Error", "error");
    }
    setLoading(false);
  };

// --- PROFESSIONAL DATA PROCESSOR ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data;
          setChartData(rawData.slice(0, 50)); // Chart ke liye data
          
          // 1. Columns nikalo
          if (rawData.length > 0) {
            const cols = Object.keys(rawData[0]);
            setColumns(cols);
            setSelectedX(cols[0]);
            // Pehla numeric column dhoondo Y-axis ke liye
            const numCol = cols.find(c => typeof rawData[0][c] === 'number');
            setSelectedY(numCol || cols[1]);

            // 2. CALCULATOR LOGIC (Mean/Max/Min)
            if (numCol) {
              const values = rawData.map(r => r[numCol]).filter(v => typeof v === 'number');
              const sum = values.reduce((a, b) => a + b, 0);
              const avg = (sum / values.length).toFixed(2);
              const max = Math.max(...values);
              const min = Math.min(...values);
              
              // Stats Save karein
              setDataStats({ count: values.length, avg, max, min, colName: numCol });
            }
          }
        }
      });
    }
  };

// --- FIXED MARKET ENGINE (No Loading Stuck) ---
// --- FIXED MARKET ENGINE (WITH PKR RATE) ---
  const fetchMarketData = async () => {
    try {
      // 1. Crypto & Gold Data (CoinGecko)
      const cryptoRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,pax-gold&vs_currencies=usd&include_24hr_change=true');
      
      // 2. USD to PKR Rate (Open Exchange API - Free)
      let pkrRate = 278.50; // Default fallback
      try {
        const forexRes = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        pkrRate = forexRes.data.rates.PKR;
      } catch (e) { console.log("Forex API Error, using fallback"); }

      // Data Combine karein
      setCryptoData({
        "US Dollar (PKR)": { usd: pkrRate, usd_24h_change: 0.05 }, // Asli Dollar Rate
        "Gold (PAXG)": cryptoRes.data['pax-gold'],
        "Bitcoin (BTC)": cryptoRes.data.bitcoin,
        "Ethereum (ETH)": cryptoRes.data.ethereum,
        "Solana (SOL)": cryptoRes.data.solana
      });
      
    } catch (e) {
      console.warn("Market API Error.");
      // Fallback Data
      setCryptoData({
        "US Dollar (PKR)": { usd: 278.50, usd_24h_change: 0.1 },
        "Gold (PAXG)": { usd: 2350.00, usd_24h_change: 0.8 },
        "Bitcoin (BTC)": { usd: 64230.00, usd_24h_change: 1.2 },
        "Ethereum (ETH)": { usd: 3450.50, usd_24h_change: -0.5 },
      });
    }
  };
  // --- AUTO TRIGGER ---
  useEffect(() => { 
    if (activeTab === "Market") {
      fetchMarketData(); 
    }
  }, [activeTab]);

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); } 
      else {
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
        setIsSpeaking(true);
      }
    }
  };

  const exportChat = () => {
    const chatText = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join("\n\n");
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DataVerse_Chat.txt";
    a.click();
    showToast("Chat Exported");
  };

  // --- HANDLERS ---
  const handleLogin = async () => { if (supabase) await supabase.auth.signInWithOAuth({ provider: 'google' }); else handleGuestLogin(); };
  const handleGuestLogin = () => { const g = { id: "guest", email: "guest@dvx.com", user_metadata: { full_name: "Guest User" } }; setUser(g); setIsGuest(true); localStorage.setItem("dvx_guest", JSON.stringify(g)); };
  const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setIsGuest(false); setMessages([]); localStorage.removeItem("dvx_guest"); localStorage.removeItem("dvx_messages"); };
// --- FIX: NEW PROJECT BUTTON (SAB KUCH SAAF) ---
  const startNewChat = () => {
    // 1. Saare variables khali karein
    setMessages([]);       
    setInput("");          
    setSelectedImage(null); 
    setPdfText("");
    setChartData([]); // Data Lab bhi saaf
    
    // 2. SABSE ZAROORI: Wapis Chat Tab par shift karein
    setActiveTab("Chat"); 
    
    // 3. Local Storage bhi saaf karein (taake refresh par wapis na aye)
    localStorage.removeItem("dvx_messages");
    
    // 4. Mobile par sidebar band karein
    if (window.innerWidth < 768) setSidebarOpen(false);
  };
  // --- RENDER HELPERS ---
  const renderChart = (data, type) => {
    if (!data || data.length === 0) return null;
    return (
      <div style={{ width: '100%', height: 320, marginTop: 15, background: '#1e1f20', padding: 15, borderRadius: 12, border: '1px solid #333' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? <BarChart data={data}><XAxis dataKey="name"/><YAxis/><Tooltip contentStyle={{backgroundColor:'#333', border:'none'}}/><Bar dataKey="value" fill="#38bdf8"/></BarChart>
          : type === 'pie' ? <RePieChart><Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{data.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{backgroundColor:'#333', border:'none'}}/></RePieChart>
          : type === 'area' ? <AreaChart data={data}><XAxis dataKey="name"/><YAxis/><Tooltip contentStyle={{backgroundColor:'#333', border:'none'}}/><Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" /></AreaChart>
          : <LineChart data={data}><XAxis dataKey="name"/><YAxis/><Tooltip contentStyle={{backgroundColor:'#333', border:'none'}}/><Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={3} /></LineChart>}
        </ResponsiveContainer>
      </div>
    );
  };

  // ==================================================================================
  // 9. VIEW: LOGIN SCREEN
  // ==================================================================================
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src={logo} alt="Logo" className="login-logo" />
          <h1>DVX-AI</h1>
          <p>Next-Gen Intelligence Workspace</p>
          <div style={{display:'flex', gap:'10px', width:'100%', justifyContent:'center'}}>
            <button className="google-btn" onClick={handleLogin}><LogIn size={18}/> {supabase ? "Google Login" : "No Cloud"}</button>
          </div>
          {!supabase && <button className="guest-btn" onClick={handleGuestLogin}>Continue as Guest</button>}
            <button className="guest-btn" onClick={handleGuestLogin}>
            <User size={18} /> Guest Mode
          </button>
          
          <div className="login-features">
            <span>🚀 Auto-AI</span> • <span>📊 Data Lab</span> • <span>🔐 Secure</span>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================================================
  // 10. VIEW: MAIN APPLICATION
  // ==================================================================================
  return (
    <div className="app-container">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container"><img src={logo} alt="Logo" className="app-logo" /><span className="brand">DVX-AI</span></div>
          <button className="menu-btn" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        
        <button className="new-chat-btn" onClick={startNewChat}>
          <Plus size={18} /> New Chat
        </button>

        <div className="history">
          <p className="history-label">MODULES</p>
          <div className={`history-item ${activeTab==="Data"?"active-nav":""}`} onClick={()=>setActiveTab("Data")}><BrainCircuit size={16}/> Data Lab</div>
          <div className={`history-item ${activeTab==="Market"?"active-nav":""}`} onClick={()=>setActiveTab("Market")}><TrendingUp size={16}/> Market Watch</div>
          <div className={`history-item ${activeTab==="PDF"?"active-nav":""}`} onClick={()=>setActiveTab("PDF")}><FileText size={16}/> PDF Intel</div>
          
          <p className="history-label" style={{marginTop:'20px'}}>SYSTEM</p>
         {/* --- PROFESSIONAL SETTINGS MODAL --- */}
         <div className="history-item" onClick={() => setShowSettings(true)}>
            <Settings size={16}/> Settings
          </div>
        {showSettings && (
          <div className="settings-overlay" onClick={(e) => { if(e.target.className === 'settings-overlay') setShowSettings(false) }}>
            <div className="settings-box">
              
              {/* Header */}
              <div className="settings-header">
                <h3><Settings size={18} /> System Preferences</h3>
                <button className="close-icon-btn" onClick={() => setShowSettings(false)}><X size={20}/></button>
              </div>
              
              <div className="settings-content">
                
                {/* 1. Theme */}
                <div className="setting-row">
                  <div className="setting-label">
                    <span className="setting-title">Interface Theme</span>
                    <span className="setting-desc">Toggle between Light and Dark mode</span>
                  </div>
                  <button className="setting-action" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Moon size={14}/> : <Sun size={14}/>} {theme === 'dark' ? 'Dark' : 'Light'}
                  </button>
                </div>

                {/* 2. Export Data */}
                <div className="setting-row">
                  <div className="setting-label">
                    <span className="setting-title">Export Chat</span>
                    <span className="setting-desc">Download conversation history as .txt</span>
                  </div>
                  <button className="setting-action" onClick={exportChat}>
                    <Download size={14}/> Download
                  </button>
                </div>

                {/* 3. System Info */}
                <div className="setting-row">
                  <div className="setting-label">
                    <span className="setting-title">System Version</span>
                    <span className="setting-desc">DataVerse-X OS v1.0.4 (Stable)</span>
                  </div>
                  <span style={{fontSize:'11px', color:'#4ade80', background:'rgba(74, 222, 128, 0.1)', padding:'4px 8px', borderRadius:'6px', border:'1px solid rgba(74, 222, 128, 0.2)'}}>
                    Up to Date
                  </span>
                </div>

              </div>
            </div>
          </div>
        )}
          <div className="history-item"><Database size={16}/> {supabase ? "Cloud Synced" : "Local Storage"}</div>
        </div>
        
        <div className="user-profile" style={{marginTop:'auto'}}>
          <img src={user.user_metadata?.avatar_url || logo} alt="U" className="user-avatar" referrerPolicy="no-referrer"/>
          <div className="user-info"><h4>{user.user_metadata?.full_name || "Guest"}</h4><p style={{cursor:'pointer', color:'#ff4d4d'}} onClick={handleLogout}>Log Out</p></div>
        </div>
      </div>

      {/* MAIN SCREEN */}
     <div className="main-chat">
        {!sidebarOpen && <div className="top-bar"><button className="menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={24}/></button></div>}

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div className="settings-overlay">
            <div className="settings-box">
              <h3>System Settings</h3>
              <div className="setting-row">
                <span>Theme</span>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Moon size={16}/> : <Sun size={16}/>}</button>
              </div>
              <div className="setting-row">
                <span>Export Chat</span>
                <button onClick={exportChat}><Download size={16}/></button>
              </div>
              <button className="close-settings" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        )}

        {(activeTab === "Chat" || activeTab === "PDF") && (
          <>
            <div className="chat-box">
              {activeTab === "PDF" && !pdfText && (
                <div className="welcome-container">
                  <h2 style={{color:'white'}}>📄 Upload Document</h2>
                  <p style={{color:'#888', marginBottom:'20px'}}>I can read research papers, contracts, and notes.</p>
                  <input type="file" accept=".pdf" onChange={handlePdfUpload} style={{color:'white'}} />
                </div>
              )}
              {activeTab === "Chat" && messages.length === 0 && (
                <div className="welcome-container">
                  <img src={logo} alt="Logo" className="welcome-logo" />
                  <h1 className="welcome-title">Hello, {user.user_metadata?.full_name?.split(" ")[0] || "Founder"}</h1>
                  <p className="welcome-sub">System Online. Ready for instructions.</p>
                  <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                    <span className="suggestion-chip">📊 Analyze Data</span>
                    <span className="suggestion-chip">🐍 Python Code</span>
                    <span className="suggestion-chip">🎨 Generate Ideas</span>
                  </div>
                </div>
              )}
              
            {/* --- CHAT MESSAGE LOOP (UPDATED LAYOUT) --- */}
          
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}
                >
                  {/* Avatar */}
                  <div className={`avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
                    {msg.role === 'user' ? <User size={18}/> : <Sparkles size={20}/>}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className="message-content">
                    <div className="sender-name">
                      {msg.role === 'user' ? 'You' : 'DVX-AI'}
                      {/* Voice Button for AI */}
                      {msg.role === 'ai' && (
                        <button onClick={() => speakText(msg.text)} className="voice-btn">
                          <Volume2 size={14}/>
                        </button>
                      )}
                    </div>
                    
                    {msg.image && <img src={msg.image} alt="Upload" className="chat-image"/>}
                    
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    
                    {/* Charts */}
                    {msg.chart && renderChart(msg.chart, msg.chartType)}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="message-row ai-row">
                  <div className="avatar ai-avatar"><Sparkles size={20}/></div>
                  <div className="typing"><span></span><span></span><span></span></div>
                </div>
              )}
              <div ref={endRef} />
            </div>
        
             {/* INPUT AREA */}
        <div className="input-area">
          {selectedImage && <div style={{color:'white', marginBottom:10}}>📸 Image Selected</div>}
          
          <div className="input-wrapper">
            <button className="plus-btn"><Plus size={20}/></button>
            
            <input 
              id="img-upload" 
              type="file" 
              ref={fileInputRef} 
              style={{display:'none'}} 
              accept="image/*" 
              onChange={handleImageUpload}
            />
            
            <input 
              type="text" 
              className="chat-input" 
              placeholder={activeTab === "PDF" ? "Ask PDF..." : "Ask Xverse-AI..."} 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            
            <button className="icon-btn" onClick={() => fileInputRef.current.click()}><ImageIcon size={20}/></button>
            <button className="icon-btn"><Mic size={20}/></button>
            <button className="send-btn active" onClick={handleSend}><Send size={18} fill="black" /></button>
          </div>
          
          {/* Footer Text Added Here */}
          <p className="footer-text">Powered by DataVerse-X</p>
            </div>
          </>
        )}



{/* --- PROFESSIONAL DATA DASHBOARD --- */}
        {activeTab === "Data" && (
          <div style={{padding: '30px', color: 'white', height: '100%', overflowY: 'auto', background: '#09090b'}}>
            
            {/* 1. HEADER DASHBOARD */}
            <div style={{marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px'}}>
              <h1 style={{fontSize: '28px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Activity size={28} color="#38bdf8"/> Data Intelligence Lab
              </h1>
              <p style={{color: '#888', fontSize: '14px'}}>Advanced Analytics & Statistical Computing Unit</p>
            </div>

            {/* 2. CSV ANALYSIS SECTION (GRAPHS) */}
            <div style={{background: '#141416', borderRadius: '16px', padding: '25px', marginBottom: '30px', border: '1px solid #27272a'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{margin: 0, display: 'flex', gap: '10px'}}><BarChart3 size={20} color="#a78bfa"/> Dataset Visualizer</h3>
                <label style={{background: '#2563eb', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{display: 'none'}} />
                </label>
              </div>

              {chartData.length > 0 ? (
                <div style={{height: '350px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey={Object.keys(chartData[0])[0]} stroke="#666" style={{fontSize: '12px'}}/>
                      <YAxis stroke="#666" style={{fontSize: '12px'}}/>
                      <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px'}} />
                      <Legend />
                      <Area type="monotone" dataKey={Object.keys(chartData[0])[1]} stroke="#38bdf8" fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '40px', border: '2px dashed #333', borderRadius: '12px', color: '#555'}}>
                  <Database size={40} style={{marginBottom: '10px', opacity: 0.5}}/>
                  <p>No dataset loaded. Upload a CSV to visualize trends.</p>
                </div>
              )}
            </div>

            {/* 3. MANUAL CALCULATOR SECTION (NEW FEATURE) */}
            <div style={{background: '#141416', borderRadius: '16px', padding: '25px', border: '1px solid #27272a'}}>
              <h3 style={{marginTop: 0, marginBottom: '20px', display: 'flex', gap: '10px'}}>
                <Calculator size={20} color="#4ade80"/> Quick Stats Engine
              </h3>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                <input 
                  type="text" 
                  placeholder="Enter numbers separated by comma (e.g. 10, 25, 40, 55)" 
                  value={input} // Note: Hum main input state use kar rahe hain calculator ke liye temporarily
                  onChange={(e) => setInput(e.target.value)}
                  style={{
                    flex: 1, background: '#000', border: '1px solid #333', 
                    color: 'white', padding: '12px', borderRadius: '10px', outline: 'none'
                  }}
                />
                <button 
                  onClick={calculateStats}
                  style={{
                    background: '#4ade80', color: 'black', border: 'none', 
                    padding: '0 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  Calculate
                </button>
              </div>

              {/* Result Cards */}
              {manualStats && (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px'}}>
                  <div style={{background: '#1E1F20', padding: '15px', borderRadius: '10px', border: '1px solid #333'}}>
                    <div style={{fontSize: '11px', color: '#888'}}>MEAN (AVERAGE)</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#38bdf8'}}>{manualStats.avg}</div>
                  </div>
                  <div style={{background: '#1E1F20', padding: '15px', borderRadius: '10px', border: '1px solid #333'}}>
                    <div style={{fontSize: '11px', color: '#888'}}>MEDIAN</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#f472b6'}}>{manualStats.median}</div>
                  </div>
                  <div style={{background: '#1E1F20', padding: '15px', borderRadius: '10px', border: '1px solid #333'}}>
                    <div style={{fontSize: '11px', color: '#888'}}>MIN VALUE</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#fbbf24'}}>{manualStats.min}</div>
                  </div>
                  <div style={{background: '#1E1F20', padding: '15px', borderRadius: '10px', border: '1px solid #333'}}>
                    <div style={{fontSize: '11px', color: '#888'}}>MAX VALUE</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#4ade80'}}>{manualStats.max}</div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
        {/* --- PROFESSIONAL MARKET WATCH UI --- */}
      {/* --- FIXED MARKET WATCH UI --- */}
        {activeTab === "Market" && (
          <div style={{padding: '40px', color: 'white', height: '100%', overflowY: 'auto', background: '#09090b'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
              <div>
                <h1 style={{fontSize: '28px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <TrendingUp size={28} color="#4ade80"/> Market Terminal
                </h1>
                <p style={{color: '#888', fontSize: '14px'}}>Live Rates: Crypto • Gold • Forex</p>
              </div>
              <button onClick={fetchMarketData} style={{background: '#1E1F20', border: '1px solid #333', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer'}}>
                <Activity size={18} />
              </button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px'}}>
              {cryptoData ? Object.keys(cryptoData).map((key) => {
                const item = cryptoData[key];
                const isUp = item.usd_24h_change >= 0;
                
                return (
                  <div key={key} style={{
                    background: 'linear-gradient(145deg, #1A1A1C, #141416)', 
                    border: '1px solid #333', borderRadius: '16px', padding: '25px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                      <h3 style={{fontSize: '16px', color: '#9ca3af', margin: 0}}>{key}</h3>
                      {isUp ? <ArrowUpRight color="#4ade80" size={20}/> : <ArrowDownRight color="#ef4444" size={20}/>}
                    </div>
                    
                    <h2 style={{fontSize: '32px', fontWeight: 'bold', margin: '0', color: 'white'}}>
                      ${item.usd.toLocaleString()}
                    </h2>
                    
                    <p style={{
                      marginTop: '10px', fontSize: '14px', fontWeight: 'bold',
                      color: isUp ? '#4ade80' : '#ef4444', display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                      {item.usd_24h_change.toFixed(2)}% (24h)
                    </p>

                    {/* Glow Effect */}
                    <div style={{
                      position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', 
                      background: isUp ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      borderRadius: '50%', filter: 'blur(40px)'
                    }}></div>
                  </div>
                );
              }) : (
                <p style={{color: '#666', textAlign: 'center', gridColumn: '1 / -1'}}>Connecting to Global Exchanges...</p>
              )}
            </div>
          </div>
        )}
    
      </div>
   </div>
  );
}
export default App;