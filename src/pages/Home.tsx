import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Bot, Cpu, Users, Zap, CheckCircle2, Phone, Mail, User as UserIcon, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { auth, signInWithPopup, googleProvider } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface HomeProps {
  isDarkMode: boolean;
}

type OnboardingFlow = 'hiring' | 'looking' | null;

export const Home = ({ isDarkMode }: HomeProps) => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState('');
  const fullText = "G-HIRE: AI Agent That Negotiates For You";

  // Onboarding State
  const [flow, setFlow] = useState<OnboardingFlow>(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    hiringMethod: '',
    category: '',
    serviceType: '',
    name: '',
    phone: '',
    email: '',
    otp: ''
  });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      
      if (flow === 'looking') {
        navigate('/dashboard');
      } else if (flow === 'hiring') {
        if (formData.hiringMethod === 'ai') {
          navigate('/chat');
        } else {
          navigate('/submit');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const nextStep = () => {
    if (flow === 'hiring' && step === 2) {
      const needsName = formData.category === 'Tech' || formData.category === 'Video & Motion Design';
      if (!needsName) {
        setStep(4);
        return;
      }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => {
    if (flow === 'hiring' && step === 4) {
      const needsName = formData.category === 'Tech' || formData.category === 'Video & Motion Design';
      if (!needsName) {
        setStep(2);
        return;
      }
    }
    setStep(s => Math.max(0, s - 1));
  };

  const handleSendOtp = () => {
    if (!formData.email || !formData.phone) return;
    setIsOtpSent(true);
    // Mock OTP send
    setTimeout(() => {
      alert("Mock OTP sent to " + formData.email);
      nextStep();
    }, 500);
  };

  const handleVerifyOtp = async () => {
    setIsVerifying(true);
    // Mock verification
    setTimeout(async () => {
      setIsVerifying(false);
      await handleLogin();
    }, 1000);
  };

  const renderOnboarding = () => {
    if (flow === 'hiring') {
      switch (step) {
        case 1:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>How would you like to hire?</h3>
              <div className="grid gap-4">
                {[
                  { id: 'ai', label: 'AI Agent', icon: Bot, desc: 'Talk to our AI to find matches' },
                  { id: 'experts', label: 'Hire Experts', icon: Users, desc: 'Submit project for expert bids' }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setFormData({ ...formData, hiringMethod: method.id });
                      nextStep();
                    }}
                    className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4 group ${
                      isDarkMode ? 'bg-zinc-900/50 border-zinc-800 hover:border-blue-500' : 'bg-white border-zinc-200 hover:border-blue-500 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isDarkMode ? 'bg-zinc-800 group-hover:bg-blue-500/20' : 'bg-zinc-100 group-hover:bg-blue-50'
                    }`}>
                      <method.icon className={`w-6 h-6 ${isDarkMode ? 'text-zinc-400 group-hover:text-blue-400' : 'text-zinc-500 group-hover:text-blue-600'}`} />
                    </div>
                    <div>
                      <span className={`block font-bold text-lg ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{method.label}</span>
                      <span className="text-sm text-zinc-500">{method.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setFlow(null)} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
        case 2:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>What is your project related with?</h3>
              <div className="grid gap-4">
                {['Tech', 'Video & Motion Design', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setFormData({ ...formData, category: cat });
                      nextStep();
                    }}
                    className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      isDarkMode ? 'bg-zinc-900/50 border-zinc-800 hover:border-blue-500' : 'bg-white border-zinc-200 hover:border-blue-500 shadow-sm'
                    }`}
                  >
                    <span className={`font-medium ${isDarkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{cat}</span>
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
        case 3:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>What is your name?</h3>
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <UserIcon className="w-5 h-5 text-zinc-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                />
              </div>
              <button
                disabled={!formData.name}
                onClick={nextStep}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                Continue
              </button>
              <button onClick={prevStep} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
        case 4:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Contact Details</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <Phone className="w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                  />
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <Mail className="w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                  />
                </div>
              </div>
              <button
                disabled={!formData.phone || !formData.email}
                onClick={handleSendOtp}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                Send Verification OTP
              </button>
              <button onClick={prevStep} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
        case 5:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <div className="text-center mb-6">
                <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Verify Email</h3>
                <p className="text-zinc-500 text-sm mt-2">Enter the 4-digit code sent to {formData.email}</p>
              </div>
              <div className="flex justify-center gap-4">
                <input
                  autoFocus
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  className={`w-32 text-center text-3xl font-bold tracking-[0.5em] p-4 rounded-xl border bg-transparent outline-none focus:border-blue-500 ${
                    isDarkMode ? 'border-zinc-800 text-white' : 'border-zinc-200 text-zinc-900'
                  }`}
                />
              </div>
              <button
                disabled={formData.otp.length < 4 || isVerifying}
                onClick={handleVerifyOtp}
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button onClick={prevStep} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors mx-auto">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
      }
    }

    if (flow === 'looking') {
      switch (step) {
        case 1:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>What is your profile?</h3>
              <div className="grid gap-4">
                {['Software / AI Engineer', 'Video / Motion Designing', 'AI Native Agency', 'Other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setFormData({ ...formData, serviceType: type });
                      nextStep();
                    }}
                    className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      isDarkMode ? 'bg-zinc-900/50 border-zinc-800 hover:border-red-500' : 'bg-white border-zinc-200 hover:border-red-500 shadow-sm'
                    }`}
                  >
                    <span className={`font-medium ${isDarkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{type}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setFlow(null)} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
        case 2:
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 w-full max-w-md mx-auto">
              <h3 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Tell us about yourself</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <UserIcon className="w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                  />
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <Phone className="w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                  />
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <Mail className="w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`bg-transparent outline-none flex-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                  />
                </div>
              </div>
              <button
                disabled={!formData.name || !formData.phone || !formData.email}
                onClick={handleLogin}
                className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                Complete Registration
              </button>
              <button onClick={prevStep} className="text-zinc-500 flex items-center gap-2 text-sm hover:text-zinc-300 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </motion.div>
          );
      }
    }

    return null;
  };

  return (
    <div className="relative overflow-hidden min-h-screen transition-colors duration-500">
      {/* Background Decor */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-to-b via-transparent to-transparent pointer-events-none ${isDarkMode ? 'from-blue-500/5' : 'from-blue-500/10'}`} />
      
      {/* Animated Background Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-500/5 blur-[100px] rounded-full pointer-events-none" 
      />

      {/* Scanning Line Animation */}
      <motion.div
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent z-10 pointer-events-none"
      />
      
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-32 relative z-20">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`inline-flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md border mb-12 shadow-[0_0_20px_rgba(66,133,244,0.1)] transition-colors ${isDarkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white/80 border-zinc-200'}`}
          >
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse delay-75" />
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-150" />
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-300" />
            </div>
            <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-1">
              <Logo className="text-[10px] font-bold" /> Agent • v2.5
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-bold tracking-tighter mb-10 leading-[1.1] font-sans min-h-[1.2em]"
          >
            <span className={`text-transparent bg-clip-text bg-gradient-to-r transition-colors ${isDarkMode ? 'from-white via-zinc-200 to-zinc-500' : 'from-zinc-900 via-zinc-700 to-zinc-500'}`}>
              {displayText}
            </span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="inline-block w-[4px] h-[0.8em] bg-blue-500 ml-2 align-middle"
            />
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="relative"
          >
            <p className={`text-xl md:text-3xl mb-16 max-w-4xl mx-auto leading-tight font-serif italic relative z-10 transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>
              The AI agent that finds, vets, and negotiates with{' '}
              <span className="relative inline-block px-1">
                <span className="relative z-10">India’s top 5% AI-powered freelancers & agencies.</span>
                <motion.span 
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                  className="absolute bottom-1 left-0 h-[60%] bg-[#FFD7BE] -rotate-1 origin-left z-0 opacity-80"
                />
              </span>
              {' '}Describe your project—G-Hire pitches it to 100+ experts, negotiates and get 5 best quotes to you over email.
            </p>
            <div className="absolute -inset-4 bg-blue-500/5 blur-2xl rounded-full -z-10 opacity-50" />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col items-center justify-center gap-6"
          >
            <AnimatePresence mode="wait">
              {user ? (
                <motion.div
                  key="logged-in"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full flex justify-center"
                >
                  <Link 
                    to="/dashboard" 
                    className={`w-full sm:w-auto px-12 py-6 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:-translate-y-1 group active:scale-95 ${
                      isDarkMode 
                        ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.1)]' 
                        : 'bg-zinc-900 text-white shadow-[0_0_40px_rgba(0,0,0,0.1)]'
                    }`}
                  >
                    <span className="text-xl">Go to Dashboard</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </motion.div>
              ) : flow === null ? (
                <motion.div
                  key="buttons"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full"
                >
                  <button 
                    onClick={() => { setFlow('hiring'); setStep(1); }}
                    className={`w-full sm:w-auto px-10 py-5 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:-translate-y-1 group active:scale-95 ${
                      isDarkMode 
                        ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]' 
                        : 'bg-zinc-900 text-white shadow-[0_0_40px_rgba(0,0,0,0.1)] hover:shadow-[0_0_60px_rgba(0,0,0,0.2)]'
                    }`}
                  >
                    <span className="text-lg">Hire a freelancer/Agency</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </button>
                  <button 
                    onClick={() => { setFlow('looking'); setStep(1); }}
                    className={`w-full sm:w-auto px-10 py-5 backdrop-blur-sm border font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 group ${
                      isDarkMode 
                        ? 'bg-zinc-900/50 border-zinc-800 hover:border-red-500/50 text-white' 
                        : 'bg-white/50 border-zinc-200 hover:border-red-500/50 text-zinc-900'
                    }`}
                  >
                    <span className="text-lg">Looking for Clients</span>
                    <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                <div key="onboarding" className="w-full">
                  {renderOnboarding()}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-48">
          {[
            {
              icon: Cpu,
              title: "AI Analysis",
              desc: "Gemini extracts precise technical requirements from your natural language descriptions.",
              color: "text-blue-500",
              bg: "bg-blue-500/10"
            },
            {
              icon: Users,
              title: "Smart Matching",
              desc: "Advanced scoring engine ranks freelancers based on skill match, rating, and availability.",
              color: "text-red-500",
              bg: "bg-red-500/10"
            },
            {
              icon: Zap,
              title: "Auto Outreach",
              desc: "Simulated outreach system contacts candidates with personalized project details.",
              color: "text-yellow-500",
              bg: "bg-yellow-500/10"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              whileHover={{ 
                y: -10,
                backgroundColor: isDarkMode ? "rgba(24, 24, 27, 0.8)" : "rgba(255, 255, 255, 0.8)",
                borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              }}
              className={`p-10 backdrop-blur-sm border rounded-[2rem] transition-all duration-300 group relative overflow-hidden ${
                isDarkMode ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white/40 border-zinc-200'
              }`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-4 font-sans uppercase tracking-tight transition-colors ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-zinc-900 group-hover:text-blue-600'}`}>{feature.title}</h3>
              <p className={`text-base leading-relaxed font-serif italic transition-colors ${isDarkMode ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'}`}>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
