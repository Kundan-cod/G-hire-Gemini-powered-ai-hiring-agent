import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, LayoutDashboard, MessageSquare, PlusCircle, LogOut, LogIn, X } from 'lucide-react';
import { auth, signInWithPopup, googleProvider, signOut } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}

export const Sidebar = ({ isOpen, onToggle, isDarkMode }: SidebarProps) => {
  const [user] = useAuthState(auth);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Briefcase },
    { path: '/submit', label: 'Hire Experts', icon: PlusCircle },
    { path: '/chat', label: 'AI Agent', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ x: isOpen ? 0 : -256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-50 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-zinc-200'}`}
    >
      {/* Logo Section */}
      <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}`}>
        <Link to="/" className="flex items-center gap-2 group">
          {location.pathname === '/chat' ? (
            <span className={`text-xl font-bold tracking-tighter ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              G-Hire <span className="text-primary">Agent</span>
            </span>
          ) : (
            <Logo className="text-xl font-bold tracking-tighter" />
          )}
        </Link>
        <button 
          onClick={onToggle}
          className={`p-1 rounded-md transition-colors ${isDarkMode ? 'hover:bg-zinc-900 text-zinc-500 hover:text-white' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 space-y-2">
        <Link
          to="/chat"
          className={`flex items-center gap-3 px-4 py-3 mb-4 rounded-xl text-sm font-bold transition-all group border relative overflow-hidden ${
            isDarkMode 
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-800' 
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-zinc-200'
          }`}
        >
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
          <PlusCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform relative z-10" />
          <span className="relative z-10">New Chat</span>
        </Link>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : isDarkMode 
                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-primary/80'}`} />
              {item.label}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}`}>
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=10b981&color=fff`} 
                alt={user.displayName || ''} 
                className={`w-10 h-10 rounded-full border ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
              />
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{user.displayName}</span>
                <span className="text-[10px] text-primary font-mono uppercase tracking-widest">Online</span>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isDarkMode 
                  ? 'text-zinc-400 hover:text-red-500 hover:bg-red-500/10' 
                  : 'text-zinc-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Sign In with Google
          </button>
        )}
      </div>
    </motion.aside>
  );
};
