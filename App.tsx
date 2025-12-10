import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Shuffle, Info, User, Copy, X, Maximize2, Minimize2 } from 'lucide-react';
import { AppState, DrawMode, InteractiveMode } from './types';
import { loadState, saveState, playDrawSound } from './utils';
import SpinWheel from './components/SpinWheel';
import DuckRace from './components/DuckRace';
import MarbleRace from './components/MarbleRace';
import CardDraw from './components/CardDraw';

const DEFAULT_STATE: AppState = {
  names: ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana'],
  tasks: [],
  history: [],
  isNameNoRepeat: false,
  availableNamesIndices: [0, 1, 2, 3, 4, 5],
  isTaskNoRepeat: false,
  availableTasksIndices: [],
  mode: 'single',
  interactiveMode: 'wheel',
  numGroups: 2,
};

function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false); // For all interactive modes
  const [currentWinner, setCurrentWinner] = useState<{name: string, index: number} | null>(null);
  const [tempMessage, setTempMessage] = useState<string | null>(null);
  const [resultCardText, setResultCardText] = useState<string>('Click \'DRAW LOTS\' to begin!');
  const [showResultCard, setShowResultCard] = useState(false); // Controls animation visibility
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Modals
  const [activeModal, setActiveModal] = useState<'instructions' | 'about' | null>(null);

  // Inputs
  const nameInputRef = useRef<HTMLTextAreaElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  // Load state on mount
  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      setState(prev => ({ ...prev, ...loaded }));
    }
    setIsLoaded(true);
  }, []);

  // Save state on change
  useEffect(() => {
    if (isLoaded) {
      saveState(state);
    }
  }, [state, isLoaded]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const showToast = (msg: string) => {
    setTempMessage(msg);
    setTimeout(() => setTempMessage(null), 3000);
  };

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // --- Logic Helpers ---

  const resetAvailableNames = (currentNames = state.names) => {
    updateState({ availableNamesIndices: currentNames.map((_, i) => i) });
  };

  const resetAvailableTasks = (currentTasks = state.tasks) => {
    updateState({ availableTasksIndices: currentTasks.map((_, i) => i) });
  };

  const addItems = (type: 'names' | 'tasks', value: string) => {
    if (!value.trim()) return;
    
    let newItems: string[] = [];
    if (type === 'names') { // Multiline support
        newItems = value.split(/[\n\t]+/).map(i => i.trim()).filter(i => i.length > 0);
    } else {
        newItems = [value.trim()];
    }

    const currentList = state[type];
    const uniqueNewItems = newItems.filter(i => !currentList.includes(i));

    if (uniqueNewItems.length > 0) {
      const updatedList = [...currentList, ...uniqueNewItems];
      if (type === 'names') {
          updateState({ names: updatedList, availableNamesIndices: updatedList.map((_, i) => i) });
          if (nameInputRef.current) nameInputRef.current.value = '';
      } else {
          updateState({ tasks: updatedList, availableTasksIndices: updatedList.map((_, i) => i) });
          if (taskInputRef.current) taskInputRef.current.value = '';
      }
      showToast(`${uniqueNewItems.length} item(s) added.`);
    } else {
      showToast('Items already exist in the list.');
    }
  };

  const removeItem = (type: 'names' | 'tasks', index: number) => {
    const list = [...state[type]];
    list.splice(index, 1);
    if (type === 'names') {
        updateState({ names: list, availableNamesIndices: list.map((_, i) => i) });
    } else {
        updateState({ tasks: list, availableTasksIndices: list.map((_, i) => i) });
    }
  };

  const clearList = (type: 'names' | 'tasks') => {
    if (type === 'names') {
        updateState({ names: [], availableNamesIndices: [], history: [] });
    } else {
        updateState({ tasks: [], availableTasksIndices: [] });
    }
  };

  const shuffleNames = () => {
      const shuffled = [...state.names];
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      updateState({ names: shuffled, availableNamesIndices: shuffled.map((_, i) => i), history: [] });
      showToast('Names shuffled & history cleared.');
  };

  // --- Draw Logic ---

  const selectNameIndex = (): number | null => {
      if (state.names.length === 0) return null;
      
      let pool = state.isNameNoRepeat ? state.availableNamesIndices : state.names.map((_, i) => i);
      
      // Cleanup pool just in case indices are out of bound
      pool = pool.filter(i => i < state.names.length);

      if (state.isNameNoRepeat && pool.length === 0) {
          showToast("All names drawn! Resetting list.");
          resetAvailableNames();
          return null;
      }

      const randIndex = Math.floor(Math.random() * pool.length);
      const selectedIndex = pool[randIndex];

      if (state.isNameNoRepeat) {
          const newPool = [...pool];
          newPool.splice(randIndex, 1);
          updateState({ availableNamesIndices: newPool });
      }

      return selectedIndex;
  };

  const selectTask = (): string => {
      if (state.tasks.length === 0) return "No Task";
      let pool = state.isTaskNoRepeat ? state.availableTasksIndices : state.tasks.map((_, i) => i);
      pool = pool.filter(i => i < state.tasks.length);

      if (state.isTaskNoRepeat && pool.length === 0) {
          showToast("All tasks assigned! Resetting task list.");
          resetAvailableTasks();
          // Re-fetch full pool after reset
          pool = state.tasks.map((_, i) => i); 
      }

      const randIndex = Math.floor(Math.random() * pool.length);
      const selectedIndex = pool[randIndex];
      
      if (state.isTaskNoRepeat) {
          const newPool = [...pool];
          newPool.splice(randIndex, 1);
          updateState({ availableTasksIndices: newPool });
      }
      
      return state.tasks[selectedIndex];
  };

  const handleDraw = () => {
    if (state.names.length === 0) return showToast("Add names first.");

    // Group Mode
    if (state.mode === 'groups') {
        if (state.numGroups <= 0) return showToast("Invalid group number.");
        if (state.names.length < state.numGroups) return showToast(`Need at least ${state.numGroups} names.`);

        const shuffled = [...state.names].sort(() => Math.random() - 0.5);
        const groups: string[][] = Array.from({ length: state.numGroups }, () => []);
        shuffled.forEach((name, i) => groups[i % state.numGroups].push(name));

        const resultText = groups.map((g, i) => `Group ${i + 1}: ${g.join(', ')}`).join(' | ');
        logHistory(resultText, groups);
        setResultCardText(`Groups Created! (${state.numGroups} groups)`);
        playDrawSound();
        triggerResultAnimation();
        return;
    }

    // Interactive Mode Prep
    if (state.mode === 'interactive') {
        if (state.names.length < 2) return showToast("Need at least 2 names.");
        if (isSpinning) return;

        const idx = selectNameIndex();
        if (idx === null) return; // Pool reset happened
        
        setCurrentWinner({ name: state.names[idx], index: idx });
        setIsSpinning(true);
        setResultCardText("...ANIMATING...");
        return; 
    }

    // Single / Paired
    const idx = selectNameIndex();
    if (idx === null) return; // Pool reset happened

    const name = state.names[idx];
    let result = name;

    if (state.mode === 'paired') {
        if (state.tasks.length === 0) return showToast("Add tasks for paired mode.");
        const task = selectTask();
        result = `${name} is assigned to: ${task}`;
    }

    logHistory(result);
    setResultCardText(result);
    playDrawSound();
    triggerResultAnimation();
  };

  const handleInteractiveEnd = () => {
    if (!currentWinner) return;
    setIsSpinning(false);
    setResultCardText(currentWinner.name);
    logHistory(currentWinner.name);
    triggerResultAnimation();
  };

  const triggerResultAnimation = () => {
      setShowResultCard(false);
      setTimeout(() => setShowResultCard(true), 50);
  };

  const logHistory = (result: string, groups?: string[][]) => {
      const entry = {
          id: Date.now(),
          result,
          mode: state.mode,
          timestamp: new Date().toLocaleTimeString(),
          groups
      };
      updateState({ history: [entry, ...state.history].slice(0, 50) });
  };

  const copyHistory = () => {
      const text = state.history.map((h, i) => 
        `${i+1}. [${h.timestamp}] (${h.mode}): ${h.result}`
      ).join('\n');
      navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard!"));
  };

  // --- Render Components ---

  const renderList = (type: 'names' | 'tasks') => {
      const list = state[type];
      const indices = type === 'names' ? state.availableNamesIndices : state.availableTasksIndices;
      const isNoRepeat = type === 'names' ? state.isNameNoRepeat : state.isTaskNoRepeat;

      if (list.length === 0) return <p className="text-gray-500 italic p-2 text-center">No {type} added yet.</p>;

      return list.map((item, i) => {
          const isUsed = isNoRepeat && !indices.includes(i);
          return (
            <div key={i} className={`flex justify-between items-center p-2 mb-2 bg-white rounded shadow-sm border ${isUsed ? 'opacity-50 line-through bg-gray-200' : 'border-indigo-100'}`}>
                <span className="truncate pr-2 text-sm">{item}</span>
                <button onClick={() => removeItem(type, i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                </button>
            </div>
          );
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 font-sans">
        {/* Toast */}
        {tempMessage && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg shadow-xl z-50 animate-fade-in-down">
                {tempMessage}
            </div>
        )}

        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-700 tracking-tight">EduDraw</h1>
                <div className="mt-4 flex justify-center space-x-4">
                     <button onClick={() => setActiveModal('instructions')} className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1">
                        <Info size={18} /> Instructions
                    </button>
                    <button onClick={() => setActiveModal('about')} className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1">
                        <User size={18} /> About Author
                    </button>
                </div>
            </header>

            <main className="grid lg:grid-cols-2 gap-8">
                
                {/* Left Panel: Inputs */}
                <section className="space-y-6">
                    {/* Mode Selector */}
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-indigo-200">
                        <h2 className="text-xl font-bold mb-3 text-indigo-700">Drawing Mode</h2>
                        <div className="grid grid-cols-4 gap-2 p-1 bg-indigo-50 rounded-lg">
                            {(['single', 'paired', 'groups', 'interactive'] as DrawMode[]).map(m => (
                                <button 
                                    key={m}
                                    onClick={() => updateState({ mode: m })}
                                    className={`py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg capitalize transition ${state.mode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-100'}`}
                                >
                                    {m === 'groups' ? 'Groups' : m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Names Input */}
                    <div className="bg-indigo-50 p-6 rounded-xl shadow-lg border-2 border-indigo-300">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-indigo-700">Names <span className="text-lg text-gray-500 font-medium">({state.names.length})</span></h2>
                        </div>
                        <textarea 
                            ref={nameInputRef}
                            rows={3} 
                            placeholder="Paste names here (one per line)..."
                            className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            onClick={() => nameInputRef.current && addItems('names', nameInputRef.current.value)}
                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition transform active:scale-95"
                        >
                            Add Names
                        </button>

                        <div className="mt-4 max-h-60 overflow-y-auto custom-scrollbar bg-indigo-100 p-2 rounded-lg border border-indigo-300 mb-4">
                            {renderList('names')}
                        </div>

                        <div className="flex items-center justify-between bg-indigo-100 p-3 rounded-lg border border-indigo-300">
                            <span className="text-sm font-medium text-indigo-900">No-Repeat: <strong>{state.isNameNoRepeat ? 'ON' : 'OFF'}</strong></span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={state.isNameNoRepeat} onChange={() => {
                                    const newVal = !state.isNameNoRepeat;
                                    updateState({ isNameNoRepeat: newVal });
                                    if (newVal) resetAvailableNames();
                                }} />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={shuffleNames} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg shadow text-sm flex justify-center items-center gap-2">
                                <Shuffle size={16} /> Shuffle
                            </button>
                            <button onClick={() => clearList('names')} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg shadow text-sm flex justify-center items-center gap-2">
                                <Trash2 size={16} /> Clear
                            </button>
                        </div>
                    </div>

                    {/* Task Input (Paired Only) */}
                    {state.mode === 'paired' && (
                        <div className="bg-pink-50 p-6 rounded-xl shadow-lg border-2 border-pink-300">
                             <h2 className="text-2xl font-bold text-pink-700 mb-4">Tasks <span className="text-lg text-gray-500 font-medium">({state.tasks.length})</span></h2>
                             <div className="flex gap-2 mb-4">
                                <input 
                                    ref={taskInputRef}
                                    type="text" 
                                    placeholder="Add task..." 
                                    className="flex-1 p-3 border-2 border-pink-300 rounded-lg outline-none focus:ring-2 focus:ring-pink-500"
                                    onKeyDown={(e) => e.key === 'Enter' && taskInputRef.current && addItems('tasks', taskInputRef.current.value)}
                                />
                                <button onClick={() => taskInputRef.current && addItems('tasks', taskInputRef.current.value)} className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 rounded-lg shadow">Add</button>
                             </div>
                             
                             <div className="max-h-40 overflow-y-auto custom-scrollbar bg-pink-100 p-2 rounded-lg border border-pink-300 mb-4">
                                {renderList('tasks')}
                             </div>

                             <div className="flex items-center justify-between bg-pink-100 p-3 rounded-lg border border-pink-300 mb-4">
                                <span className="text-sm font-medium text-pink-900">No-Repeat: <strong>{state.isTaskNoRepeat ? 'ON' : 'OFF'}</strong></span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={state.isTaskNoRepeat} onChange={() => {
                                        const newVal = !state.isTaskNoRepeat;
                                        updateState({ isTaskNoRepeat: newVal });
                                        if (newVal) resetAvailableTasks();
                                    }} />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                </label>
                            </div>
                            <button onClick={() => clearList('tasks')} className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg shadow text-sm">Clear Tasks</button>
                        </div>
                    )}

                    {/* Group Config */}
                    {state.mode === 'groups' && (
                        <div className="bg-teal-50 p-6 rounded-xl shadow-lg border-2 border-teal-300">
                             <h2 className="text-2xl font-bold text-teal-700 mb-4">Group Config</h2>
                             <label className="block text-teal-900 font-medium mb-2">Number of Groups</label>
                             <input 
                                type="number" 
                                min="1" 
                                value={state.numGroups} 
                                onChange={(e) => updateState({ numGroups: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-full p-3 border-2 border-teal-300 rounded-lg text-center text-xl"
                             />
                        </div>
                    )}
                </section>

                {/* Right Panel: Draw & Results */}
                <section className="space-y-6">
                    {/* Draw Card (Only shown if NOT in fullscreen interactive mode) */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-indigo-400">
                        <button 
                            onClick={handleDraw}
                            disabled={state.names.length === 0 || isSpinning}
                            className={`w-full text-white text-2xl font-extrabold py-5 rounded-xl shadow-lg transition transform active:scale-[0.98] ${state.names.length === 0 || isSpinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 hover:scale-[1.02]'}`}
                        >
                            {state.mode === 'groups' ? `CREATE ${state.numGroups} GROUPS` : state.mode === 'interactive' ? 'START INTERACTIVE DRAW' : 'DRAW LOTS'}
                        </button>
                        <button onClick={() => {
                            updateState({ history: [], availableNamesIndices: state.names.map((_, i) => i), availableTasksIndices: state.tasks.map((_, i) => i) });
                            showToast('All pools and history reset.');
                        }} className="mt-4 w-full bg-red-400 hover:bg-red-500 text-white font-semibold py-2 rounded-lg shadow-md text-sm">
                            Reset All Draws
                        </button>
                    </div>

                    {/* Interactive Viz */}
                    {state.mode === 'interactive' && (
                        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gray-100 p-4' : 'bg-white p-4 rounded-xl shadow-lg border-2 border-indigo-400 h-[40rem] relative'} flex flex-col transition-all duration-300`}>
                            {/* Viz Controls & Header */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex flex-wrap gap-2 bg-indigo-50 p-2 rounded-lg mx-auto sm:mx-0">
                                    {[
                                        { id: 'wheel', label: 'Wheel' },
                                        { id: 'race', label: 'Duck Race' },
                                        { id: 'marble', label: 'Marble Race' },
                                        { id: 'card', label: 'Lucky Card' }
                                    ].map((m) => (
                                        <button 
                                            key={m.id}
                                            disabled={isSpinning}
                                            onClick={() => !isSpinning && updateState({ interactiveMode: m.id as InteractiveMode })} 
                                            className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition border ${state.interactiveMode === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-100'} ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                
                                <button 
                                    onClick={() => setIsFullscreen(!isFullscreen)} 
                                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition"
                                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                                </button>
                            </div>
                            
                            {/* Canvas / Game Area */}
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                                {state.interactiveMode === 'wheel' && (
                                    <SpinWheel 
                                        names={state.names}
                                        winnerIndex={currentWinner?.index ?? null}
                                        winnerName={currentWinner?.name ?? null}
                                        isSpinning={isSpinning}
                                        onSpinEnd={handleInteractiveEnd}
                                    />
                                )}
                                {state.interactiveMode === 'race' && (
                                    <DuckRace 
                                        names={state.names}
                                        winnerName={currentWinner?.name ?? null}
                                        isRunning={isSpinning}
                                        onRaceEnd={handleInteractiveEnd}
                                    />
                                )}
                                {state.interactiveMode === 'marble' && (
                                    <MarbleRace 
                                        names={state.names}
                                        winnerName={currentWinner?.name ?? null}
                                        isRunning={isSpinning}
                                        onRaceEnd={handleInteractiveEnd}
                                    />
                                )}
                                {state.interactiveMode === 'card' && (
                                    <CardDraw 
                                        names={state.names}
                                        winnerName={currentWinner?.name ?? null}
                                        isRunning={isSpinning}
                                        onEnd={handleInteractiveEnd}
                                    />
                                )}
                            </div>

                             {/* Fullscreen Big Button or Result Overlay */}
                             {isFullscreen && (
                                <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none">
                                    {!isSpinning && (
                                        <div className="pointer-events-auto flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                            {showResultCard && resultCardText && (
                                                 <div className="bg-yellow-100 border-4 border-yellow-400 p-6 rounded-xl shadow-2xl mb-4 text-center max-w-2xl mx-4">
                                                    <p className="text-gray-600 font-bold uppercase tracking-wider text-sm mb-1">Winner</p>
                                                    <h2 className="text-4xl sm:text-5xl font-extrabold text-indigo-900">{resultCardText}</h2>
                                                 </div>
                                            )}
                                            
                                            <button 
                                                onClick={handleDraw} 
                                                className="bg-green-500 hover:bg-green-600 text-white font-black text-2xl py-4 px-12 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all animate-bounce"
                                            >
                                                {showResultCard ? 'SPIN AGAIN' : 'START SPIN'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result Card (Normal Mode) */}
                    {(state.mode !== 'interactive' || (!isSpinning && !isFullscreen)) && (
                         <div className={`bg-yellow-100 p-6 rounded-xl shadow-2xl border-4 border-yellow-400 text-center min-h-[12rem] flex flex-col justify-center transition-all duration-500 transform ${showResultCard ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                            <p className="text-xl font-semibold text-gray-600 mb-2">The Result Is...</p>
                            <div className="text-3xl sm:text-4xl font-extrabold text-yellow-800 break-words">
                                {resultCardText}
                            </div>
                        </div>
                    )}

                    {/* History */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-300">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-700">History</h2>
                            <button onClick={copyHistory} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 text-sm font-semibold">
                                <Copy size={16} /> Copy
                            </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-3">
                            {state.history.length === 0 ? (
                                <p className="text-gray-500 italic text-center">No draws yet.</p>
                            ) : (
                                state.history.map((entry, idx) => (
                                    <div key={entry.id} className={`p-4 rounded-xl shadow-sm border-l-4 ${idx === 0 ? 'bg-indigo-100 border-indigo-600' : 'bg-gray-50 border-indigo-300'}`}>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span className="capitalize">{entry.mode}</span>
                                            <span>{entry.timestamp}</span>
                                        </div>
                                        <div className="text-lg font-bold text-indigo-900 break-words whitespace-pre-wrap">
                                            {entry.result}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Modals */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-2xl font-bold text-indigo-700">
                                {activeModal === 'instructions' ? 'How to Use' : 'About'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="text-gray-700 space-y-4">
                            {activeModal === 'instructions' ? (
                                <>
                                    <p><strong>Single Draw:</strong> Randomly selects one item.</p>
                                    <p><strong>Paired:</strong> Selects a Name + Task together.</p>
                                    <p><strong>Groups:</strong> Splits list into equal groups.</p>
                                    <p><strong>Interactive:</strong> Visualizations like Spin Wheel, Duck Race, Marble Race, and Lucky Card.</p>
                                    <p className="text-sm italic mt-4">Data is saved automatically to your browser.</p>
                                </>
                            ) : (
                                <>
                                    <div className="text-center">
                                        <p className="text-xl font-bold">Melbhert A. Boiser</p>
                                        <p className="text-indigo-600">SST-I (Secondary School Teacher I)</p>
                                    </div>
                                    <div className="bg-gray-100 p-3 rounded text-sm">
                                        <p className="font-semibold">Camambugan National High School</p>
                                        <p>Ubay, Bohol, Philippines</p>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <button onClick={() => setActiveModal(null)} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}

export default App;