import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { Bot, Send, User, Loader2, Sparkles, Image as ImageIcon, Mic, MicOff, X, ArrowRight, Zap, Briefcase, Clock, Plus, History, Search, Settings, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { extractRequirements } from '../lib/gemini';
import { db, collection, addDoc, auth, query, where, orderBy, getDocs, doc, updateDoc, onSnapshot, serverTimestamp } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface Thought {
  id: string;
  text: string;
  status: 'thinking' | 'completed' | 'decision';
  details?: string;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
  image?: string;
  timestamp?: any;
  thoughts?: Thought[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastMessageAt: any;
  createdAt: any;
  userId: string;
  userRole: 'client' | 'freelancer' | null;
  step: number;
  projectData: any;
}

interface AIChatProps {
  isDarkMode: boolean;
}

export const AIChat = ({ isDarkMode }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewChat, setIsNewChat] = useState(true);
  const [input, setInput] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('G-Hire');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [step, setStep] = useState(0);
  const [userRole, setUserRole] = useState<'client' | 'freelancer' | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [projectData, setProjectData] = useState({
    role: '',
    title: '',
    description: '',
    budget: '',
    timeline: '',
  });

  // Session Management State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentThoughts, setCurrentThoughts] = useState<Thought[]>([]);
  const [showThoughts, setShowThoughts] = useState(true);
  const [isThoughtSidebarOpen, setIsThoughtSidebarOpen] = useState(false);

  const suggestions = {
    initial: ["I want to hire", "I am a freelancer"],
    client: [
      ["React Developer", "UI/UX Designer", "Content Writer", "Mobile App Dev"],
      ["E-commerce App", "Portfolio Website", "SaaS Dashboard", "Mobile Game"],
      ["Build a modern landing page", "Create a brand identity", "Develop a mobile app"],
      ["₹10,000", "₹50,000", "₹1,00,000", "Flexible"],
      ["2 Weeks", "1 Month", "3 Months", "Urgent"],
      ["No", "Skip for now", "I have screenshots"],
      ["Yes, proceed", "No, let me change something"]
    ],
    freelancer: [
      ["Frontend Developer", "Fullstack Engineer", "Graphic Designer", "SEO Specialist"],
      ["Available for projects", "Looking for long-term work", "Part-time only"],
      ["React, Node.js, Tailwind", "Figma, Adobe XD", "Python, Django, AWS"],
      ["₹500/hr", "₹1,000/hr", "₹2,500/hr", "Project-based"],
      ["Immediate", "In 1 week", "Next month"],
      ["No", "Skip for now", "I have a portfolio link"],
      ["Yes, save profile", "No, let me edit"]
    ]
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const ThoughtProcess = ({ thoughts, isDarkMode }: { thoughts: Thought[], isDarkMode: boolean }) => {
    return (
      <div className="space-y-3 mb-4">
        {thoughts.map((thought, idx) => (
          <motion.div
            key={thought.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
            }`}
          >
            <div className="mt-1">
              {thought.status === 'thinking' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{thought.text}</p>
              {thought.details && (
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{thought.details}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const simulateThinking = async (steps: { text: string; details?: string }[]) => {
    setCurrentThoughts([]);
    for (const step of steps) {
      const id = Math.random().toString(36).substr(2, 9);
      setCurrentThoughts(prev => [...prev, { 
        id, 
        text: step.text, 
        status: 'thinking', 
        details: step.details || null 
      }]);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
      setCurrentThoughts(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    }
  };

  // Speech Recognition Setup
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load Sessions
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setSessions(loadedSessions);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const createNewChat = async () => {
    setIsNewChat(true);
    setMessages([]);
    setStep(0);
    setUserRole(null);
    setActiveSessionId(null);
    setShowHistory(false);
    setProjectData({
      role: '',
      title: '',
      description: '',
      budget: '',
      timeline: '',
    });
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setIsNewChat(false);
    setShowHistory(false);
    setUserRole(session.userRole || null);
    setStep(session.step ?? 6);
    if (session.projectData) {
      setProjectData(session.projectData);
    }
  };

  const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Str); // Fallback to original if error
    });
  };

  const saveMessageToSession = async (newMessages: Message[]) => {
    if (!auth.currentUser) return;

    // Truncate messages to avoid Firestore 1MB limit
    // 1. Keep only the last 30 messages (reduced from 50)
    // 2. For messages older than the last 1, remove images (reduced from 2)
    // 3. For messages older than the last 3, remove thoughts (reduced from 5)
    const truncatedMessages = await Promise.all(newMessages.slice(-30).map(async (msg, index, arr) => {
      const isRecentForImage = index >= arr.length - 1;
      const isRecentForThoughts = index >= arr.length - 3;
      
      const processedMsg = { ...msg };
      if (processedMsg.image) {
        if (!isRecentForImage) {
          delete processedMsg.image;
          processedMsg.content += "\n\n*(Image removed from history to save space)*";
        } else if (processedMsg.image.length > 50000) { // If image is > 50KB, compress it
          processedMsg.image = await compressImage(processedMsg.image);
        }
      }
      if (!isRecentForThoughts && processedMsg.thoughts) {
        delete processedMsg.thoughts;
      }
      return processedMsg;
    }));

    const sessionData = {
      userId: auth.currentUser.uid,
      messages: truncatedMessages,
      lastMessageAt: serverTimestamp(),
      userRole,
      step,
      projectData,
    };

    const trySave = async (data: any) => {
      if (!activeSessionId) {
        let title = "New Conversation";
        const firstUserMsg = newMessages.find(m => m.role === 'user')?.content;
        if (firstUserMsg) {
          title = firstUserMsg.slice(0, 40) + (firstUserMsg.length > 40 ? '...' : '');
        }

        const docRef = await addDoc(collection(db, 'chats'), {
          ...data,
          title,
          createdAt: serverTimestamp(),
        });
        setActiveSessionId(docRef.id);
      } else {
        const sessionRef = doc(db, 'chats', activeSessionId);
        await updateDoc(sessionRef, data);
      }
    };

    try {
      await trySave(sessionData);
    } catch (err) {
      console.error("Error saving chat session:", err);
      // If it still fails due to size, try ultra-aggressive truncation
      if (err instanceof Error && err.message.includes('exceeds the maximum allowed size')) {
        const ultraTruncatedMessages = newMessages.slice(-5).map(msg => {
          const { image, thoughts, ...rest } = msg;
          return rest;
        });
        
        try {
          await trySave({
            ...sessionData,
            messages: ultraTruncatedMessages,
          });
        } catch (innerErr) {
          console.error("Ultra truncation also failed:", innerErr);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleSend = async (e: React.FormEvent | null, overrideInput?: string) => {
    if (e) e.preventDefault();
    const messageToSend = overrideInput || input;
    if ((!messageToSend.trim() && !image) || loading) return;

    const userMsg = messageToSend.trim();
    const currentImage = image;
    
    setInput('');
    setImage(null);
    setIsNewChat(false);
    
    const newUserMsg: Message = { role: 'user', content: userMsg, timestamp: new Date().toISOString() };
    if (currentImage) newUserMsg.image = currentImage;
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setCurrentThoughts([]);

    try {
      let nextStep = step;
      let agentMsg = "";
      let thoughts: Thought[] = [];

      // Role Selection Step
      if (userRole === null) {
        await simulateThinking([
          { text: "Analyzing user intent...", details: "Checking if user wants to hire or offer services." },
          { text: "Identifying persona...", details: "Matching keywords: 'hire', 'freelancer', 'client'." }
        ]);

        const isClient = userMsg.toLowerCase().includes('hire') || userMsg.toLowerCase().includes('client') || userMsg.toLowerCase().includes('customer');
        const isFreelancer = userMsg.toLowerCase().includes('freelancer') || userMsg.toLowerCase().includes('agency') || userMsg.toLowerCase().includes('offer');

        if (isClient) {
          setUserRole('client');
          agentMsg = "Great! I'll help you find the perfect talent. To start, what **role** are you looking to hire? (e.g., React Developer, UI Designer)";
          nextStep = 0; // Reset step for client flow
        } else if (isFreelancer) {
          setUserRole('freelancer');
          agentMsg = "Welcome! I'll help you showcase your skills to top clients. To start, what is your **primary professional role**? (e.g., Frontend Developer, Graphic Designer)";
          nextStep = 0; // Reset step for freelancer flow
        } else {
          agentMsg = "I'm sorry, I didn't quite catch that. Are you looking to **hire** or are you a **freelancer**?";
          setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
          setLoading(false);
          return;
        }
        setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
        setStep(0); // Ensure we start at 0 for the chosen role
        setLoading(false);
        return;
      }

      if (userRole === 'client') {
        if (step === 0) {
          setProjectData(prev => ({ ...prev, role: userMsg }));
          agentMsg = "Great! Now, what is the **title** or name of your project?";
          nextStep = 1;
        } else if (step === 1) {
          setProjectData(prev => ({ ...prev, title: userMsg }));
          agentMsg = "Nice title. Can you give me a **detailed description** of what you're trying to build?";
          nextStep = 2;
        } else if (step === 2) {
          setProjectData(prev => ({ ...prev, description: userMsg }));
          agentMsg = "Got it. What is your estimated **budget** for this project (in ₹)?";
          nextStep = 3;
        } else if (step === 3) {
          // Validation: Check if budget contains numbers
          const budgetNum = userMsg.replace(/[^0-9]/g, '');
          if (!budgetNum && !userMsg.toLowerCase().includes('flexible')) {
            agentMsg = "Please provide a numeric budget or say 'Flexible'. What is your **estimated budget** (in ₹)?";
            setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
            setLoading(false);
            return;
          }
          setProjectData(prev => ({ ...prev, budget: userMsg }));
          agentMsg = "And what is your desired **timeline** or deadline?";
          nextStep = 4;
        } else if (step === 4) {
          setProjectData(prev => ({ ...prev, timeline: userMsg }));
          agentMsg = "Perfect. Finally, do you have any **design screenshots or references**? You can upload an image now, or just say 'no' to skip.";
          nextStep = 5;
        } else if (step === 5) {
          await simulateThinking([
            { text: "Processing project requirements...", details: "Extracting role, title, and description." },
            { text: "Analyzing market rates...", details: "Comparing budget with industry standards for " + projectData.role },
            { text: "Validating timeline feasibility...", details: "Checking if " + projectData.timeline + " is realistic for this scope." },
            { text: "Generating optimized brief...", details: "Using Gemini to structure the final requirements." }
          ]);

          // Final Analysis Step
          const analysisDescription = `
            [ROLE: Client]
            Hiring For: ${projectData.role}
            Title: ${projectData.title}
            Description: ${projectData.description}
            User Budget: ${projectData.budget}
            User Timeline: ${projectData.timeline}
            Additional Info: ${userMsg}
          `;

          const data = await extractRequirements(
            analysisDescription,
            currentImage || undefined
          );
          
          if (data.skills) {
            setExtractedData(data);
            agentMsg = `### Project Analysis Complete! 🚀\n\nI've analyzed all the details you provided. Here is your comprehensive project summary:\n\n**🎯 Hiring For:** ${projectData.role}\n**📁 Project Type:** ${data.projectType}\n\n**🛠️ Recommended Skills:**\n${data.skills.map((s: string) => `- ${s}`).join('\n')}\n\n**💰 Estimated Budget:** ₹${data.budget}\n**⏳ Expected Timeline:** ${data.timeline}\n\n--- \n\n**Next Steps:**\n1. **Pitch:** I'll pitch your project to **100+ vetted experts** from India's top 5% talent pool.\n2. **Negotiate:** I'll handle all outreach and **negotiate the best terms** on your behalf.\n3. **Deliver:** I'll present the **5 best quotes** and send them directly to your email.\n\n**Should we proceed to pitch your project to 100+ experts?**`;
          } else {
            agentMsg = "I've collected all the info, but I'm having trouble generating the final report. Could you try summarizing the project one more time?";
          }
          nextStep = 6;
        } else if (step === 6) {
          if (userMsg.toLowerCase().includes('yes')) {
            if (!auth.currentUser) {
              agentMsg = "You need to be logged in to save your project. Please sign in using the button in the navigation bar and then try again!";
              setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
              setLoading(false);
              return;
            }

            setLoading(true);
            try {
              const docRef = await addDoc(collection(db, 'projects'), {
                ...projectData,
                userId: auth.currentUser.uid,
                skills: extractedData?.skills || [],
                projectType: extractedData?.projectType || 'General',
                budget: extractedData?.budget || projectData.budget,
                timeline: extractedData?.timeline || projectData.timeline,
                createdAt: new Date().toISOString(),
                status: 'active'
              });
              
              agentMsg = "Excellent! I'm saving your project and searching for the best matches right now. You'll be redirected to the results page in a moment...";
              setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
              
              setTimeout(() => {
                navigate(`/results/${docRef.id}`);
              }, 2000);
              return;
            } catch (err) {
              console.error("Error saving project:", err);
              agentMsg = "I had some trouble saving your project. Let's try again. Should we proceed?";
            }
          } else {
            agentMsg = "No problem! We can refine the details. What would you like to change? (Role, Title, Description, Budget, or Timeline)";
            nextStep = 0;
          }
        } else {
          agentMsg = "I've saved your project requirements. You can now browse freelancers who match your needs in the **Freelancers** tab!";
        }
      } else if (userRole === 'freelancer') {
        if (step === 0) {
          setProjectData(prev => ({ ...prev, role: userMsg }));
          agentMsg = "Awesome. What is your **professional title** or headline? (e.g., Senior React Architect)";
          nextStep = 1;
        } else if (step === 1) {
          setProjectData(prev => ({ ...prev, title: userMsg }));
          agentMsg = "Tell me about your **experience and skills**. What makes you stand out?";
          nextStep = 2;
        } else if (step === 2) {
          setProjectData(prev => ({ ...prev, description: userMsg }));
          agentMsg = "What is your **expected hourly rate** or project fee (in ₹)?";
          nextStep = 3;
        } else if (step === 3) {
          // Validation: Check if budget contains numbers
          const rateNum = userMsg.replace(/[^0-9]/g, '');
          if (!rateNum && !userMsg.toLowerCase().includes('flexible')) {
            agentMsg = "Please provide a numeric rate or say 'Flexible'. What is your **expected hourly rate** (in ₹)?";
            setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
            setLoading(false);
            return;
          }
          setProjectData(prev => ({ ...prev, budget: userMsg }));
          agentMsg = "What is your **availability**? (e.g., Immediate, 20hrs/week)";
          nextStep = 4;
        } else if (step === 4) {
          setProjectData(prev => ({ ...prev, timeline: userMsg }));
          agentMsg = "Great. Do you have a **portfolio link** or any work samples? You can also upload a screenshot of your best work.";
          nextStep = 5;
        } else if (step === 5) {
          // Validation: Basic URL check if not skipping
          const isSkipping = userMsg.toLowerCase().includes('no') || userMsg.toLowerCase().includes('skip');
          const hasUrl = userMsg.match(/https?:\/\/[^\s]+/);
          
          if (!isSkipping && !hasUrl && !currentImage) {
            agentMsg = "Please provide a valid **portfolio URL** (starting with http:// or https://) or upload an image. Or say 'Skip' to proceed.";
            setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
            setLoading(false);
            return;
          }

          await simulateThinking([
            { text: "Analyzing skills and experience...", details: "Mapping user description to standardized skill sets." },
            { text: "Evaluating market positioning...", details: "Determining competitive rate for " + projectData.role },
            { text: "Optimizing profile headline...", details: "Crafting a high-impact title based on provided info." },
            { text: "Finalizing professional summary...", details: "Structuring the freelancer profile for maximum visibility." }
          ]);

          const analysisDescription = `
            [ROLE: Freelancer]
            Role: ${projectData.role}
            Title: ${projectData.title}
            Skills/Bio: ${projectData.description}
            Rate: ${projectData.budget}
            Availability: ${projectData.timeline}
            Additional Info: ${userMsg}
          `;

          const data = await extractRequirements(
            analysisDescription,
            currentImage || undefined
          );
          
          if (data.skills) {
            setExtractedData(data);
            agentMsg = `### Profile Analysis Complete! ✨\n\nI've optimized your professional profile. Here's how clients will see you:\n\n**👤 Role:** ${projectData.role}\n**🏷️ Headline:** ${projectData.title}\n\n**🛠️ Verified Skills:**\n${data.skills.map((s: string) => `- ${s}`).join('\n')}\n\n**💰 Rate:** ₹${data.budget}\n**⏳ Availability:** ${data.timeline}\n\n--- \n\n**Next Steps:**\n1. **Index:** I'll add you to our **exclusive talent database**.\n2. **Match:** I'll automatically **recommend you** for high-budget projects that match your skills.\n3. **Notify:** You'll receive **direct invitations** from clients to interview.\n\n**Should we save your profile and start matching you with projects?**`;
          } else {
            agentMsg = "I've collected your info, but I'm having trouble optimizing your profile. Could you try summarizing your skills one more time?";
          }
          nextStep = 6;
        } else if (step === 6) {
          if (userMsg.toLowerCase().includes('yes')) {
            if (!auth.currentUser) {
              agentMsg = "You need to be logged in to save your profile. Please sign in and try again!";
              setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
              setLoading(false);
              return;
            }

            setLoading(true);
            try {
              await addDoc(collection(db, 'freelancers'), {
                name: auth.currentUser.displayName || 'Anonymous',
                email: auth.currentUser.email,
                role: projectData.role,
                title: projectData.title,
                bio: projectData.description,
                rate: projectData.budget,
                experience: extractedData?.experience || 'Not specified',
                availability: projectData.timeline,
                skills: extractedData?.skills || [],
                userId: auth.currentUser.uid,
                createdAt: new Date().toISOString(),
                status: 'active'
              });
              
              agentMsg = "Fantastic! Your profile is now live in our talent pool. I'll start matching you with relevant projects immediately. You can view available jobs in the **Dashboard**!";
              setMessages(prev => [...prev, { role: 'agent', content: agentMsg }]);
              setLoading(false);
              return;
            } catch (err) {
              console.error("Error saving freelancer profile:", err);
              try {
                handleFirestoreError(err, OperationType.CREATE, 'freelancers');
              } catch (handledErr: any) {
                // The error is already logged by handleFirestoreError
                agentMsg = "I had some trouble saving your profile due to a permission issue. Our team has been notified. Let's try again in a moment. Should we proceed?";
              }
            }
          } else {
            agentMsg = "No problem! Let's refine your profile. What would you like to change?";
            nextStep = 0;
          }
        } else {
          agentMsg = "Your profile is active! I'm constantly searching for projects that match your expertise.";
        }
      }

      setStep(nextStep);
      const finalMessages: Message[] = [...updatedMessages, { 
        role: 'agent', 
        content: agentMsg, 
        timestamp: new Date().toISOString(),
        thoughts: [...currentThoughts]
      }];
      setMessages(finalMessages);
      saveMessageToSession(finalMessages);
      setCurrentThoughts([]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = { role: 'agent', content: "I encountered an error. Please check your connection and try again.", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      await updateDoc(doc(db, 'chats', sessionId), {
        userId: 'deleted_' + auth.currentUser?.uid // Soft delete or just delete
      });
      // Or actual delete: await deleteDoc(doc(db, 'chats', sessionId));
      if (activeSessionId === sessionId) {
        createNewChat();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className={`flex h-[calc(100vh-80px)] transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-[#F8F5F0] text-zinc-900'}`}>
      {/* Chat Management Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className={`border-r overflow-hidden flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
      >
        <div className="p-4 flex flex-col h-full w-[320px]">
          <button
            onClick={createNewChat}
            className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors mb-6 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Recent Chats */}
            <div>
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Recent
                </h3>
              </div>
              <div className="space-y-1">
                {recentSessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        loadSession(session);
                      }
                    }}
                    className={`group flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left cursor-pointer outline-none ${
                      activeSessionId === session.id
                        ? (isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary')
                        : (isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600')
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {recentSessions.length === 0 && (
                  <p className="text-xs text-zinc-500 px-2 italic">No recent chats</p>
                )}
              </div>
            </div>

            {/* History Link */}
            <div>
              <button
                onClick={() => setShowHistory(true)}
                className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left ${
                  showHistory
                    ? (isDarkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary')
                    : (isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600')
                }`}
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">Full History</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 mt-auto">
            <div className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                {auth.currentUser?.displayName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{auth.currentUser?.displayName || 'User'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{auth.currentUser?.email}</p>
              </div>
              <Settings className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute left-4 top-4 z-30 p-2 rounded-lg border transition-all ${
            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'
          } hover:scale-110 shadow-lg`}
        >
          {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {showHistory ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col p-8 max-w-4xl mx-auto w-full"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-display font-medium mb-2">Chat History</h2>
                    <p className="text-zinc-500">Manage and search your past conversations with G-Hire.</p>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="relative mb-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 transition-all outline-none ${
                      isDarkMode 
                        ? 'bg-zinc-900/50 border-zinc-800 focus:border-primary' 
                        : 'bg-white border-zinc-100 focus:border-primary shadow-sm'
                    }`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {filteredSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadSession(session);
                        }
                      }}
                      className={`flex items-center gap-4 w-full p-6 rounded-2xl border-2 transition-all text-left group cursor-pointer outline-none ${
                        isDarkMode 
                          ? 'bg-zinc-900/30 border-zinc-800 hover:border-primary/50' 
                          : 'bg-white border-zinc-50 hover:border-primary/50 shadow-sm'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'
                      }`}>
                        <MessageSquare className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold mb-1 truncate">{session.title}</h4>
                        <p className="text-xs text-zinc-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(session.lastMessageAt?.seconds * 1000).toLocaleDateString()} • {session.messages.length} messages
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="p-2 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                  {filteredSessions.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-zinc-300" />
                      </div>
                      <p className="text-zinc-500">No conversations found matching your search.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : isNewChat ? (
              <motion.div 
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20 px-4"
              >
              <div className="relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <p className={`font-serif italic text-2xl mb-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Hey {auth.currentUser?.displayName?.split(' ')[0] || 'there'}
                  </p>
                  <h1 className={`font-display text-6xl font-medium tracking-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    How can I help you today?
                  </h1>
                </motion.div>
                
                <motion.div 
                  className="absolute -right-24 top-0 hidden lg:block group"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                      alt="AI Avatar" 
                      className="w-32 h-32 rounded-full border-4 border-white shadow-2xl transition-transform group-hover:scale-110"
                    />
                    <button
                      onClick={() => {
                        const seeds = ['Aria', 'Felix', 'Luna', 'Leo', 'G-Hire', 'Zoe'];
                        const currentIndex = seeds.indexOf(avatarSeed);
                        setAvatarSeed(seeds[(currentIndex + 1) % seeds.length]);
                      }}
                      className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-lg border border-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-50"
                      title="Change Agent Avatar"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="max-w-4xl mx-auto"
              >
                <p className={`font-serif text-4xl leading-[1.1] tracking-tight ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>
                  G-Hire is an AI agent which finds freelancers and{' '}
                  <span className="relative inline-block px-1">
                    <span className="relative z-10">negotiates on behalf of you to give you the best pricing.</span>
                    <motion.span 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                      className="absolute bottom-2 left-0 h-[60%] bg-[#FFD7BE] -rotate-1 origin-left z-0 opacity-80"
                    />
                  </span>
                </p>
              </motion.div>

              <div className="w-full max-w-3xl relative">
                <div className={`p-2 rounded-[2.5rem] border-2 transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-zinc-900/50 border-zinc-800 focus-within:border-primary' 
                    : 'bg-white border-zinc-200 focus-within:border-primary shadow-2xl shadow-zinc-200/50'
                }`}>
                  <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-4 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>
                    
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Try 'I need a video editor for a 2-week project'"
                      className={`flex-1 bg-transparent border-none outline-none text-xl px-4 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                    />
                    
                    <button
                      type="submit"
                      disabled={!input.trim() && !image}
                      className={`p-4 rounded-full transition-all ${
                        input.trim() || image 
                          ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                          : 'bg-zinc-200 text-zinc-400'
                      }`}
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  {[
                    { label: 'I am a freelancer', icon: User, action: 'I am a freelancer' },
                    { label: 'I am a client looking for freelancer', icon: Briefcase, action: 'I want to hire' },
                    { label: 'Check on my active projects', icon: Clock, action: 'Check on my active projects' }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(null, btn.action)}
                      className={`px-6 py-3 rounded-full border flex items-center gap-3 text-sm font-medium transition-all hover:scale-105 ${
                        isDarkMode 
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700' 
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 shadow-sm'
                      }`}
                    >
                      <btn.icon className="w-4 h-4" />
                      {btn.label}
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col min-h-0 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-primary/40">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tighter flex items-center">
                      <span className="text-primary">G-Hire</span>
                      <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Agent</span>
                    </h1>
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em]">Autonomous Hiring Intelligence</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsThoughtSidebarOpen(!isThoughtSidebarOpen)}
                    className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-medium ${
                      isThoughtSidebarOpen 
                        ? 'bg-primary/10 border-primary/30 text-primary' 
                        : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm')
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isThoughtSidebarOpen ? 'Hide Thoughts' : 'Show Thoughts'}
                  </button>
                  <button 
                    onClick={createNewChat}
                    className={`px-4 py-2 rounded-full border text-xs font-medium transition-all ${
                      isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm'
                    }`}
                  >
                    New Chat
                  </button>
                </div>
              </div>

              <div className="flex-1 flex gap-6 min-h-0">
                {/* Project Parameters Sidebar */}
                <div className={`hidden lg:flex flex-col w-72 border rounded-2xl p-6 transition-colors ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-zinc-200 shadow-xl'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Project Parameters
                  </h3>
                  
                  <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {[
                      { label: 'Target Role', value: projectData.role, icon: User },
                      { label: 'Project Title', value: projectData.title, icon: Briefcase },
                      { label: 'Budget Range', value: projectData.budget, icon: Zap },
                      { label: 'Timeline', value: projectData.timeline, icon: Clock },
                    ].map((param, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          <param.icon className="w-3 h-3" />
                          {param.label}
                        </div>
                        <div className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          param.value 
                            ? (isDarkMode ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-primary/5 border-primary/10 text-primary')
                            : (isDarkMode ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600 italic' : 'bg-zinc-50 border-zinc-100 text-zinc-400 italic')
                        }`}>
                          {param.value || 'Waiting for input...'}
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        <Sparkles className="w-3 h-3" />
                        Description
                      </div>
                      <div className={`p-3 rounded-xl border text-xs leading-relaxed transition-all min-h-[100px] ${
                        projectData.description 
                          ? (isDarkMode ? 'bg-primary/5 border-primary/20 text-zinc-300' : 'bg-primary/5 border-primary/10 text-zinc-700')
                          : (isDarkMode ? 'bg-zinc-800/50 border-zinc-800 text-zinc-600 italic' : 'bg-zinc-50 border-zinc-100 text-zinc-400 italic')
                      }`}>
                        {projectData.description || 'Provide a brief description to help the AI match you with the right talent.'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                      <span>Extraction Progress</span>
                      <span>{Math.round((Object.values(projectData).filter(Boolean).length / 5) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(Object.values(projectData).filter(Boolean).length / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-800/50">
                    <h3 className={`text-[10px] font-mono uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <Clock className="w-3 h-3" />
                      Recent Sessions
                    </h3>
                    <div className="space-y-2">
                      {[
                        "Frontend Architect Search",
                        "Mobile App Design Review",
                        "Backend Scaling Project"
                      ].map((session, i) => (
                        <div key={i} className={`p-2 rounded-lg text-[10px] transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-50 text-zinc-600'}`}>
                          {session}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 backdrop-blur-md border rounded-2xl overflow-hidden flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white/50 border-zinc-200 shadow-xl'}`}>
                  <div 
                    ref={scrollRef}
                    className={`flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin ${isDarkMode ? 'scrollbar-thumb-zinc-800' : 'scrollbar-thumb-zinc-300'}`}
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors overflow-hidden ${
                            msg.role === 'user' 
                              ? (isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200') 
                              : 'bg-primary/10 border border-primary/20'
                          }`}>
                            {msg.role === 'user' 
                              ? <User className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`} /> 
                              : <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`} alt="AI" className="w-full h-full object-cover" />}
                          </div>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed transition-colors ${
                            msg.role === 'user' 
                              ? (isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-blue-600 text-white shadow-lg') 
                              : (isDarkMode ? 'bg-zinc-900/50 text-zinc-300 border border-zinc-800' : 'bg-white text-zinc-800 border border-zinc-100 shadow-sm')
                          }`}>
                            {msg.image && (
                              <img src={msg.image} alt="User upload" className={`w-full max-h-60 object-contain rounded-lg mb-4 border ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`} />
                            )}
                            
                            {msg.role === 'agent' && msg.thoughts && msg.thoughts.length > 0 && showThoughts && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                                  <Sparkles className="w-3 h-3" />
                                  Thought Process
                                </div>
                                <div className="space-y-2">
                                  {msg.thoughts.map((thought, tIdx) => (
                                    <div key={tIdx} className={`p-2 rounded-lg border text-[10px] ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800/50 text-zinc-400' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {thought.text}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className={`markdown-body ${!isDarkMode && msg.role === 'agent' ? 'prose-zinc' : ''}`}>
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {loading && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`} alt="AI" className="w-full h-full object-cover opacity-50" />
                        </div>
                        <div className="flex-1 max-w-[80%] space-y-4">
                          {currentThoughts.length > 0 && (
                            <ThoughtProcess thoughts={currentThoughts} isDarkMode={isDarkMode} />
                          )}
                          <div className={`p-4 rounded-2xl transition-colors inline-block ${isDarkMode ? 'bg-zinc-900/50 border border-zinc-800' : 'bg-white border border-zinc-100 shadow-sm'}`}>
                            <div className="flex gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`p-4 border-t transition-colors ${isDarkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-100 bg-zinc-50/50'}`}>
                    {image && (
                      <div className="mb-4 relative inline-block">
                        <img src={image} alt="Upload preview" className="w-20 h-20 object-cover rounded-lg border border-primary" />
                        <button 
                          onClick={() => setImage(null)}
                          className={`absolute -top-2 -right-2 p-1 rounded-full transition-colors ${isDarkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Suggested Responses */}
                    {!loading && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(userRole === null 
                          ? suggestions.initial 
                          : (userRole === 'client' ? suggestions.client[step] : suggestions.freelancer[step])
                        )?.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSend(null, suggestion)}
                            className={`px-3 py-1.5 border rounded-full text-xs transition-all ${
                              isDarkMode 
                                ? 'bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-primary' 
                                : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-primary-hover shadow-sm'
                            }`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 border rounded-xl transition-all ${
                          isDarkMode 
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' 
                            : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm'
                        }`}
                        title="Upload Image"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-3 border rounded-xl transition-all ${
                          isListening 
                            ? 'bg-primary/20 border-primary text-primary animate-pulse' 
                            : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm')
                        }`}
                        title="Voice Input"
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>

                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={isListening ? "Listening..." : "Describe your project or ask a question..."}
                          className={`w-full border rounded-xl pl-4 pr-12 py-4 focus:border-primary outline-none transition-all ${
                            isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 text-white' 
                              : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={(!input.trim() && !image) || loading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-lg transition-all"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Thought Path Sidebar */}
                <AnimatePresence>
                  {isThoughtSidebarOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 320, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className={`border-l flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <div className="p-6 h-full flex flex-col w-[320px]">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            <Sparkles className="w-4 h-4 text-primary" />
                            Thought Path
                          </h3>
                          <button 
                            onClick={() => setIsThoughtSidebarOpen(false)}
                            className={`p-1 rounded-lg hover:bg-zinc-800 transition-colors ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-thin">
                          {messages.filter(m => m.role === 'agent' && m.thoughts).map((msg, mIdx) => (
                            <div key={mIdx} className="relative pl-6 border-l border-zinc-800 space-y-4">
                              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                Step {mIdx + 1}
                              </div>
                              <div className="space-y-3">
                                {msg.thoughts?.map((thought, tIdx) => (
                                  <div key={tIdx} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-zinc-50 border-zinc-100'}`}>
                                    <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>
                                      {thought.text}
                                    </div>
                                    {thought.details && (
                                      <div className="text-[10px] text-zinc-500 leading-relaxed">
                                        {thought.details}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {loading && currentThoughts.length > 0 && (
                            <div className="relative pl-6 border-l border-primary/30 space-y-4">
                              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary animate-pulse" />
                              <div className="text-[10px] font-mono text-primary uppercase tracking-widest">
                                Processing...
                              </div>
                              <div className="space-y-3">
                                {currentThoughts.map((thought, tIdx) => (
                                  <div key={tIdx} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-primary/5 border-primary/20' : 'bg-primary-light border-primary/20'}`}>
                                    <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-primary-hover' : 'text-primary-hover'}`}>
                                      {thought.text}
                                    </div>
                                    {thought.details && (
                                      <div className="text-[10px] text-primary/60 leading-relaxed">
                                        {thought.details}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};

