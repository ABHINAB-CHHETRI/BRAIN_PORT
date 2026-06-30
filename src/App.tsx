import { useState, useEffect } from 'react';
import { Sparkles, Trash2, CheckCircle2, Circle, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Task, AIHelpData } from './types';
import RetroWindow from './components/RetroWindow';
import Taskbar from './components/Taskbar';
import AuthModal from './components/AuthModal';
import TaskForm from './components/TaskForm';
import Notepad from './components/Notepad';
import AiChatbot from './components/AiChatbot';

const handleDownloadManual = (username: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title block
  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 128); // Windows 95 Dark Navy Blue
  doc.text('TASK BUDDY 95 - REFERENCE MANUAL', 14, 25);
  
  // horizontal separator rule
  doc.setLineWidth(0.5);
  doc.setDrawColor(128, 128, 128);
  doc.line(14, 28, 196, 28);

  // License and meta details
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Prepared exclusively for licensed operator: ${username.toUpperCase()}`, 14, 35);
  doc.text(`Workstation Core Version: Retro-OS v2.95 (32-Bit System)`, 14, 40);
  doc.text(`Date of System Initialization: ${new Date().toLocaleDateString()}`, 14, 45);

  // Section 1
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 128);
  doc.text('1. SYSTEM ARCHITECTURE & OVERVIEW', 14, 58);

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const introText = [
    'Task Buddy 95 is a high-performance productivity workstation crafted',
    'to run tasks, draft persistent memory blocks, and receive virtual assistant',
    'advices in real-time.',
    '',
    'All databases are backed persistently with an on-disk better-sqlite3 database',
    'engine, ensuring absolute integrity of user tasks, lists, and notebooks',
    'across reboots, container updates, or browser sessions.'
  ];
  doc.text(introText, 14, 65);

  // Section 2
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 128);
  doc.text('2. CORE USER SYSTEM FUNCTIONS', 14, 110);

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const modulesText = [
    '* TASK ADD PANEL: Register new tasks with descriptive titles, descriptions,',
    '  and strict priority levels (Urgent, High, Normal, Low).',
    '* TASK MANAGER: Move items dynamically from Backlog into Active/Completed lists.',
    '* MEMORY NOTES: Access and edit persistent notes within the workspace. Multi-note',
    '  support ensures separate blocks of thoughts can be saved concurrently.',
    '* TASK ASSISTANT 95: Engage with Gemini AI to generate micro-steps, sub-tasks,',
    '  or ask direct brainstorm queries inside our custom terminal.'
  ];
  doc.text(modulesText, 14, 117);

  // Section 3
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 128);
  doc.text('3. PERSISTENT STORAGE DETAILS', 14, 165);

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const storageText = [
    'Unlike modern cloud systems that risk transient data-leaks or sudden resets,',
    'Task Buddy 95 writes direct binary transactions onto a local SQLite database',
    'file (task_buddy_95.db).',
    '',
    'This guarantees that your notes, active priorities, and logs remain completely',
    'intact within the server disk storage.'
  ];
  doc.text(storageText, 14, 172);

  // Footer separator
  doc.setLineWidth(0.3);
  doc.setDrawColor(192, 192, 192);
  doc.line(14, 270, 196, 270);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Task Buddy 95 - Microsoft Windows 95 Desktop Integration Helpdesk', 14, 275);
  doc.text('Page 1 of 1', 178, 275);

  doc.save('Task_Buddy_95_User_Manual.pdf');
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time ticking clock state
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hrs = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12;
      hrs = hrs ? hrs : 12;
      setCurrentTime(`${hrs}:${mins}:${secs} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notepad statistics state
  const [noteStats, setNoteStats] = useState({ totalCharacters: 0, totalWords: 0, notesCount: 0 });

  // AI help panels state
  const [aiHelpCache, setAiHelpCache] = useState<{ [taskId: string]: AIHelpData }>({});
  const [loadingAiTaskId, setLoadingAiTaskId] = useState<string | null>(null);
  const [expandedAiTaskId, setExpandedAiTaskId] = useState<string | null>(null);

  // Custom retro dialog state for deletes (avoiding standard browser confirms)
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);

  // User manual dialog for first time login
  const [showManualDialog, setShowManualDialog] = useState(false);

  // Load tasks on login
  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const res = await fetch('/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load tasks from server.');
      }

      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAuthSuccess = (newToken: string, newUsername: string, isFirstLogin?: boolean) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    setError(null);
    if (isFirstLogin) {
      setShowManualDialog(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setTasks([]);
    setAiHelpCache({});
    setExpandedAiTaskId(null);
    setDeleteConfirmTaskId(null);
  };

  const handleAddTask = async (title: string, description: string, priority: number) => {
    try {
      setError(null);
      const res = await fetch('/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, priority }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create task');
      }

      const newTask = await res.json();
      setTasks((prev) => [...prev, { ...newTask, is_completed: false }]);
    } catch (err: any) {
      setError(err.message || 'Could not add task.');
      throw err;
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      setError(null);
      const updatedCompleted = !task.is_completed;
      const res = await fetch(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_completed: updatedCompleted }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error('Could not update task status.');
      }

      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: updated.is_completed } : t))
      );
    } catch (err: any) {
      setError(err.message || 'Error updating task.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to delete task.');
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (expandedAiTaskId === id) {
        setExpandedAiTaskId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting task.');
    } finally {
      setDeleteConfirmTaskId(null);
    }
  };

  const handleFetchAiHelp = async (task: Task) => {
    // If already expanded, just close it
    if (expandedAiTaskId === task.id) {
      setExpandedAiTaskId(null);
      return;
    }

    // If cache has it, just open it
    if (aiHelpCache[task.id]) {
      setExpandedAiTaskId(task.id);
      return;
    }

    // Fetch from backend
    try {
      setLoadingAiTaskId(task.id);
      setError(null);
      const res = await fetch('/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_title: task.title,
          task_description: task.description,
        }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const payload = await res.json();
      if (!res.ok || payload.status === 'error') {
        throw new Error(payload.error || 'Gemini assistance offline or model query timed out.');
      }

      setAiHelpCache((prev) => ({
        ...prev,
        [task.id]: payload.data,
      }));
      setExpandedAiTaskId(task.id);
    } catch (err: any) {
      setError(`AI Help Error: ${err.message}`);
    } finally {
      setLoadingAiTaskId(null);
    }
  };

  // Sort logic: Incomplete sorted by priority (1=High, 2=Medium, 3=Low), then alphabetically by title.
  const incomplete = tasks.filter((t) => !t.is_completed);
  const sortedIncomplete = [...incomplete].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.title.localeCompare(b.title);
  });

  // Split into AI Top 3 Important Tasks and Backlog
  const aiSelectedTasks = sortedIncomplete.slice(0, 3);
  const backlogTasks = sortedIncomplete.slice(3);

  // Completed Tasks
  const completedTasks = tasks.filter((t) => t.is_completed);

  return (
    <div className="min-h-screen bg-[#008080] pb-16 pt-3 px-2 md:px-4 font-pixel selection:bg-[#000080] selection:text-white select-none text-sm md:text-base leading-relaxed">
      {/* Setup Authentication Modal if not logged in */}
      {!token && <AuthModal onAuthSuccess={handleAuthSuccess} />}

      {/* Main retro dashboard structure */}
      {token && (
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          
          {/* Top retro Header / Branding panel */}
          <div className="p-3 bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-black border-b-black flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between select-none shadow-lg">
            
            {/* Left: Unique Branded retro CRT block */}
            <div className="flex items-center gap-3.5 shrink-0 bg-gradient-to-r from-[#000080] via-[#000050] to-[#1084d0] text-white p-3 border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#303030] border-b-[#303030] min-w-[280px] shadow-md relative overflow-hidden rounded-sm">
              {/* Scanlines visual accent */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
              
              {/* Monitor bezel */}
              <div className="w-12 h-11 bg-[#dfdfdf] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] p-1 flex flex-col justify-between shrink-0 shadow-inner relative">
                {/* CRT Screen inside bezel */}
                <div className="w-full h-full bg-[#001100] border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] relative overflow-hidden flex flex-col items-center justify-center text-[8px] font-mono text-[#33ff33]">
                  {/* Blinking green pixel terminal animation */}
                  <span className="animate-pulse leading-none font-extrabold text-[10px]">📟</span>
                  <span className="text-[6px] text-center tracking-tighter opacity-80 mt-0.5 animate-bounce leading-none">OK_95</span>
                </div>
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 font-pixel drop-shadow-[2px_2px_0px_rgba(0,0,0,0.9)] animate-pulse">
                    TASK BUDDY 95
                  </h1>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 border border-white animate-ping shrink-0" />
                  <span className="text-gray-200 truncate leading-none">
                    USER: <span className="font-extrabold text-yellow-300 underline font-mono select-all">{username}</span>
                  </span>
                </div>
                <p className="text-[8px] text-blue-200 uppercase tracking-widest font-mono mt-0.5">
                  Secure Retro-OS v2.95
                </p>
              </div>
            </div>

            {/* Middle: Integrated Stats Board (High Legibility & Prominence) */}
            <div className="flex flex-col sm:flex-row gap-2 grow items-stretch">
              {/* Stat 1: Notepad Storage */}
              <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2 flex items-center gap-2.5 text-xs">
                <div className="text-xl shrink-0 p-1 bg-[#dfdfdf] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080]">💾</div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-[10px] text-gray-500 block uppercase tracking-tight leading-none">Notepad Storage</span>
                  <div className="text-xs font-bold text-black mt-1 flex justify-between items-center">
                    <span>{noteStats.totalCharacters.toLocaleString()} Chars</span>
                    <span className="text-[10px] bg-blue-100 text-blue-900 px-1 py-0.5 font-bold font-mono border border-blue-200">{noteStats.notesCount} Notes</span>
                  </div>
                </div>
              </div>

              {/* Stat 2: Total Tasks Completed */}
              <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2 flex items-center gap-2.5 text-xs">
                <div className="text-xl shrink-0 p-1 bg-[#dfdfdf] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080]">🏆</div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-[10px] text-gray-500 block uppercase tracking-tight leading-none">TOTAL TASKS Completed</span>
                  <div className="text-xs font-bold text-black mt-1 flex justify-between items-center">
                    <span>{tasks.filter(t => t.is_completed).length} / {tasks.length} Done</span>
                    <span className="text-[10px] bg-green-100 text-green-900 px-1 py-0.5 font-bold font-mono border border-green-200">
                      {tasks.length > 0 ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Controls & Realtime clock system tray */}
            <div className="flex flex-wrap gap-2 shrink-0 items-center justify-end">
              {/* System Tray Clock */}
              <div className="bg-[#dfdfdf] border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-3 py-1.5 flex items-center gap-2 text-xs font-mono font-bold text-black select-none shadow-inner h-8">
                <span className="text-xs">🔊</span>
                <span className="text-blue-900 border-r border-[#808080] pr-2">SYS</span>
                <span className="text-black tabular-nums">{currentTime || "12:00:00 PM"}</span>
              </div>

              <button
                onClick={() => handleDownloadManual(username || 'Workstation User')}
                className="px-3 py-1.5 bg-[#000080] text-white border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-black border-b-black text-xs font-pixel font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-800 active:border-inset h-8 shadow-md"
                title="Download Retro Reference Manual (PDF)"
              >
                <span>📖</span>
                <span>User Manual (PDF)</span>
              </button>

              <button
                onClick={fetchTasks}
                disabled={loadingTasks}
                className="px-3.5 py-1.5 bg-[#c0c0c0] border-outset text-xs font-pixel font-bold flex items-center gap-1.5 cursor-pointer active:border-inset h-8"
              >
                <RefreshCw className={`w-3 h-3 ${loadingTasks ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 bg-[#c0c0c0] border-outset text-xs font-pixel font-bold text-red-800 hover:text-red-900 flex items-center gap-1.5 cursor-pointer active:border-inset h-8"
              >
                <span>🚪</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Error alert banner */}
          {error && (
            <div className="p-3 bg-red-100 border-2 border-red-700 text-red-950 flex gap-2.5 items-center select-none shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-800 shrink-0" />
              <div>
                <span className="font-bold block text-xs md:text-sm">Warning: System Subsystem Alert</span>
                <span className="text-xs block mt-0.5">{error}</span>
              </div>
            </div>
          )}

          {/* Grid Layout (Top Row) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Hand: Controls (4 columns) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              {/* Task Creation Window */}
              <RetroWindow title="Task Add Panel" id="control-module-window">
                <TaskForm onAddTask={handleAddTask} />
              </RetroWindow>

            </div>

            {/* Right Hand: Task Boards (8 columns) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              <RetroWindow title="Task Manager" id="workspace-window">
                
                {loadingTasks && (
                  <div className="p-6 text-center text-gray-700 font-bold border border-dashed border-[#808080] my-1 text-xs">
                    <span className="inline-block animate-spin mr-1.5">⚙️</span>
                    LOADING SECURE DATA...
                  </div>
                )}

                {!loadingTasks && tasks.length === 0 && (
                  <div className="p-8 text-center text-gray-600 border border-dashed border-[#808080] my-1 select-none bg-white text-xs">
                    <HelpCircle className="w-8 h-8 mx-auto text-gray-400 mb-1.5" />
                    <p className="font-bold">NO TASKS FOUND</p>
                    <p className="text-[10px] mt-0.5 leading-tight text-gray-500">Use the control panel on the left to create a task.</p>
                  </div>
                )}

                {/* Section 1: AI Selected 3 Important Tasks */}
                {incomplete.length > 0 && (
                  <div className="mb-3">
                    <div className="bg-[#000080] text-white px-2 py-0.5 font-bold text-[11px] tracking-wider flex items-center justify-between shadow-xs mb-1.5">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                        ★ AI Selected High-Priority (TOP 3)
                      </span>
                      <span className="text-[9px] bg-yellow-400 text-black px-1 font-bold">Priority Order</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {aiSelectedTasks.map((task) => (
                        <div key={task.id} className="border-inset bg-white p-2 flex flex-col gap-1 shadow-inner">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5">
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => handleToggleComplete(task)}
                                className="accent-[#000080] cursor-pointer mt-0.5"
                              />
                              <div>
                                <span className="font-bold text-xs text-black block leading-tight">{task.title}</span>
                                {task.description && (
                                  <span className="text-[10px] text-gray-700 block mt-0.5 leading-tight">{task.description}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[9px] px-1 font-bold select-none border ${
                                task.priority === 1 ? 'bg-red-100 text-red-900 border-red-700' :
                                task.priority === 2 ? 'bg-yellow-100 text-yellow-900 border-yellow-600' :
                                'bg-gray-100 text-gray-700 border-gray-400'
                              }`}>
                                {task.priority === 1 ? 'HIGH' : task.priority === 2 ? 'MED' : 'LOW'}
                              </span>
                              
                              <button
                                onClick={() => handleFetchAiHelp(task)}
                                disabled={loadingAiTaskId !== null}
                                className="text-[9px] px-1 py-0.5 bg-[#c0c0c0] border-outset cursor-pointer hover:bg-yellow-100 flex items-center justify-center active:border-inset font-bold"
                                title="Query Gemini explanation"
                              >
                                {loadingAiTaskId === task.id ? (
                                  <span className="animate-spin">🌀</span>
                                ) : (
                                  '✨ AI'
                                )}
                              </button>

                              <button
                                onClick={() => setDeleteConfirmTaskId(task.id)}
                                className="text-[9px] px-1 py-0.5 bg-[#c0c0c0] border-outset cursor-pointer hover:bg-red-100 text-red-800 flex items-center justify-center active:border-inset"
                                title="Delete Task"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Expanded AI help panel inside task card */}
                          {expandedAiTaskId === task.id && aiHelpCache[task.id] && (
                            <div className="mt-1.5 p-2 bg-white border-inset text-[10px] text-black">
                              <div className="text-[10px] font-bold text-[#000080] border-b border-[#808080] pb-0.5 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">🧠 ANALYSIS: {task.title}</span>
                                <span className="opacity-60 text-[9px]">GEMINI PAYLOAD</span>
                              </div>
                              
                              <div className="mb-1.5">
                                <span className="font-bold underline block">Explanation:</span>
                                <p className="leading-tight text-gray-800 italic mt-0.5">
                                  "{aiHelpCache[task.id].explanation}"
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-dotted border-[#808080] pt-1.5 mt-1">
                                <div>
                                  <span className="font-bold underline block text-[#000080]">Clickable Links & Resources:</span>
                                  <ul className="list-disc list-inside mt-1 text-gray-800 flex flex-col gap-1">
                                    {aiHelpCache[task.id].clickable_links?.map((link, i) => (
                                      <li key={i} className="leading-tight truncate text-[10px]">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          referrerPolicy="no-referrer"
                                          rel="noopener noreferrer"
                                          className="text-blue-900 underline hover:text-blue-600 font-bold active:text-purple-800 inline-flex items-center gap-1"
                                        >
                                          🔗 {link.title}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="font-bold underline block text-green-800">Suggested Action Items:</span>
                                  <ol className="list-decimal list-inside mt-0.5 font-semibold text-gray-950">
                                    {aiHelpCache[task.id].next_steps?.map((s, i) => (
                                      <li key={i} className="leading-tight">{s}</li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Task Backlog */}
                {backlogTasks.length > 0 && (
                  <div className="mb-3">
                    <div className="bg-[#808080] text-white px-2 py-0.5 font-bold text-[11px] tracking-wider flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1">
                        <span>📂</span> Backlog Items ({backlogTasks.length})
                      </span>
                    </div>

                    <div className={`bg-white border-inset p-2 flex flex-col gap-1 pr-1 ${backlogTasks.length > 5 ? 'max-h-[170px] overflow-y-auto' : ''}`}>
                      {backlogTasks.map((task) => (
                        <div key={task.id} className="border-b border-[#f0f0f0] last:border-0 pb-1 mb-1">
                          <div className="flex items-center justify-between gap-2 p-1 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={false}
                                onChange={() => handleToggleComplete(task)}
                                className="accent-[#000080] cursor-pointer"
                              />
                              <div className="truncate">
                                <span className="font-bold text-black block leading-none truncate">{task.title}</span>
                                {task.description && (
                                  <span className="text-[10px] text-gray-500 block leading-none truncate mt-0.5 max-w-[280px] sm:max-w-md">{task.description}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[9px] border border-[#808080] px-1 font-bold ${
                                task.priority === 1 ? 'border-red-600 text-red-700 bg-red-50' :
                                task.priority === 2 ? 'border-yellow-600 text-yellow-700 bg-yellow-50' :
                                'border-gray-300 text-gray-500'
                              }`}>
                                {task.priority === 1 ? 'HI' : task.priority === 2 ? 'MED' : 'LO'}
                              </span>
                              
                              <button
                                onClick={() => handleFetchAiHelp(task)}
                                className="text-[9px] px-1 bg-[#c0c0c0] border-outset cursor-pointer active:border-inset font-bold font-pixel"
                                title="Gemini AI Help"
                              >
                                {loadingAiTaskId === task.id ? '🌀' : 'AI'}
                              </button>

                              <button
                                onClick={() => setDeleteConfirmTaskId(task.id)}
                                className="text-[9px] px-1 bg-[#c0c0c0] border-outset cursor-pointer text-red-800 active:border-inset font-bold"
                                title="Delete Task"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Expanded AI help panel inside backlog item */}
                          {expandedAiTaskId === task.id && aiHelpCache[task.id] && (
                            <div className="mt-1 p-2 bg-[#f9f9f9] border border-dashed border-[#808080] text-[10px] text-black">
                              <div className="text-[10px] font-bold text-[#000080] border-b border-[#808080] pb-0.5 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">🧠 ANALYSIS: {task.title}</span>
                                <span className="opacity-60 text-[9px]">GEMINI PAYLOAD</span>
                              </div>
                              
                              <div className="mb-1.5">
                                <span className="font-bold underline block">Explanation:</span>
                                <p className="leading-tight text-gray-800 italic mt-0.5">
                                  "{aiHelpCache[task.id].explanation}"
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-dotted border-[#808080] pt-1.5 mt-1">
                                <div>
                                  <span className="font-bold underline block text-[#000080]">Clickable Links & Resources:</span>
                                  <ul className="list-disc list-inside mt-1 text-gray-800 flex flex-col gap-1">
                                    {aiHelpCache[task.id].clickable_links?.map((link, i) => (
                                      <li key={i} className="leading-tight truncate text-[10px]">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          referrerPolicy="no-referrer"
                                          rel="noopener noreferrer"
                                          className="text-blue-900 underline hover:text-blue-600 font-bold active:text-purple-800 inline-flex items-center gap-1"
                                        >
                                          🔗 {link.title}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="font-bold underline block text-green-800">Suggested Action Items:</span>
                                  <ol className="list-decimal list-inside mt-0.5 font-semibold text-gray-950">
                                    {aiHelpCache[task.id].next_steps?.map((s, i) => (
                                      <li key={i} className="leading-tight">{s}</li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div>
                    <div className="bg-[#c0c0c0] border border-[#808080] text-black px-2 py-0.5 font-bold text-[10px] tracking-wider flex items-center justify-between mb-1.5 font-pixel">
                      <span className="flex items-center gap-1">
                        <span>✅</span> Completed Tasks ({completedTasks.length})
                      </span>
                    </div>

                    <div className={`bg-[#dfdfdf] border-inset p-2 flex flex-col gap-1 pr-1 opacity-75 ${completedTasks.length > 5 ? 'max-h-[150px] overflow-y-auto' : ''}`}>
                      {completedTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-2 p-1 border-b border-gray-300 last:border-0 select-none text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => handleToggleComplete(task)}
                              className="accent-[#000080] cursor-pointer"
                            />
                            <span className="text-gray-600 line-through block leading-none truncate">{task.title}</span>
                          </div>

                          <button
                            onClick={() => setDeleteConfirmTaskId(task.id)}
                            className="text-[9px] px-1 bg-[#c0c0c0] border-outset cursor-pointer text-red-800 active:border-inset font-bold"
                            title="Delete completed task"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </RetroWindow>

            </div>

          </div>

          {/* Bottom Row: Notepad & AI Chatbot Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
            <div className="lg:col-span-7">
              <RetroWindow title="Task Notepad & Notes Workspace" id="notepad-window">
                <Notepad 
                  token={token} 
                  onStatsChange={setNoteStats}
                />
              </RetroWindow>
            </div>
            
            <div className="lg:col-span-5">
              <RetroWindow title="Task Assistant 95 Chat" id="ai-chatbot-window">
                <AiChatbot token={token} />
              </RetroWindow>
            </div>
          </div>
          
          {/* Custom Retro Dialog Overlay for Deletes (avoiding standard browser alerts) */}
          {deleteConfirmTaskId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="w-80 p-[3px] bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#000000] border-b-[#000000] shadow-xl">
                {/* titlebar */}
                <div className="bg-[#000080] px-2 py-1 flex items-center justify-between">
                  <span className="text-white font-bold text-xs">System Query</span>
                  <button
                    onClick={() => setDeleteConfirmTaskId(null)}
                    className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] font-pixel text-[10px] font-bold flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                {/* dialogue box content */}
                <div className="p-4 flex gap-3 text-black">
                  <span className="text-3xl select-none">❓</span>
                  <div>
                    <span className="font-bold block text-xs">Delete confirmation</span>
                    <span className="text-[11px] text-gray-800 block mt-1 leading-tight">Are you absolutely sure you want to permanently erase this task thread from the database?</span>
                  </div>
                </div>
                {/* buttons */}
                <div className="flex justify-end gap-2 p-2 bg-[#dfdfdf] border-t border-[#808080]">
                  <button
                    onClick={() => handleDeleteTask(deleteConfirmTaskId)}
                    className="px-4 py-1 bg-[#c0c0c0] text-[11px] font-bold border-outset cursor-pointer active:border-inset"
                  >
                    Yes (Erase)
                  </button>
                  <button
                    onClick={() => setDeleteConfirmTaskId(null)}
                    className="px-4 py-1 bg-[#c0c0c0] text-[11px] font-bold border-outset cursor-pointer active:border-inset"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Manual Modal for First Time Logins */}
          {showManualDialog && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
              <div className="w-[430px] max-w-full p-[3px] bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-[#000000] border-b-[#000000] shadow-2xl font-pixel text-black select-none">
                {/* Title bar */}
                <div className="bg-[#000080] px-2 py-1 flex items-center justify-between text-white font-bold text-xs">
                  <span className="flex items-center gap-1.5">🗄️ System Welcome & Help Guide</span>
                  <button
                    onClick={() => setShowManualDialog(false)}
                    className="w-4 h-4 bg-[#c0c0c0] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-[10px] font-bold flex items-center justify-center cursor-pointer text-black"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Dialogue box content */}
                <div className="p-4 flex gap-4 bg-[#dfdfdf] border-b border-[#808080]">
                  <div className="text-4xl select-none shrink-0 animate-bounce">💾</div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-xs text-[#000080] tracking-wider">WELCOME TO TASK BUDDY 95!</h3>
                    <p className="text-[11px] text-gray-800 mt-2 leading-relaxed">
                      Congratulations on initiating your new workstation! Because this is your <strong className="text-blue-900">first-time login</strong>, we have prepared an interactive 32-bit Reference Manual for your system.
                    </p>
                    <p className="text-[11px] text-gray-800 mt-1 leading-relaxed">
                      Download this secure PDF documentation to learn about your advanced Task Add Panel, persistent memory nodes, and Gemini-powered virtual adviser.
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 p-3 bg-[#c0c0c0]">
                  <button
                    onClick={() => {
                      handleDownloadManual(username || "Workstation User");
                      setShowManualDialog(false);
                    }}
                    className="px-4 py-1.5 bg-[#000080] text-white text-xs font-bold border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-black border-b-black cursor-pointer shadow-sm active:border-inset hover:bg-blue-800 flex items-center gap-1.5"
                  >
                    <span>💾</span> Download User Manual (PDF)
                  </button>
                  <button
                    onClick={() => setShowManualDialog(false)}
                    className="px-4 py-1.5 bg-[#c0c0c0] text-xs font-bold border-outset cursor-pointer active:border-inset text-gray-800"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spacer to clear taskbar */}
          <div className="h-10"></div>

          {/* Bottom Taskbar */}
          <Taskbar username={username} onLogout={handleLogout} />

        </div>
      )}
    </div>
  );
}
