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
  Clock
} from 'lucide-react';

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

// Sample mock data simulating backend outputs
const INITIAL_TASKS: TaskResult[] = [
  {
    task_id: "task_sentiment_001",
    prompt: "Classify the sentiment of the following movie review: This movie was fantastic!",
    category: "sentiment",
    route: "local",
    handler_name: "SentimentHandler",
    confidence: 1.0,
    processing_time_ms: 1.2,
    model_used: "None (Local Lexicon)",
    tokens_saved: 150,
    answer: "Positive",
    escalated: false
  },
  {
    task_id: "task_ner_002",
    prompt: "Extract all named entities and their types from the following text: Barack Obama visited London in 2012.",
    category: "ner",
    route: "local",
    handler_name: "NERHandler_Regex",
    confidence: 0.90,
    processing_time_ms: 2.5,
    model_used: "None (Local Regex)",
    tokens_saved: 150,
    answer: "Person: Barack Obama, Organization: None, Location: London, Date: 2012",
    escalated: false
  },
  {
    task_id: "task_summary_003",
    prompt: "Summarize this article in one sentence: The economy grew by 3% in the last quarter as exports increased.",
    category: "summarization",
    route: "local",
    handler_name: "SummarizationHandler",
    confidence: 0.90,
    processing_time_ms: 3.1,
    model_used: "None (Local Summarizer)",
    tokens_saved: 150,
    answer: "The economy grew by 3% in the last quarter as exports increased.",
    escalated: false
  },
  {
    task_id: "task_math_007",
    prompt: "A store has 120 apples. If they sell 25%, how many apples are left?",
    category: "math_reasoning",
    route: "local",
    handler_name: "MathHandler",
    confidence: 1.0,
    processing_time_ms: 0.8,
    model_used: "None (Local Math Evaluator)",
    tokens_saved: 250,
    answer: "90",
    escalated: false
  },
  {
    task_id: "task_factual_008",
    prompt: "What is the speed of light in vacuum?",
    category: "factual_knowledge",
    route: "local",
    handler_name: "FactualHandler",
    confidence: 1.0,
    processing_time_ms: 0.4,
    model_used: "None (Local Knowledge Dict)",
    tokens_saved: 200,
    answer: "299,792,458 meters per second",
    escalated: false
  },
  {
    task_id: "task_debug_004",
    prompt: "Fix this function to resolve the division bug: def divide(a, b): return a / b",
    category: "code_debugging",
    route: "fireworks",
    handler_name: "None (Direct Route)",
    confidence: 0.0,
    processing_time_ms: 450.0,
    model_used: "accounts/fireworks/models/minimax-m3",
    tokens_saved: 0,
    answer: "def divide(a, b):\n    if b == 0:\n        return 0\n    return a / b\n# Added check to return 0 on zero division.",
    escalated: false
  },
  {
    task_id: "task_codegen_005",
    prompt: "Write a python function to compute the Fibonacci sequence up to N terms.",
    category: "code_generation",
    route: "fireworks",
    handler_name: "None (Direct Route)",
    confidence: 0.0,
    processing_time_ms: 580.0,
    model_used: "accounts/fireworks/models/minimax-m3",
    tokens_saved: 0,
    answer: "def fibonacci(n):\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq[:n]",
    escalated: false
  },
  {
    task_id: "task_logic_006",
    prompt: "Three people have different pets: a dog, a cat, and a bird. If John does not own the dog, and each owns a different pet, who owns the cat?",
    category: "logic",
    route: "fireworks",
    handler_name: "None (Direct Route)",
    confidence: 0.0,
    processing_time_ms: 720.0,
    model_used: "accounts/fireworks/models/minimax-m3",
    tokens_saved: 0,
    answer: "John owns the cat or bird. John does not own the dog, leaving him with the cat or bird.",
    escalated: false
  },
  {
    task_id: "task_escaped_009",
    prompt: "What is the capital of France?",
    category: "factual_knowledge",
    route: "local",
    handler_name: "FactualHandler",
    confidence: 1.0,
    processing_time_ms: 0.5,
    model_used: "None (Local Knowledge Dict)",
    tokens_saved: 200,
    answer: "Paris",
    escalated: false
  },
  {
    task_id: "task_escaped_010",
    prompt: "Who won the Nobel Prize in Physics in 2025?",
    category: "factual_knowledge",
    route: "fireworks",
    handler_name: "FactualHandler",
    confidence: 0.0,
    processing_time_ms: 520.0,
    model_used: "accounts/fireworks/models/minimax-m3",
    tokens_saved: 0,
    answer: "The Nobel Prize in Physics in 2025 has not been announced or is not registered in the knowledge base.",
    escalated: true,
    escalation_reason: "not_handled"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'routing' | 'metrics'>('home');
  const [tasks, setTasks] = useState<TaskResult[]>(INITIAL_TASKS);
  const [lastResult, setLastResult] = useState<TaskResult | null>(null);
  
  // Custom prompt input states
  const [customPrompt, setCustomPrompt] = useState('');
  const [customCategory, setCustomCategory] = useState('sentiment');
  const [isSimulating, setIsSimulating] = useState(false);

  // Live backend metrics state
  const [metrics, setMetrics] = useState({
    total_tasks: INITIAL_TASKS.length,
    local_tasks: INITIAL_TASKS.filter(t => t.route === 'local').length,
    fireworks_tasks: INITIAL_TASKS.filter(t => t.route === 'fireworks').length,
    token_savings: INITIAL_TASKS.reduce((sum, t) => sum + t.tokens_saved, 0),
    average_confidence: 0.95,
    average_latency: 1.8,
    escalation_count: INITIAL_TASKS.filter(t => t.escalated).length
  });

  const fetchMetrics = () => {
    fetch('http://localhost:8000/api/metrics')
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

    fetch('http://localhost:8000/api/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: customPrompt,
        category: customCategory,
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
        setActiveTab('dashboard');
        fetchMetrics();
      })
      .catch(error => {
        console.error('Error fetching routing decision:', error);
        setIsSimulating(false);
        alert('Failed to connect to the backend router API. Please verify the backend is running at http://localhost:8000.');
      });
  };

  // Metrics helper computations
  const totalRuns = tasks.length;
  const localRuns = tasks.filter(t => t.route === 'local').length;
  const escalatedRuns = tasks.filter(t => t.escalated).length;
  const fireworksRuns = tasks.filter(t => t.route === 'fireworks').length;
  const totalSaved = tasks.reduce((sum, t) => sum + t.tokens_saved, 0);
  
  const localConfidenceValues = tasks.filter(t => t.route === 'local' || t.escalated).map(t => t.confidence);
  const avgConfidence = localConfidenceValues.length 
    ? (localConfidenceValues.reduce((a, b) => a + b, 0) / localConfidenceValues.length).toFixed(2)
    : '0.00';
    
  const localExecutionTimes = tasks.filter(t => t.route === 'local').map(t => t.processing_time_ms);
  const avgLocalLatency = localExecutionTimes.length
    ? (localExecutionTimes.reduce((a, b) => a + b, 0) / localExecutionTimes.length).toFixed(1)
    : '0.0';

  // Escalation metrics
  const notHandledCount = tasks.filter(t => t.escalation_reason === 'not_handled').length;
  const lowConfidenceCount = tasks.filter(t => t.escalation_reason === 'low_confidence').length;
  const parseFailureCount = tasks.filter(t => t.escalation_reason === 'parse_failure').length;

  return (
    <div className="flex h-screen bg-[#070b13] text-gray-100 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0d1222] border-r border-[#1e273d] flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-[#1e273d] flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">HORCRUX</h1>
              <span className="text-xs text-blue-400 font-medium tracking-wider">HYBRID AI ROUTER</span>
            </div>
          </div>
          
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'home' 
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <HomeIcon className="w-5 h-5" />
              <span>Overview</span>
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('routing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'routing' 
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <GitFork className="w-5 h-5" />
              <span>Routing Visualizer</span>
            </button>
            <button 
              onClick={() => setActiveTab('metrics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === 'metrics' 
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Metrics & Stats</span>
            </button>
          </nav>
        </div>
        
        {/* SIDEBAR FOOTER */}
        <div className="p-4 border-t border-[#1e273d] bg-[#0b0f19]/30">
          <div className="flex items-center gap-3 p-2 bg-[#13192a] border border-[#1e273d] rounded-xl">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="text-xs">
              <div className="font-semibold text-white">System Status</div>
              <div className="text-gray-400">Pipeline Active</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-[#1e273d] bg-[#0d1222]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wider text-blue-400 uppercase">{activeTab}</span>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-gray-400">Environment: Sandbox</span>
          </div>
          <div className="text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full font-medium tracking-wide">
            Threshold Cap: 0.80
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">

          {/* TAB 1: HOME PAGE */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* HERO BOARD */}
              <div className="relative p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/10 border border-[#1e273d] overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
                <div className="max-w-2xl space-y-4">
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-widest bg-blue-900/30 border border-blue-700/20 px-3 py-1 rounded-full">
                    Hybrid Routing Model
                  </span>
                  <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                    Optimizing AI Routing with <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Zero-Token</span> Local Execution
                  </h2>
                  <p className="text-gray-300 leading-relaxed">
                    Horcrux selectively executes sentiment, NER, summary, math, and factual queries locally. Ambiguous or low-confidence queries are automatically escalated to Fireworks API serverless models.
                  </p>
                </div>
              </div>

              {/* OVERVIEW METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#131929] border border-[#1f2a45] rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Total Savings</span>
                    <h3 className="text-3xl font-extrabold text-blue-400">{metrics.token_savings}</h3>
                    <p className="text-xs text-gray-500">Fireworks tokens saved</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
                    <Coins className="w-6 h-6 text-blue-400" />
                  </div>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Local Hit Rate</span>
                    <h3 className="text-3xl font-extrabold text-emerald-400">
                      {metrics.total_tasks ? ((metrics.local_tasks / metrics.total_tasks) * 100).toFixed(0) : 0}%
                    </h3>
                    <p className="text-xs text-gray-500">{metrics.local_tasks} of {metrics.total_tasks} runs</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Avg Local Latency</span>
                    <h3 className="text-3xl font-extrabold text-indigo-400">{metrics.average_latency.toFixed(1)}ms</h3>
                    <p className="text-xs text-gray-500">Rule-based calculations</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-indigo-400" />
                  </div>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Escalation Rate</span>
                    <h3 className="text-3xl font-extrabold text-amber-400">
                      {metrics.total_tasks ? ((metrics.escalation_count / metrics.total_tasks) * 100).toFixed(0) : 0}%
                    </h3>
                    <p className="text-xs text-gray-500">{metrics.escalation_count} tasks escalated</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-600/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* QUICK ROUTE SIMULATOR FORM */}
              <div className="bg-[#131929] border border-[#1f2a45] rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Interactive Routing Simulator</h3>
                </div>
                <form onSubmit={handleSimulateRoute} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-400 font-semibold block">Query Prompt</label>
                    <input 
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. A store has 120 apples. If they sell 25%, how many are left?"
                      className="w-full bg-[#0b0f19] border border-[#1e273d] px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-gray-200 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-semibold block">Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-[#1e273d] px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-gray-200 transition-colors"
                    >
                      <option value="sentiment">Sentiment</option>
                      <option value="ner">NER</option>
                      <option value="summarization">Summarization</option>
                      <option value="math_reasoning">Math Reasoning</option>
                      <option value="factual_knowledge">Factual Knowledge</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSimulating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm"
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
          )}

          {/* TAB 2: DASHBOARD PAGE */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Execution Logs</h3>
                  <p className="text-xs text-gray-400">Real-time log of tasks processed by Horcrux routing pipeline.</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    className="bg-[#131929] border border-[#1f2a45] text-xs text-gray-300 rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* LOGS DATAGRID */}
              <div className="bg-[#131929] border border-[#1f2a45] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#0d1222] border-b border-[#1f2a45] text-gray-400 text-xs uppercase font-semibold">
                        <th className="p-4">Task ID / Category</th>
                        <th className="p-4">Prompt</th>
                        <th className="p-4">Selected Route</th>
                        <th className="p-4">Handler</th>
                        <th className="p-4 text-center">Confidence</th>
                        <th className="p-4 text-center">Latency</th>
                        <th className="p-4 text-center">Tokens Saved</th>
                        <th className="p-4">Final Answer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2a45]">
                      {tasks.map((task) => (
                        <tr key={task.task_id} className="hover:bg-[#182035]/50 transition-colors">
                          <td className="p-4 space-y-1 vertical-top">
                            <div className="font-semibold text-white text-xs">{task.task_id}</div>
                            <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full font-medium">
                              {task.category}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-300 max-w-xs truncate" title={task.prompt}>
                            {task.prompt}
                          </td>
                          <td className="p-4 vertical-top">
                            {task.route === 'local' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/30 px-2 py-1 rounded-full font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Local</span>
                              </span>
                            ) : task.escalated ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950 text-amber-400 border border-amber-800/30 px-2 py-1 rounded-full font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Escalated</span>
                                </span>
                                <div className="text-[9px] text-gray-500 block truncate max-w-[100px]" title={task.model_used}>
                                  {task.model_used.split('/').pop()}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/30 px-2 py-1 rounded-full font-medium">
                                  <Database className="w-3.5 h-3.5" />
                                  <span>Fireworks</span>
                                </span>
                                <div className="text-[9px] text-gray-500 block truncate max-w-[100px]" title={task.model_used}>
                                  {task.model_used.split('/').pop()}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-xs text-gray-400 font-mono">
                            {task.handler_name}
                          </td>
                          <td className="p-4 text-center">
                            {task.route === 'fireworks' && !task.escalated ? (
                              <span className="text-xs text-gray-600">-</span>
                            ) : (
                              <span className={`text-xs font-semibold ${
                                task.confidence >= 0.80 ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {task.confidence.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-xs text-gray-400">
                            {task.processing_time_ms} ms
                          </td>
                          <td className="p-4 text-center font-semibold text-xs text-blue-400">
                            {task.tokens_saved > 0 ? `+${task.tokens_saved}` : '-'}
                          </td>
                          <td className="p-4 text-xs text-gray-300 max-w-xs font-mono truncate" title={task.answer}>
                            {task.answer}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROUTING VISUALIZATION */}
          {activeTab === 'routing' && (
            <div className="space-y-8 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-white">Hybrid Routing Pipeline Architecture</h3>
                <p className="text-xs text-gray-400">Schematic visualization of how tasks flow through classification, scoring, and execution selection.</p>
              </div>

              {/* Active Trace Animator */}
              {lastResult ? (
                <div className="bg-[#131929] border border-blue-500/30 p-8 rounded-3xl space-y-6 shadow-2xl relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-bold text-white">Active Routing Trace: {lastResult.task_id}</span>
                    </div>
                    <span className="text-xs text-gray-500">Latency: {lastResult.processing_time_ms} ms</span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-8">
                    {/* Node 1: Prompt */}
                    <div className="bg-slate-900 border border-blue-500/20 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block">Prompt</span>
                      <div className="text-xs font-semibold text-gray-200 truncate mt-0.5" title={lastResult.prompt}>{lastResult.prompt}</div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-blue-500 rotate-90 md:rotate-0" />

                    {/* Node 2: Classifier */}
                    <div className="bg-[#1e2336] border border-blue-500/40 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block">Classifier</span>
                      <div className="text-xs font-semibold text-white mt-0.5 capitalize">{lastResult.category}</div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-blue-500 rotate-90 md:rotate-0" />

                    {/* Conditional steps */}
                    {lastResult.route === 'local' ? (
                      <>
                        <div className="bg-emerald-950/20 border border-emerald-900/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Local Handler</span>
                          <div className="text-xs font-semibold text-gray-200 mt-0.5 font-mono text-[10px]">{lastResult.handler_name}</div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 md:rotate-0" />

                        <div className="bg-emerald-950/30 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Confidence</span>
                          <div className="text-xs font-bold text-emerald-400 mt-0.5">C = {lastResult.confidence.toFixed(2)}</div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 md:rotate-0" />

                        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl text-center w-36 font-bold text-xs shadow-lg shadow-emerald-500/20">
                          LOCAL (Saved {lastResult.tokens_saved} Tokens)
                        </div>
                      </>
                    ) : lastResult.escalated ? (
                      <>
                        <div className="bg-amber-950/20 border border-amber-900/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">Local Handler</span>
                          <div className="text-xs font-semibold text-gray-200 mt-0.5 font-mono text-[10px]">{lastResult.handler_name}</div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-amber-500 rotate-90 md:rotate-0" />

                        <div className="bg-amber-950/30 border border-amber-500/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">Escalated</span>
                          <div className="text-xs font-bold text-amber-400 mt-0.5">{lastResult.escalation_reason}</div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-amber-500 rotate-90 md:rotate-0" />

                        <div className="bg-indigo-950 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Fireworks Model</span>
                          <div className="text-xs font-semibold text-white mt-0.5 block truncate text-[10px]">{lastResult.model_used.split('/').pop()}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-indigo-950 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Route</span>
                          <div className="text-xs font-semibold text-indigo-300 mt-0.5">Direct API</div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-indigo-500 rotate-90 md:rotate-0" />

                        <div className="bg-indigo-950 border border-indigo-500/30 px-4 py-2.5 rounded-xl text-center w-36 shadow-md">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Fireworks Model</span>
                          <div className="text-xs font-semibold text-white mt-0.5 block truncate text-[10px]">{lastResult.model_used.split('/').pop()}</div>
                        </div>
                      </>
                    )}

                    <ArrowRight className="w-5 h-5 text-blue-500 rotate-90 md:rotate-0" />

                    {/* Node 5: Answer */}
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-center w-36 shadow-lg shadow-blue-500/20">
                      <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider block">Answer</span>
                      <div className="text-xs font-bold truncate mt-0.5" title={lastResult.answer}>{lastResult.answer}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#131929] border border-dashed border-[#1f2a45] p-12 rounded-3xl text-center text-gray-500">
                  No trace loaded. Run a custom query in the simulator to animate its live routing execution path.
                </div>
              )}

              {/* ARCHITECTURE WORKFLOW DIAGRAM */}
              <div className="p-8 rounded-3xl bg-[#131929] border border-[#1f2a45] shadow-2xl flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-full max-w-3xl flex flex-col gap-8 relative">
                  
                  {/* Pipeline Step 1 */}
                  <div className="flex justify-center">
                    <div className="px-6 py-4 rounded-2xl bg-slate-900 border border-[#1e273d] flex flex-col items-center text-center shadow-lg w-64">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Input Prompt</span>
                      <div className="text-xs font-semibold text-white mt-1">task.prompt</div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-4">
                    <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                  </div>

                  {/* Pipeline Step 2 */}
                  <div className="flex justify-center">
                    <div className="px-6 py-4 rounded-2xl bg-[#1e2336] border border-blue-500/20 flex flex-col items-center text-center shadow-lg w-64">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Heuristic Classifier</span>
                      <div className="text-xs font-semibold text-white mt-1">Category & Difficulty Evaluation</div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-4">
                    <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                  </div>

                  {/* Pipeline Step 3 */}
                  <div className="grid grid-cols-2 gap-8 items-center">
                    
                    {/* Left: Router Decision Fireworks */}
                    <div className="flex flex-col items-center border border-dashed border-[#1f2a45] p-6 rounded-2xl bg-[#0b0f19]/30">
                      <div className="px-4 py-2 bg-indigo-950 text-indigo-400 border border-indigo-800/30 rounded-full text-[10px] font-bold uppercase mb-4">
                        Fireworks Target
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-xs font-bold text-white">Direct Escalate</div>
                        <p className="text-[10px] text-gray-400 max-w-[180px]">Used for complex categories like code or logic reasoning.</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-indigo-500 rotate-90 mt-6" />
                      <div className="mt-4 px-6 py-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px] w-full text-center">
                        Minimax-M3 Client
                      </div>
                    </div>

                    {/* Right: Router Decision Local Dispatcher */}
                    <div className="flex flex-col items-center border border-dashed border-[#1f2a45] p-6 rounded-2xl bg-[#0b0f19]/30">
                      <div className="px-4 py-2 bg-emerald-950 text-emerald-400 border border-emerald-800/30 rounded-full text-[10px] font-bold uppercase mb-4">
                        Local Dispatcher
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-xs font-bold text-white">Evaluate Local Handler</div>
                        <p className="text-[10px] text-gray-400 max-w-[180px]">Executes rule-based Sentiment, NER, Summarizer, Math, or Factual modules.</p>
                      </div>
                      
                      <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90 mt-6" />
                      
                      <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex flex-col items-center w-full">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Confidence Score</span>
                        <div className="text-lg font-extrabold mt-1">C &ge; 0.80 ?</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        
                        {/* Under Threshold */}
                        <div className="flex flex-col items-center bg-amber-950/20 border border-amber-900/30 p-3 rounded-xl">
                          <XCircle className="w-4 h-4 text-amber-500 mb-1" />
                          <span className="text-[9px] text-amber-400 font-bold uppercase">No (C &lt; 0.80)</span>
                          <span className="text-[8px] text-gray-500 mt-1 block">Escalate to API</span>
                        </div>

                        {/* Above Threshold */}
                        <div className="flex flex-col items-center bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">Yes (C &ge; 0.80)</span>
                          <span className="text-[8px] text-gray-500 mt-1 block">Answer Locally</span>
                        </div>

                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>
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
                  <div className="text-4xl font-extrabold text-white">{metrics.average_confidence.toFixed(2)}</div>
                  <div className="w-full bg-[#0b0f19] h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full" 
                      style={{ width: `${metrics.average_confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-500">Across local routing candidates</span>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Escalation Statistics</h4>
                  <div className="text-4xl font-extrabold text-amber-500">{metrics.escalation_count}</div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Not Handled: {notHandledCount}</span>
                    <span>Low Confidence: {lowConfidenceCount}</span>
                    <span>Parse Failures: {parseFailureCount}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Failed local attempts Escalated to Fireworks</span>
                </div>

                <div className="bg-[#131929] border border-[#1f2a45] p-6 rounded-2xl space-y-4 shadow-xl">
                  <h4 className="text-xs text-gray-400 uppercase font-semibold">Saved vs API Executions</h4>
                  <div className="text-4xl font-extrabold text-emerald-400">{metrics.local_tasks} / {metrics.total_tasks}</div>
                  <div className="w-full bg-[#0b0f19] h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${metrics.total_tasks ? (metrics.local_tasks / metrics.total_tasks) * 100 : 0}%` }}
                    ></div>
                    <div 
                      className="bg-indigo-500 h-full" 
                      style={{ width: `${metrics.total_tasks ? (metrics.fireworks_tasks / metrics.total_tasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span className="text-emerald-400">Local Runs: {metrics.local_tasks}</span>
                    <span className="text-indigo-400">API Runs: {metrics.fireworks_tasks}</span>
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
                      <div className="text-xs text-gray-400">{tasks.filter(t => t.confidence <= 0.2 && t.route === 'local').length}</div>
                      <div className="w-full bg-blue-600/20 border border-blue-500/30 rounded-t-lg transition-all" style={{ height: '10%' }}></div>
                      <span className="text-[9px] text-gray-500">0.0-0.2</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{tasks.filter(t => t.confidence > 0.2 && t.confidence <= 0.4 && t.route === 'local').length}</div>
                      <div className="w-full bg-blue-600/20 border border-blue-500/30 rounded-t-lg transition-all" style={{ height: '10%' }}></div>
                      <span className="text-[9px] text-gray-500">0.2-0.4</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{tasks.filter(t => t.confidence > 0.4 && t.confidence <= 0.6 && t.route === 'local').length}</div>
                      <div className="w-full bg-blue-600/40 border border-blue-500/50 rounded-t-lg transition-all" style={{ height: '30%' }}></div>
                      <span className="text-[9px] text-gray-500">0.4-0.6</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{tasks.filter(t => t.confidence > 0.6 && t.confidence <= 0.8 && t.route === 'local').length}</div>
                      <div className="w-full bg-blue-600/60 border border-blue-500/70 rounded-t-lg transition-all" style={{ height: '20%' }}></div>
                      <span className="text-[9px] text-gray-500">0.6-0.8</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-400">{tasks.filter(t => t.confidence > 0.8 && t.route === 'local').length}</div>
                      <div className="w-full bg-blue-500 border border-blue-400 rounded-t-lg transition-all" style={{ height: '80%' }}></div>
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
                        <span className="text-blue-400 font-semibold">{tasks.filter(t => t.category === 'math_reasoning' && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0)} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Factual Knowledge</span>
                        <span className="text-blue-400 font-semibold">{tasks.filter(t => t.category === 'factual_knowledge' && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0)} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">NLP (Sentiment/NER/Summary)</span>
                        <span className="text-blue-400 font-semibold">{tasks.filter(t => ['sentiment', 'ner', 'summarization'].includes(t.category) && t.route === 'local').reduce((sum, t) => sum + t.tokens_saved, 0)} tokens</span>
                      </div>
                      <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: '25%' }}></div>
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
