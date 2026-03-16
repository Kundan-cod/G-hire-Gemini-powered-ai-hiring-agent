import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Logo } from './components/Logo';
import { Menu, X, Sun, Moon, Monitor, Settings, ArrowRight } from 'lucide-react';
import { Home } from './pages/Home';
import { SubmitProject } from './pages/SubmitProject';
import { Results } from './pages/Results';
import { Dashboard } from './pages/Dashboard';
import { AIChat } from './pages/AIChat';
import { SplashScreen } from './components/SplashScreen';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('ghire-theme');
    return (saved as 'light' | 'dark' | 'system') || 'light';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('ghire-accent') || '#10b981';
  }); // Default Emerald
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const accentColors = [
    { name: 'Emerald', value: '#10b981', hover: '#059669' },
    { name: 'Blue', value: '#4285F4', hover: '#1a73e8' },
    { name: 'Red', value: '#EA4335', hover: '#d93025' },
    { name: 'Yellow', value: '#FBBC05', hover: '#f9ab00' },
    { name: 'Green', value: '#34A853', hover: '#1e8e3e' },
  ];

  // Handle theme changes
  useEffect(() => {
    localStorage.setItem('ghire-theme', theme);
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // Apply theme and accent color to document
  useEffect(() => {
    localStorage.setItem('ghire-accent', accentColor);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply accent color CSS variables
    const root = document.documentElement;
    const selectedColor = accentColors.find(c => c.value === accentColor) || accentColors[0];
    root.style.setProperty('--primary-color', selectedColor.value);
    root.style.setProperty('--primary-color-hover', selectedColor.hover);
    root.style.setProperty('--primary-color-light', `${selectedColor.value}1a`); // 10% opacity
  }, [isDarkMode, accentColor]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} isDarkMode={isDarkMode} />;
  }

  if (!hasApiKey) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full ${isDarkMode ? 'bg-primary/10' : 'bg-primary/5'} blur-[120px]`} />
        </div>
        
        <div className="max-w-md w-full mx-4 p-8 rounded-3xl border backdrop-blur-xl relative z-10 text-center flex flex-col items-center gap-6 shadow-2xl transition-colors duration-500 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Settings className="w-10 h-10 text-white animate-spin-slow" />
          </div>
          
          <div className="space-y-2">
            <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>API Configuration Required</h2>
            <p className={`text-sm transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              To enable high-performance AI features, please select your Gemini API key.
            </p>
          </div>

          <div className="space-y-4 w-full">
            <button
              onClick={handleSelectKey}
              className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
            >
              Select API Key
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
              Requires a paid Google Cloud project
            </p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline block"
            >
              Learn more about billing
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-600/5'} blur-[120px] animate-pulse`} />
        </div>
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className={`w-16 h-16 border-4 rounded-full ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-t-blue-500 border-r-red-500 border-b-yellow-500 border-l-green-500 rounded-full animate-spin"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-bold tracking-tight text-primary">G-Hire Agent</div>
            <p className={`font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Initializing Agent...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'} flex relative overflow-hidden`}>
        {/* Google Hackathon Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${isDarkMode ? 'bg-blue-600/5' : 'bg-blue-600/10'} blur-[120px]`} />
          <div className={`absolute top-[20%] right-[-5%] w-[35%] h-[35%] rounded-full ${isDarkMode ? 'bg-red-600/5' : 'bg-red-600/10'} blur-[120px]`} />
          <div className={`absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full ${isDarkMode ? 'bg-yellow-600/5' : 'bg-yellow-600/10'} blur-[120px]`} />
          <div className={`absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full ${isDarkMode ? 'bg-green-600/5' : 'bg-green-600/10'} blur-[120px]`} />
          <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ${isDarkMode ? 'opacity-[0.02]' : 'opacity-[0.05]'} mix-blend-overlay`} />
          
          {/* Grid Pattern */}
          <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] ${isDarkMode ? 'opacity-100' : 'opacity-50'}`} />
        </div>

        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} isDarkMode={isDarkMode} />
        
        <div className={`flex-1 transition-all duration-300 flex flex-col min-h-screen relative z-10 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          {/* Mobile/Toggle Header */}
          <header className={`sticky top-0 z-40 backdrop-blur-md border-b p-4 flex items-center justify-between gap-4 ${isDarkMode ? 'bg-black/50 border-zinc-900' : 'bg-white/50 border-zinc-200'}`}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              {!isSidebarOpen && (
                <div className="flex items-center gap-1">
                  <Logo className="text-sm font-bold tracking-tighter" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Color Selection */}
              <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                {accentColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setAccentColor(color.value)}
                    className={`w-5 h-5 rounded-full transition-all duration-300 hover:scale-125 ${accentColor === color.value ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>

              <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-lg transition-all ${theme === 'light' ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-zinc-700'}`}
                  title="Light Mode"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-lg transition-all ${theme === 'dark' ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-zinc-700'}`}
                  title="Dark Mode"
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-2 rounded-lg transition-all ${theme === 'system' ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-500 hover:text-zinc-700'}`}
                  title="System Default"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home isDarkMode={isDarkMode} />} />
              <Route path="/submit" element={<SubmitProject isDarkMode={isDarkMode} />} />
              <Route path="/results/:projectId" element={<Results isDarkMode={isDarkMode} />} />
              <Route path="/dashboard" element={<Dashboard isDarkMode={isDarkMode} />} />
              <Route path="/chat" element={<AIChat isDarkMode={isDarkMode} />} />
            </Routes>
          </main>
          
          {window.location.pathname !== '/chat' && (
            <footer className={`border-t py-12 transition-colors ${isDarkMode ? 'border-zinc-900 bg-black/50' : 'border-zinc-200 bg-white/50'}`}>
              <div className="max-w-7xl mx-auto px-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <Logo className="text-sm font-bold tracking-tighter" />
                </div>
                <p className={`text-xs font-mono uppercase tracking-widest transition-colors ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Powered by G-HIRE AI • Built with Google Cloud
                </p>
              </div>
            </footer>
          )}
        </div>
      </div>
    </Router>
  );
}
