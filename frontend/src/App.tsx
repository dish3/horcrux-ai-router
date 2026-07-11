import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, 
  LayoutDashboard, 
  GitFork, 
  BarChart3, 
  Cpu, 
  Coins, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  Search, 
  Database,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Struct definitions to match backend models
interface TaskResult {
  task_id: string;
  prompt: string;
  category: string;
  route: 'local' | 'fireworks';
  handler_name: string;
  confidence: number;
  processing_time_ms: number;
  model_used: string;
  tokens_saved: number;
  answer: string;
  escalated: boolean;
  escalation_reason?: 'low_confidence' | 'not_handled' | 'parse_failure' | 'none';
}

function AnimatedCounter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 600; // ms
    const startTime = performance.now();
    let animationFrame: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress);
      const current = start + (end - start) * ease;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <span>{displayValue.toFixed(decimals)}{suffix}</span>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://horcrux-ai-router.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'routing' | 'metrics'>('home');
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [lastResult, setLastResult] = useState<TaskResult | null>(null);
  
  // Responsive sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Custom prompt input states
  const [customPrompt, setCustomPrompt] = useState('');
  const [customCategory, setCustomCategory] = useState('sentiment');
  const [overrideCategory, setOverrideCategory] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Modern toast/banner notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Auto dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Live backend metrics state
  const [metrics, setMetrics] = useState({
    total_tasks: 0,
    local_tasks: 0,
    fireworks_tasks: 0,
    token_savings: 0,
    average_confidence: 0.0,
    average_latency: 0.0,
    escalation_count: 0
  });

  const fetchMetrics = () => {
    fetch(`${API_BASE_URL}/api/metrics`)
      .then(res => {
        if (!res.ok) throw new Error("Backend offline");
        return res.json();
      })
      .then(data => {
        setMetrics(data);
      })
      .catch(err => {
        console.warn("Backend metrics offline, using local client computations.");
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Execution for custom prompts calling the real backend API
  const handleSimulateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsSimulating(true);

    fetch(`${API_BASE_URL}/api/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: customPrompt,
        ...(overrideCategory ? { category: customCategory } : {})
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data: any) => {
        const newTask: TaskResult = {
          task_id: data.task_id,
          prompt: data.prompt,
          category: data.category,
          route: data.route,
          handler_name: data.handler,
          confidence: data.confidence,
          processing_time_ms: parseFloat(data.latency_ms.toFixed(1)),
          model_used: data.fireworks_model,
          tokens_saved: data.tokens_saved,
          answer: data.answer,
          escalated: data.escalated,
          escalation_reason: data.escalation_reason !== 'none' ? data.escalation_reason : undefined
        };

        setTasks([newTask, ...tasks]);
        setLastResult(newTask);
        setCustomPrompt('');
        setIsSimulating(false);
        // Stay on Overview tab so the Latest Decision card updates in place
        // setActiveTab('dashboard');
        fetchMetrics();
        setNotification({ message: 'Task routed successfully!', type: 'success' });
      })
      .catch(error => {
        console.error('Error fetching routing decision:', error);
        setIsSimulating(false);
        setNotification({
          message: `Failed to connect to the backend router API. Please verify the backend is running at ${API_BASE_URL}.`,
          type: 'error'
        });
      });
  };

  // Metrics helper computations
  const totalRuns = tasks.length;
  const localRuns = tasks.filter(t => t.route === 'local').length;
  const escalatedRuns = tasks.filter(t => t.escalated).length;
  const fireworksRuns = tasks.filter(t => t.route === 'fireworks' && !t.escalated).length;
  const totalSaved = tasks.reduce((sum, t) => sum + t.tokens_saved, 0);
  
  const localConfidenceValues = tasks.filter(t => t.route === 'local' || t.escalated).map(t => t.confidence);
  const avgConfidence = localConfidenceValues.length 
    ? (localConfidenceValues.reduce((a, b) => a + b, 0) / localConfidenceValues.length).toFixed(2)
    : '0.00';
    
  const localExecutionTimes = tasks.filter(t => t.route === 'local').map(t => t.processing_time_ms);
  const avgLocalLatency = localExecutionTimes.length
    ? (localExecutionTimes.reduce((a, b) => a + b, 0) / localExecutionTimes.length).toFixed(1)
    : '0.0';

  // Derived metrics from in-memory tasks list, falling back to backend metrics when empty
  const displayTotalTasks = tasks.length > 0 ? tasks.length : metrics.total_tasks;
  const displayLocalTasks = tasks.length > 0 ? localRuns : metrics.local_tasks;
  const displayEscalatedTasks = tasks.length > 0 ? escalatedRuns : metrics.escalation_count;
  const displayFireworksTasks = tasks.length > 0 ? fireworksRuns : metrics.fireworks_tasks;
  const displayTokenSavings = tasks.length > 0 ? totalSaved : metrics.token_savings;
  
  const displayAvgConfidence = tasks.length > 0
    ? parseFloat(avgConfidence)
    : metrics.average_confidence;
    
  const displayAvgLatency = tasks.length > 0
    ? parseFloat(avgLocalLatency)
    : metrics.average_latency;

  const displayLocalHitRate = displayTotalTasks ? (displayLocalTasks / displayTotalTasks) * 100 : 0;
  const displayEscalationRate = displayTotalTasks ? (displayEscalatedTasks / displayTotalTasks) * 100 : 0;

  // Escalation metrics
  const notHandledCount = tasks.filter(t => t.escalation_reason === 'not_handled').length;
  const lowConfidenceCount = tasks.filter(t => t.escalation_reason === 'low_confidence').length;
  const parseFailureCount = tasks.filter(t => t.escalation_reason === 'parse_failure').length;

  // Confidence Histogram dynamic bin values
  const bin1 = tasks.filter(t => t.confidence <= 0.2 && t.route === 'local').length;
  const bin2 = tasks.filter(t => t.confidence > 0.2 && t.confidence <= 0.4 && t.route === 'local').length;
  const bin3 = tasks.filter(t => t.confidence > 0.4 && t.confidence <= 0.6 && t.route === 'local').length;
  const bin4 = tasks.filter(t => t.confidence > 0.6 && t.confidence <= 0.8 && t.route === 'local').length;
  const bin5 = tasks.filter(t => t.confidence > 0.8 && t.route === 'local').length;
  const maxBin = Math.max(bin1, bin2, bin3, bin4, bin5, 1);

  // Category dynamic savings (supporting both short and long category names)
  const mathSavings = tasks.filter(t => (t.category === 'math_reasoning' || t.category === 'math') && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0);
  const factualSavings = tasks.filter(t => (t.category === 'factual_knowledge' || t.category === 'factual') && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0);
  const nlpSavings = tasks.filter(t => ['sentiment', 'ner', 'summarization', 'summary', 'greeting'].includes(t.category) && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0);
  const maxSavings = Math.max(mathSavings, factualSavings, nlpSavings, 1);

  return (
    <div className="flex h-screen bg-[#070b13] text-gray-100 overflow-hidden font-sans">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 ${
          notification.type === 'error' 
            ? 'bg-red-950/80 border-red-800 text-red-200' 
            : notification.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' 
            : 'bg-amber-950/80 border-amber-800 text-amber-200'
        }`}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Loading Overlay Spinner */}
      {isSimulating && (
        <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-semibold text-blue-400 animate-pulse">Routing Task through Horcrux Pipeline...</div>
        </div>
      )}

      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
        />
      )}
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#090D1A] border-r border-[#1E293B] flex flex-col justify-between shrink-0 transition-transform duration-300 md:relative md:translate-x-0 shadow-lg ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="p-6 border-b border-[#1E293B] flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#4F7DFF] to-[#7C5CFC] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">HORCRUX</h1>
              <span className="text-[10px] text-[#4F7DFF] font-bold tracking-widest uppercase block">HYBRID AI ROUTER</span>
            </div>
          </div>
          
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'home' 
                  ? 'bg-gradient-to-r from-[#4F7DFF]/10 to-[#7C5CFC]/5 text-[#4F7DFF] font-semibold border border-[#4F7DFF]/20 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HomeIcon className="w-5 h-5" />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-[#4F7DFF]/10 to-[#7C5CFC]/5 text-[#4F7DFF] font-semibold border border-[#4F7DFF]/20 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => { setActiveTab('routing'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'routing' 
                  ? 'bg-gradient-to-r from-[#4F7DFF]/10 to-[#7C5CFC]/5 text-[#4F7DFF] font-semibold border border-[#4F7DFF]/20 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <GitFork className="w-5 h-5" />
              <span>Routing Visualizer</span>
            </button>
            <button 
              onClick={() => { setActiveTab('metrics'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'metrics' 
                  ? 'bg-gradient-to-r from-[#4F7DFF]/10 to-[#7C5CFC]/5 text-[#4F7DFF] font-semibold border border-[#4F7DFF]/20 shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Metrics & Stats</span>
            </button>
          </nav>
        </div>
        
        {/* SIDEBAR FOOTER */}
        <div className="p-4 border-t border-[#1E293B] bg-[#000000]/20">
          <div className="flex items-center gap-3 p-2 bg-[#090D1A] border border-[#1E293B] rounded-xl">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="text-xs">
              <div className="font-semibold text-white">System Status</div>
              <div className="text-slate-400">Pipeline Active</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F8FAFC]">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-800 md:hidden focus:outline-none transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wider text-[#4F7DFF] uppercase">{activeTab}</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs text-slate-500 font-medium">Environment: Sandbox</span>
            </div>
          </div>
          <div className="text-xs bg-blue-50 text-[#4F7DFF] border border-blue-100 px-3 py-1.5 rounded-full font-medium tracking-wide shadow-sm">
            Threshold Cap: 0.80
          </div>
        </header>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1 bg-[#F8FAFC]">

          {/* TAB 1: HOME PAGE */}
          {activeTab === 'home' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6 animate-fadeIn"
            >
              
              {/* HERO BOARD */}
              <div className="relative py-16 md:py-20 px-12 rounded-[20px] bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] overflow-hidden shadow-md w-full">
                {/* Soft radial glow effects behind heading */}
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#4F7DFF]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#7C5CFC]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
                
                {/* Connected network nodes SVG on the right (increased size by 15% -> 345px, 18% opacity) */}
                <svg className="absolute right-12 top-1/2 -translate-y-1/2 w-[345px] h-[345px] opacity-[0.18] text-[#4F7DFF] pointer-events-none hidden lg:block" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <line x1="15" y1="50" x2="45" y2="20" strokeWidth="1" />
                  <line x1="15" y1="50" x2="45" y2="50" strokeWidth="1" />
                  <line x1="15" y1="50" x2="45" y2="80" strokeWidth="1" />
                  <line x1="45" y1="20" x2="85" y2="35" strokeWidth="1" />
                  <line x1="45" y1="80" x2="85" y2="65" strokeWidth="1" />
                  <line x1="45" y1="50" x2="85" y2="35" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="45" y1="50" x2="85" y2="65" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx="15" cy="50" r="3" fill="currentColor" />
                  <circle cx="45" cy="20" r="4" fill="currentColor" />
                  <circle cx="45" cy="50" r="4" fill="currentColor" />
                  <circle cx="45" cy="80" r="4" fill="currentColor" />
                  <circle cx="85" cy="35" r="5" fill="currentColor" />
                  <circle cx="85" cy="65" r="5" fill="currentColor" />
                </svg>

                <div className="max-w-4xl space-y-6">
                  <div>
                    <span className="text-[12px] text-[#4F7DFF] font-bold uppercase tracking-wide bg-[#4F7DFF]/15 border border-[#4F7DFF]/20 px-4 py-1.5 rounded-full shadow-inner">
                      HYBRID ROUTING MODEL
                    </span>
                  </div>
                  <h2 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Optimizing AI Routing with <span className="text-[#4F7DFF]">Zero-Token</span> Local Execution
                  </h2>
                  <p className="text-slate-300 text-base leading-relaxed max-w-3xl">
                    Horcrux selectively executes sentiment, NER, summary, math, and factual queries locally. Ambiguous or low-confidence queries are automatically escalated to Fireworks API serverless models.
                  </p>
                  
                  {/* Three small feature chips */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20 cursor-default transition-colors hover:bg-[#4F7DFF]/15"
                    >
                      <span className="text-[10px]">✓</span> Local Execution
                    </motion.span>
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20 cursor-default transition-colors hover:bg-[#4F7DFF]/15"
                    >
                      <span className="text-[10px]">⚡</span> Smart Escalation
                    </motion.span>
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20 cursor-default transition-colors hover:bg-[#4F7DFF]/15"
                    >
                      <span className="text-[10px]">💰</span> Token Optimized
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* OVERVIEW METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Card 1: Total Savings */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/60 border-t-4 border-[#4F7DFF] rounded-[20px] py-8 px-6 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-slate-400 uppercase font-bold tracking-wide block">Total Savings</span>
                    <h3 className="text-5xl font-extrabold text-slate-900 leading-none">
                      <AnimatedCounter value={displayTokenSavings} />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium pt-1">Fireworks tokens saved</p>
                  </div>
                  <div className="w-12 h-12 bg-[#4F7DFF]/10 rounded-xl flex items-center justify-center border border-[#4F7DFF]/10 shadow-inner">
                    <Coins className="w-6 h-6 text-[#4F7DFF]" />
                  </div>
                </motion.div>

                {/* Card 2: Local Hit Rate */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/60 border-t-4 border-[#10B981] rounded-[20px] py-8 px-6 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-slate-400 uppercase font-bold tracking-wide block">Local Hit Rate</span>
                    <h3 className="text-5xl font-extrabold text-slate-900 leading-none">
                      <AnimatedCounter value={displayLocalHitRate} suffix="%" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium pt-1">{displayLocalTasks} of {displayTotalTasks} runs</p>
                  </div>
                  <div className="w-12 h-12 bg-[#10B981]/10 rounded-xl flex items-center justify-center border border-[#10B981]/10 shadow-inner">
                    <Zap className="w-6 h-6 text-[#10B981]" />
                  </div>
                </motion.div>

                {/* Card 3: Avg Local Latency */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/60 border-t-4 border-[#7C5CFC] rounded-[20px] py-8 px-6 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-slate-400 uppercase font-bold tracking-wide block">Avg Local Latency</span>
                    <h3 className="text-5xl font-extrabold text-slate-900 leading-none">
                      <AnimatedCounter value={displayAvgLatency} decimals={1} suffix="ms" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium pt-1">Rule-based calculations</p>
                  </div>
                  <div className="w-12 h-12 bg-[#7C5CFC]/10 rounded-xl flex items-center justify-center border border-[#7C5CFC]/10 shadow-inner">
                    <Clock className="w-6 h-6 text-[#7C5CFC]" />
                  </div>
                </motion.div>

                {/* Card 4: Escalation Rate */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/60 border-t-4 border-[#F59E0B] rounded-[20px] py-8 px-6 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-slate-400 uppercase font-bold tracking-wide block">Escalation Rate</span>
                    <h3 className="text-5xl font-extrabold text-slate-900 leading-none">
                      <AnimatedCounter value={displayEscalationRate} suffix="%" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium pt-1">{displayEscalatedTasks} tasks escalated</p>
                  </div>
                  <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center border border-[#F59E0B]/10 shadow-inner">
                    <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                </motion.div>

                {/* Card 5: Average Confidence */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-200/60 border-t-4 border-indigo-500 rounded-[20px] py-8 px-6 flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-slate-400 uppercase font-bold tracking-wide block">Avg Confidence</span>
                    <h3 className="text-5xl font-extrabold text-slate-900 leading-none">
                      <AnimatedCounter value={displayAvgConfidence * 100} suffix="%" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium pt-1">Route classification score</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/10 shadow-inner">
                    <ShieldCheck className="w-6 h-6 text-indigo-500" />
                  </div>
                </motion.div>
              </div>

              {/* SIMULATOR & LATEST RESULT SIDE-BY-SIDE GRID */}
              <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                
                {/* SIMULATOR CARD (65% width) */}
                <div className="w-full lg:w-[65%] bg-white border border-slate-200/60 rounded-[20px] p-8 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                      <Sparkles className="w-5 h-5 text-[#4F7DFF]" />
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Interactive Routing Simulator</h3>
                    </div>
                    
                    <form onSubmit={handleSimulateRoute} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block">Query Prompt</label>
                        <textarea 
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Example:&#10;What is (10-2)*3?&#10;Summarize this paragraph.&#10;Is this review positive?"
                          className="w-full h-[150px] bg-[#F8FAFC] border border-slate-200 p-4 rounded-xl focus:outline-none focus:border-[#4F7DFF] text-sm text-slate-800 transition-colors resize-none placeholder-slate-450 font-medium leading-relaxed"
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                        {/* Try Examples */}
                        <div className="space-y-2.5">
                          <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block">Examples:</span>
                          <ul className="space-y-2 text-sm text-slate-600 font-semibold">
                            <li 
                              onClick={() => {
                                setCustomPrompt("What is (10-2)*3?");
                                setOverrideCategory(false);
                              }}
                              className="text-[#4F7DFF] hover:text-[#7C5CFC] cursor-pointer hover:underline flex items-center gap-1.5"
                            >
                              <span>•</span>
                              <span>What is (10-2)*3?</span>
                            </li>
                            <li 
                              onClick={() => {
                                setCustomPrompt("Please summarize this paragraph: The rapid progress of generative AI has led to massive demand for low-latency, cost-effective inference pipelines.");
                                setOverrideCategory(false);
                              }}
                              className="text-[#4F7DFF] hover:text-[#7C5CFC] cursor-pointer hover:underline flex items-center gap-1.5"
                            >
                              <span>•</span>
                              <span>Summarize this paragraph.</span>
                            </li>
                            <li 
                              onClick={() => {
                                setCustomPrompt("Classify the sentiment of the following product review: The battery life is amazing, but the screen glare is annoying.");
                                setOverrideCategory(false);
                              }}
                              className="text-[#4F7DFF] hover:text-[#7C5CFC] cursor-pointer hover:underline flex items-center gap-1.5"
                            >
                              <span>•</span>
                              <span>Is this review positive?</span>
                            </li>
                          </ul>
                        </div>

                        {/* Category Selector Override */}
                        <div className="space-y-2 w-full md:w-56">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block">Category Override</label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={overrideCategory}
                                onChange={(e) => setOverrideCategory(e.target.checked)}
                                className="w-3.5 h-3.5 accent-[#4F7DFF] rounded cursor-pointer"
                              />
                              <span className="text-[12px] text-slate-500 hover:text-[#4F7DFF] font-semibold">Enable</span>
                            </label>
                          </div>
                          <select
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            disabled={!overrideCategory}
                            className={`w-full bg-[#F8FAFC] border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-[#4F7DFF] text-sm text-slate-800 font-semibold transition-colors ${
                               !overrideCategory ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="sentiment">Sentiment</option>
                            <option value="ner">NER</option>
                            <option value="summarization">Summarization</option>
                            <option value="math_reasoning">Math Reasoning</option>
                            <option value="factual_knowledge">Factual Knowledge</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSimulating}
                        className="w-full h-12 bg-gradient-to-r from-[#4F7DFF] to-[#7C5CFC] hover:brightness-110 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:shadow-[#4F7DFF]/20 disabled:opacity-50 text-sm uppercase tracking-wider mt-2"
                      >
                        {isSimulating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Routing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Run Router</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* LATEST DECISION CARD (35% width) */}
                <div className="w-full lg:w-[35%] bg-white border border-slate-200/60 rounded-[20px] p-8 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                      <ShieldCheck className="w-5 h-5 text-[#7C5CFC]" />
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Latest Decision</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Route Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        lastResult 
                          ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                          : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                      }`}>
                        <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Route</span>
                        {lastResult ? (
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[10px] border uppercase ${
                            lastResult.route === 'local' 
                              ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]' 
                              : 'bg-[#7C5CFC]/10 border-[#7C5CFC]/25 text-[#7C5CFC]'
                          }`}>
                            {lastResult.route}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400 font-semibold italic">—</span>
                        )}
                      </div>

                      {/* Confidence Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        lastResult 
                          ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                          : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                      }`}>
                        <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Confidence</span>
                        {lastResult ? (
                          lastResult.route === 'fireworks' ? (
                             <span className="inline-flex px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-[#7C5CFC]/20 bg-[#7C5CFC]/10 text-[#7C5CFC] uppercase">API</span>
                           ) : (
                             <p className="text-sm text-slate-800 font-extrabold">{(lastResult.confidence * 100).toFixed(0)}%</p>
                           )
                        ) : (
                          <span className="text-sm text-slate-400 font-semibold italic">—</span>
                        )}
                      </div>

                      {/* Handler Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        lastResult 
                          ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                          : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                      }`}>
                        <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Handler</span>
                        {lastResult ? (
                          <p className="text-xs text-slate-600 font-mono font-bold truncate" title={lastResult.handler_name}>{lastResult.handler_name}</p>
                        ) : (
                          <span className="text-sm text-slate-400 font-semibold italic">—</span>
                        )}
                      </div>

                      {/* Latency Card */}
                      <div className={`p-4 rounded-xl border transition-all ${
                        lastResult 
                          ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                          : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                      }`}>
                        <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Latency</span>
                        {lastResult ? (
                          <p className="text-xs text-slate-800 font-mono font-bold">{lastResult.processing_time_ms} ms</p>
                        ) : (
                          <span className="text-sm text-slate-400 font-semibold italic">—</span>
                        )}
                      </div>
                    </div>

                    {/* Tokens Saved Card */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      lastResult 
                        ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                        : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                    }`}>
                      <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Tokens Saved</span>
                      {lastResult ? (
                        <p className="text-xs text-[#4F7DFF] font-extrabold">{lastResult.tokens_saved} tokens</p>
                      ) : (
                        <span className="text-sm text-slate-400 font-semibold italic">—</span>
                      )}
                    </div>

                    {/* Final Answer Card */}
                    <div className={`p-4 rounded-xl border flex-1 flex flex-col min-h-[120px] transition-all ${
                      lastResult 
                        ? 'bg-[#F8FAFC] border-slate-100 shadow-sm' 
                        : 'bg-[#F8FAFC]/50 border-dashed border-slate-200'
                    }`}>
                      <span className="text-[12px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Final Answer</span>
                      {lastResult ? (
                        <div className="text-xs text-slate-700 overflow-y-auto max-h-[160px] pr-1 flex-1 whitespace-pre-wrap leading-relaxed font-semibold">
                          {lastResult.answer}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic font-medium flex-1 flex items-center justify-center text-center">
                          No execution data yet. Run a prompt in the simulator.
                        </div>
                      )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

          {/* TAB 2: DASHBOARD PAGE */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {/* PAGE HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Execution Logs</h3>
                  <p className="text-sm text-slate-500 mt-1">Real-time log of tasks processed by the Horcrux routing pipeline.</p>
                </div>
                <div className="relative flex-shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="bg-white border border-slate-200 text-sm text-slate-700 rounded-xl pl-10 pr-4 py-2.5 w-64 focus:outline-none focus:border-[#4F7DFF] focus:ring-2 focus:ring-[#4F7DFF]/10 transition-all placeholder-slate-400 shadow-sm"
                  />
                </div>
              </div>

              {/* LOGS TABLE CARD */}
              <div className="bg-white border border-slate-200/60 rounded-[20px] overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200">
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide whitespace-nowrap">Route</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide whitespace-nowrap">Task / Category</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide">Prompt</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide">Handler</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide text-center">Confidence</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide text-center">Latency</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide text-center whitespace-nowrap">Tokens Saved</th>
                        <th className="px-5 py-4 text-[12px] text-slate-500 uppercase font-bold tracking-wide">Answer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-20 text-center">
                            <div className="flex flex-col items-center justify-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                <Database className="w-7 h-7 text-slate-400" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-700">No execution logs yet</p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">Run a prompt in the routing simulator on the Overview page to populate live data here.</p>
                              </div>
                              <button
                                onClick={() => setActiveTab('home')}
                                className="mt-1 text-xs bg-gradient-to-r from-[#4F7DFF] to-[#7C5CFC] text-white px-5 py-2 rounded-xl hover:brightness-110 transition-all font-semibold shadow-sm"
                              >
                                Go to Simulator
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => (
                          <motion.tr
                            key={task.task_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ x: 2 }}
                            className="hover:bg-[#F8FAFC] hover:shadow-sm transition-all duration-150 align-top border-l-2 border-l-transparent hover:border-l-[#4F7DFF] group"
                          >
                            {/* Route — FIRST for visual hierarchy */}
                            <td className="px-5 py-4">
                              {task.route === 'local' ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Local
                                </span>
                              ) : task.escalated ? (
                                <div className="space-y-1.5">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Escalated
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]" title={task.model_used}>
                                    {task.model_used.split('/').pop()}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
                                    <Database className="w-3.5 h-3.5" />
                                    Fireworks
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]" title={task.model_used}>
                                    {task.model_used.split('/').pop()}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Task ID / Category */}
                            <td className="px-5 py-4 space-y-1.5">
                              <div className="font-mono text-[11px] font-semibold text-slate-500 leading-none">{task.task_id}</div>
                              <span className="inline-flex items-center text-[10px] bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20 px-2.5 py-0.5 rounded-full font-bold tracking-wide uppercase">
                                {task.category}
                              </span>
                            </td>

                            {/* Prompt */}
                            <td className="px-5 py-4 text-xs text-slate-600 max-w-[180px]">
                              <p className="line-clamp-2 leading-relaxed" title={task.prompt}>{task.prompt}</p>
                            </td>

                            {/* Handler */}
                            <td className="px-5 py-4 text-[11px] text-slate-500 font-mono max-w-[140px]">
                              <p className="truncate" title={task.handler_name}>{task.handler_name}</p>
                            </td>

                            {/* Confidence */}
                            <td className="px-5 py-4 text-center">
                              {task.route === 'fireworks' ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] border border-[#7C5CFC]/20 bg-[#7C5CFC]/10 text-[#7C5CFC] uppercase">API</span>
                              ) : (
                                <span className={`text-sm font-bold ${
                                  task.confidence >= 0.80 ? 'text-[#10B981]' : 'text-[#F59E0B]'
                                }`}>
                                  {(task.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </td>

                            {/* Latency */}
                            <td className="px-5 py-4 text-center">
                              <span className="text-xs font-mono font-semibold text-slate-600">{task.processing_time_ms} ms</span>
                            </td>

                            {/* Tokens Saved */}
                            <td className="px-5 py-4 text-center">
                              {task.tokens_saved > 0 ? (
                                <span className="text-xs font-bold text-[#4F7DFF]">+{task.tokens_saved}</span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>

                            {/* Answer */}
                            <td className="px-5 py-4 text-xs text-slate-600 max-w-[180px]">
                              <p className="line-clamp-2 leading-relaxed font-medium" title={task.answer}>{task.answer}</p>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TABLE FOOTER */}
                {tasks.length > 0 && (
                  <div className="px-5 py-3 bg-[#F8FAFC] border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[12px] text-slate-400 font-medium">{tasks.length} execution{tasks.length !== 1 ? 's' : ''} recorded</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></div>
                      <span className="text-[12px] text-slate-400 font-medium">Live</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: ROUTING VISUALIZATION */}
          {activeTab === 'routing' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* PAGE HEADER */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Routing Pipeline Visualizer</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Animated workflow — how every prompt flows through the Horcrux hybrid routing engine.</p>
                </div>
                {lastResult && (
                  <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm flex-shrink-0">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse"></div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Live Trace</span>
                    <span className="text-[11px] font-mono text-slate-400">{lastResult.task_id}</span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-400">{lastResult.processing_time_ms}ms</span>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════
                  WORKFLOW DIAGRAM — 680px container, SVG connectors
                  ══════════════════════════════════════════════════════ */}
              {(() => {
                const r = lastResult;
                const isLocal = r ? r.route === 'local' : false;
                const isEscalated = r ? r.escalated : false;
                const activeColor = isLocal ? '#10B981' : isEscalated ? '#F59E0B' : '#7C5CFC';
                const inactiveStroke = '#E2E8F0';

                const borderClassLocal = r && isLocal ? 'border-[#10B981]/30 ring-1 ring-[#10B981]/15 shadow-[#10B981]/10' : 'border-slate-100 opacity-40';
                const borderClassFireworks = r && !isLocal
                  ? isEscalated
                    ? 'border-[#F59E0B]/30 ring-1 ring-[#F59E0B]/15 shadow-[#F59E0B]/10'
                    : 'border-[#7C5CFC]/30 ring-1 ring-[#7C5CFC]/15 shadow-[#7C5CFC]/10'
                  : 'border-slate-100 opacity-40';

                const StraightConnector = ({ delay = 0 }: { delay?: number }) => (
                  <div className="flex justify-center">
                    <svg viewBox="0 0 20 36" className="w-5 h-9" preserveAspectRatio="xMidYMid meet">
                      <motion.line x1="10" y1="0" x2="10" y2="29"
                        stroke="#CBD5E1" strokeWidth="2"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay }} />
                      <motion.polygon points="6,24 10,32 14,24" fill="#CBD5E1"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: delay + 0.2 }} />
                    </svg>
                  </div>
                );

                return (
                  <div className="max-w-[680px] mx-auto select-none">

                    {/* NODE 1: PROMPT INPUT */}
                    <div className="flex justify-center">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.35 }}
                        className="w-72 bg-white border border-slate-200 rounded-2xl shadow-md px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#4F7DFF]/10 flex items-center justify-center flex-shrink-0">
                            <Send className="w-4 h-4 text-[#4F7DFF]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Prompt Input</span>
                            <p className="text-xs font-semibold text-slate-700 truncate" title={r?.prompt}>{r?.prompt ?? 'No prompt yet — run simulator'}</p>
                          </div>
                          <span className="text-[9px] bg-[#4F7DFF]/10 text-[#4F7DFF] border border-[#4F7DFF]/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">1</span>
                        </div>
                      </motion.div>
                    </div>

                    <StraightConnector delay={0.2} />

                    {/* NODE 2: TASK CLASSIFIER */}
                    <div className="flex justify-center">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.35 }}
                        className="w-72 bg-white border border-slate-200 rounded-2xl shadow-md px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <GitFork className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Task Classifier</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 capitalize">{r?.category?.replace(/_/g, ' ') ?? '—'}</span>
                              {r && <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-bold uppercase">{r.category}</span>}
                            </div>
                          </div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">2</span>
                        </div>
                      </motion.div>
                    </div>

                    <StraightConnector delay={0.35} />

                    {/* NODE 3: CONFIDENCE EVALUATION */}
                    <div className="flex justify-center">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.35 }}
                        className="w-72 bg-white border border-slate-200 rounded-2xl shadow-md px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#7C5CFC]/10 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 text-[#7C5CFC]" />
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Confidence Score</span>
                            <div className="flex items-center gap-2">
                              <div className="relative w-9 h-9 flex-shrink-0">
                                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="3.5"/>
                                  <circle cx="18" cy="18" r="14" fill="none"
                                    stroke={r ? (r.confidence >= 0.80 ? '#10B981' : '#F59E0B') : '#E2E8F0'}
                                    strokeWidth="3.5"
                                    strokeDasharray={`${2 * Math.PI * 14}`}
                                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - (r?.confidence ?? 0))}`}
                                    strokeLinecap="round"/>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-[9px] font-extrabold ${r ? (r.confidence >= 0.80 ? 'text-[#10B981]' : 'text-[#F59E0B]') : 'text-slate-300'}`}>
                                    {r ? `${(r.confidence * 100).toFixed(0)}%` : '—'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-700">Threshold <span className="font-mono text-slate-500">0.80</span></p>
                                <p className={`text-[10px] font-bold mt-0.5 ${r ? (r.confidence >= 0.80 ? 'text-[#10B981]' : 'text-[#F59E0B]') : 'text-slate-300'}`}>
                                  {r ? (r.confidence >= 0.80 ? '✓ Exceeded — local eligible' : '⚠ Below — escalating') : 'Awaiting prompt...'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">3</span>
                        </div>
                      </motion.div>
                    </div>

                    <StraightConnector delay={0.5} />

                    {/* NODE 4: DECISION NODE */}
                    <div className="flex justify-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.35 }}
                        className={`w-72 rounded-2xl px-4 py-3 shadow-md border-2 ${
                          !r ? 'bg-slate-50 border-slate-200' :
                          isLocal ? 'bg-gradient-to-br from-[#10B981]/5 to-[#10B981]/10 border-[#10B981]/40' :
                          isEscalated ? 'bg-gradient-to-br from-[#F59E0B]/5 to-[#F59E0B]/10 border-[#F59E0B]/40' :
                          'bg-gradient-to-br from-[#7C5CFC]/5 to-[#7C5CFC]/10 border-[#7C5CFC]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            !r ? 'bg-slate-100' :
                            isLocal ? 'bg-[#10B981]/15' : isEscalated ? 'bg-[#F59E0B]/15' : 'bg-[#7C5CFC]/15'
                          }`}>
                            {!r ? <GitFork className="w-4 h-4 text-slate-400" /> :
                              isLocal ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> :
                              isEscalated ? <AlertTriangle className="w-4 h-4 text-[#F59E0B]" /> :
                              <Database className="w-4 h-4 text-[#7C5CFC]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Decision Node</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-extrabold uppercase tracking-wide ${
                                !r ? 'text-slate-400' :
                                isLocal ? 'text-[#10B981]' : isEscalated ? 'text-[#F59E0B]' : 'text-[#7C5CFC]'
                              }`}>
                                {!r ? 'PENDING' : isLocal ? 'LOCAL' : 'FIREWORKS AI'}
                              </span>
                              {r && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                                isLocal ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
                                isEscalated ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' :
                                'bg-[#7C5CFC]/10 text-[#7C5CFC] border-[#7C5CFC]/20'
                              }`}>
                                {isLocal ? '0 tokens' : isEscalated ? 'escalated' : 'api call'}
                              </span>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {!r ? 'Awaiting confidence evaluation...' :
                               isLocal ? 'Confidence exceeded threshold — answered locally.' :
                               isEscalated ? `Escalated: ${r.escalation_reason ?? 'low confidence'}` :
                               'Routed directly to Fireworks AI API.'}
                            </p>
                          </div>
                          <span className="text-[9px] bg-white/80 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">4</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* BRANCH SVG: splits from center (340) → left (100) and right (580) */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                      <svg viewBox="0 0 680 60" className="w-full h-[60px]" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                          </filter>
                          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                          </filter>
                          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                          </filter>
                        </defs>
                        <line x1="340" y1="0" x2="340" y2="18" stroke="#CBD5E1" strokeWidth="2"/>
                        {/* Left → Local */}
                        <motion.path d="M 340 18 C 340 40, 100 40, 100 60" fill="none"
                          stroke={r && isLocal ? '#10B981' : inactiveStroke}
                          strokeWidth={r && isLocal ? 2.5 : 1.5}
                          filter={r && isLocal ? 'url(#glow-green)' : undefined}
                          strokeDasharray={r && !isLocal ? '5 4' : undefined}
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.7 }}/>
                        {/* Right → Fireworks */}
                        <motion.path d="M 340 18 C 340 40, 580 40, 580 60" fill="none"
                          stroke={r && !isLocal ? activeColor : inactiveStroke}
                          strokeWidth={r && !isLocal ? 2.5 : 1.5}
                          filter={r && !isLocal ? (isEscalated ? 'url(#glow-amber)' : 'url(#glow-purple)') : undefined}
                          strokeDasharray={r && isLocal ? '5 4' : undefined}
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.7 }}/>
                        <motion.polygon points="96,54 100,60 104,54" fill={r && isLocal ? '#10B981' : '#CBD5E1'}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}/>
                        <motion.polygon points="576,54 580,60 584,54" fill={r && !isLocal ? activeColor : '#CBD5E1'}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}/>
                      </svg>
                    </motion.div>

                    {/* BRANCH ROW: Local Handler (left) + Fireworks (right) */}
                    <div className="flex justify-between">

                      {/* LOCAL HANDLER */}
                      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75, duration: 0.35 }}
                        className={`w-[200px] rounded-2xl px-3 py-3 border-2 shadow-md transition-all ${borderClassLocal}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-md bg-[#10B981]/10 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-[#10B981]"/>
                          </div>
                          <span className="text-[10px] font-extrabold text-[#10B981] uppercase tracking-widest">Local Tool</span>
                          <span className="ml-auto text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-1 py-0.5 rounded-full font-bold">5a</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Handler</span>
                            <p className="text-[11px] font-mono font-bold text-slate-700 truncate">{r?.handler_name ?? '—'}</p>
                          </div>
                          <div className="flex gap-3">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Latency</span>
                              <p className="text-[11px] font-mono font-bold text-slate-700">{r && isLocal ? `${r.processing_time_ms}ms` : '—'}</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Saved</span>
                              <p className="text-[11px] font-mono font-bold text-[#4F7DFF]">{r?.tokens_saved ? `+${r.tokens_saved}` : '—'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* FIREWORKS API */}
                      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75, duration: 0.35 }}
                        className={`w-[200px] rounded-2xl px-3 py-3 border-2 shadow-md transition-all ${borderClassFireworks}`}
                        style={r && !isLocal ? { borderColor: `${activeColor}4D` } : {}}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: r && !isLocal ? `${activeColor}1A` : '#F1F5F9' }}>
                            {isEscalated ? <AlertTriangle className="w-3 h-3 text-[#F59E0B]"/> : <Database className="w-3 h-3 text-[#7C5CFC]"/>}
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest"
                            style={{ color: r && !isLocal ? activeColor : '#94A3B8' }}>
                            {isEscalated ? 'Escalated' : 'Fireworks AI'}
                          </span>
                          <span className="ml-auto text-[9px] px-1 py-0.5 rounded-full font-bold border"
                            style={r && !isLocal ? { backgroundColor: `${activeColor}1A`, color: activeColor, borderColor: `${activeColor}33` } : { backgroundColor: '#F8FAFC', color: '#94A3B8', borderColor: '#E2E8F0' }}>5b</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Model</span>
                            <p className="text-[11px] font-mono font-bold text-slate-700 truncate">{r?.model_used ? r.model_used.split('/').pop() : '—'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Latency</span>
                            <p className="text-[11px] font-mono font-bold text-slate-700">{r && !isLocal ? `${r.processing_time_ms}ms` : '—'}</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* MERGE SVG: Local (100) + Fireworks (580) → center (340) → Final */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                      <svg viewBox="0 0 680 60" className="w-full h-[60px]" preserveAspectRatio="xMidYMid meet">
                        <motion.path d="M 100 0 C 100 20, 340 20, 340 42" fill="none"
                          stroke={r && isLocal ? '#10B981' : inactiveStroke}
                          strokeWidth={r && isLocal ? 2.5 : 1.5}
                          filter={r && isLocal ? 'url(#glow-green)' : undefined}
                          strokeDasharray={r && !isLocal ? '5 4' : undefined}
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 1.0 }}/>
                        <motion.path d="M 580 0 C 580 20, 340 20, 340 42" fill="none"
                          stroke={r && !isLocal ? activeColor : inactiveStroke}
                          strokeWidth={r && !isLocal ? 2.5 : 1.5}
                          filter={r && !isLocal ? (isEscalated ? 'url(#glow-amber)' : 'url(#glow-purple)') : undefined}
                          strokeDasharray={r && isLocal ? '5 4' : undefined}
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 1.0 }}/>
                        <motion.line x1="340" y1="42" x2="340" y2="54" stroke="#CBD5E1" strokeWidth="2"
                          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                          transition={{ delay: 1.4 }}/>
                        <motion.polygon points="336,49 340,57 344,49" fill="#CBD5E1"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}/>
                      </svg>
                    </motion.div>

                    {/* NODE 6: FINAL RESPONSE */}
                    <div className="flex justify-center">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.4 }}
                        className="w-72 bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] rounded-2xl px-4 py-3 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#4F7DFF]/25 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-[#4F7DFF]"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Final Response</span>
                            <p className="text-xs text-white font-medium leading-relaxed line-clamp-2" title={r?.answer}>{r?.answer ?? 'Run a prompt to see the answer.'}</p>
                          </div>
                          <span className="text-[9px] bg-[#4F7DFF]/20 text-[#4F7DFF] border border-[#4F7DFF]/20 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">6</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* CTA when no trace */}
                    {!r && (
                      <div className="flex justify-center pt-3">
                        <button onClick={() => setActiveTab('home')}
                          className="text-xs bg-gradient-to-r from-[#4F7DFF] to-[#7C5CFC] text-white px-5 py-2 rounded-xl hover:brightness-110 transition-all font-semibold shadow-sm">
                          Run a Prompt to Animate the Pipeline →
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* TAB 4: METRICS PAGE */}
          {activeTab === 'metrics' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white">Routing Analytics & Metric Distributions</h3>
                <p className="text-xs text-gray-400">Visual representations of the hybrid router performance, latency, and saved costs.</p>
              </div>

              {/* GRID STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Average Confidence</h4>
                  <div className="text-4xl font-extrabold text-white">{displayAvgConfidence.toFixed(2)}</div>
                  <div className="w-full bg-[#0b0f19] h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full" 
                      style={{ width: `${displayAvgConfidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-500">Across local routing candidates</span>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Escalation Statistics</h4>
                  <div className="text-4xl font-extrabold text-amber-500">{displayEscalatedTasks}</div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Not Handled: {notHandledCount}</span>
                    <span>Low Confidence: {lowConfidenceCount}</span>
                    <span>Parse Failures: {parseFailureCount}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Failed local attempts Escalated to Fireworks</span>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Saved vs API Executions</h4>
                  <div className="text-4xl font-extrabold text-emerald-400">{displayLocalTasks} / {displayTotalTasks}</div>
                  <div className="w-full bg-[#0b0f19] h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${displayTotalTasks ? (displayLocalTasks / displayTotalTasks) * 100 : 0}%` }}
                    ></div>
                    <div 
                      className="bg-indigo-500 h-full" 
                      style={{ width: `${displayTotalTasks ? (displayFireworksTasks / displayTotalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span className="text-emerald-400">Local Runs: {displayLocalTasks}</span>
                    <span className="text-indigo-400">API Runs: {displayFireworksTasks}</span>
                  </div>
                </div>
              </div>

              {/* CHARTS METRICS CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Confidence Histogram */}
                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Confidence Distribution Histogram</h4>
                  <div className="h-64 flex items-end gap-3 pt-6">
                    
                    {/* Bins */}
                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{bin1}</div>
                      <div className="w-full bg-blue-600/20 border border-blue-500/30 rounded-t-lg transition-all" style={{ height: `${(bin1 / maxBin) * 100}%` }}></div>
                      <span className="text-[9px] text-gray-500">0.0-0.2</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{bin2}</div>
                      <div className="w-full bg-blue-600/20 border border-blue-500/30 rounded-t-lg transition-all" style={{ height: `${(bin2 / maxBin) * 100}%` }}></div>
                      <span className="text-[9px] text-gray-500">0.2-0.4</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{bin3}</div>
                      <div className="w-full bg-blue-600/40 border border-blue-500/50 rounded-t-lg transition-all" style={{ height: `${(bin3 / maxBin) * 100}%` }}></div>
                      <span className="text-[9px] text-gray-500">0.4-0.6</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{bin4}</div>
                      <div className="w-full bg-blue-600/60 border border-blue-500/70 rounded-t-lg transition-all" style={{ height: `${(bin4 / maxBin) * 100}%` }}></div>
                      <span className="text-[9px] text-gray-500">0.6-0.8</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{bin5}</div>
                      <div className="w-full bg-blue-500 border border-blue-400 rounded-t-lg transition-all" style={{ height: `${(bin5 / maxBin) * 100}%` }}></div>
                      <span className="text-[9px] text-gray-500">0.8-1.0</span>
                    </div>

                  </div>
                </div>

                {/* Tokens Savings Chart */}
                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Estimated Tokens Saved By Category</h4>
                  <div className="space-y-4 pt-4">
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Math Reasoning</span>
                        <span className="text-blue-400 font-semibold">{mathSavings} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${(mathSavings / maxSavings) * 100}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Factual Knowledge</span>
                        <span className="text-blue-400 font-semibold">{factualSavings} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${(factualSavings / maxSavings) * 100}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">NLP (Sentiment/NER/Summary)</span>
                        <span className="text-blue-400 font-semibold">{nlpSavings} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${(nlpSavings / maxSavings) * 100}%` }}></div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
