import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { db, doc, getDoc, getDocs, collection, addDoc, auth } from '../lib/firebase';
import { FreelancerCard } from '../components/FreelancerCard';
import { Bot, CheckCircle, Loader2, RefreshCcw, Send, MessageSquare, X, Phone, Mail, Globe, Handshake, User } from 'lucide-react';
import { generateOutreachMessage, simulateNegotiation } from '../lib/gemini';
import { AnimatePresence } from 'motion/react';

interface ResultsProps {
  isDarkMode: boolean;
}

export const Results = ({ isDarkMode }: ResultsProps) => {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [negotiationLoading, setNegotiationLoading] = useState<string | null>(null);
  const [negotiationData, setNegotiationData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      try {
        // 1. Get Project
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) return;
        const projectData = projectDoc.data();
        setProject(projectData);

        // 2. Get All Freelancers
        const freelancersSnap = await getDocs(collection(db, 'freelancers'));
        const allFreelancers = freelancersSnap.docs.map(d => {
          const data = d.data();
          // Normalize data to handle both formats (legacy and new)
          return {
            id: d.id,
            ...data,
            name: data.name || 'Anonymous',
            skills: data.skills || [],
            experience: data.experience || 'Not specified',
            rating: data.rating ?? 5.0, // Default to 5.0 for new profiles
            portfolioUrl: data.portfolioUrl || data.portfolio || '#',
            availability: data.availability || 'Available',
            priceRange: data.priceRange || data.rate || 'Flexible',
            contactEmail: data.contactEmail || data.email || '',
            userId: data.userId || null
          };
        });

        // 3. Deduplicate by name or userId to prevent same person appearing twice
        const uniqueFreelancersMap = new Map();
        allFreelancers.forEach((f: any) => {
          // Use userId as primary key if available, otherwise name
          const key = f.userId || f.name;
          if (!uniqueFreelancersMap.has(key)) {
            uniqueFreelancersMap.set(key, f);
          }
        });
        const freelancers = Array.from(uniqueFreelancersMap.values());

        // 4. Advanced Matching Engine
        const scoredMatches = freelancers.map((f: any) => {
          let skillMatchCount = 0;
          const projectSkills = projectData.skills || [];
          const freelancerSkills = f.skills || [];

          projectSkills.forEach((s: string) => {
            if (freelancerSkills.some((fs: string) => fs.toLowerCase().includes(s.toLowerCase()))) {
              skillMatchCount += 1;
            }
          });
          
          const skillScore = skillMatchCount / Math.max(projectSkills.length, 1);
          const ratingScore = (f.rating || 0) / 5;
          const availabilityScore = f.availability === 'Available' || f.availability.toLowerCase().includes('immediate') ? 1 : 0.5;

          // Boosted weights to favor skill matching and reach 80%+ for good matches
          // score = skill_match * 0.8 + rating * 0.1 + availability * 0.1
          let totalScore = (skillScore * 0.8) + (ratingScore * 0.1) + (availabilityScore * 0.1);
          
          // If it's the current user, give a small "Self-Match" visibility boost if they have at least one skill match
          if (auth.currentUser && f.userId === auth.currentUser.uid && skillMatchCount > 0) {
            totalScore = Math.min(1, totalScore + 0.05);
          }

          return { ...f, score: totalScore };
        });

        // Sort and take top 5
        const top5 = scoredMatches
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        setMatches(top5);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleNegotiate = async (freelancer: any) => {
    setNegotiationLoading(freelancer.id);
    try {
      const data = await simulateNegotiation(project, freelancer);
      setNegotiationData({ ...data, freelancer });
      setShowModal(true);
      
      // Save negotiation to history
      await addDoc(collection(db, 'negotiations'), {
        projectId,
        projectTitle: project.title,
        userId: auth.currentUser?.uid || null,
        freelancerId: freelancer.id,
        freelancerName: freelancer.name,
        freelancerUserId: freelancer.userId || null,
        data,
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Negotiation error:", error);
      alert("Failed to simulate negotiation. Please try again.");
    } finally {
      setNegotiationLoading(null);
    }
  };

  const handleEmailQuotes = async () => {
    setEmailLoading(true);
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 2000));
    setEmailSent(true);
    setEmailLoading(false);
    setTimeout(() => setEmailSent(false), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center relative z-10">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-zinc-500 font-mono uppercase tracking-widest text-xs">Matching Engine Running...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-primary text-[10px] font-bold font-mono tracking-widest uppercase">
              Analysis Complete
            </div>
            <span className="text-zinc-600 text-xs font-mono">{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
          <h1 className={`text-4xl font-bold mb-4 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{project.title}</h1>
          <p className={`max-w-2xl mb-6 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{project.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill: string) => (
              <span key={skill} className={`px-3 py-1 border rounded-full text-xs transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                {skill}
              </span>
            ))}
          </div>
        </div>
        
        <div className={`w-full md:w-64 p-6 border rounded-2xl transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-lg'}`}>
          <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">Project Stats</h4>
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs text-zinc-600 uppercase">Budget</p>
              <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>₹{project.budget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase">Timeline</p>
              <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{project.timeline}</p>
            </div>
          </div>
          
          <button
            onClick={handleEmailQuotes}
            disabled={emailLoading}
            className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              emailSent 
                ? 'bg-primary/20 border border-primary/50 text-primary' 
                : (isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-900')
            }`}
          >
            {emailLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : emailSent ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Quotes Emailed
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Email All Quotes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className={`h-[1px] flex-1 transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
        <div className="flex items-center gap-2 text-primary">
          <Bot className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Top 5 Selected from 100+ Experts</span>
        </div>
        <div className={`h-[1px] flex-1 transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((freelancer, i) => (
          <motion.div
            key={freelancer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            <FreelancerCard freelancer={freelancer} />
            <div className="mt-4">
              <button
                onClick={() => handleNegotiate(freelancer)}
                disabled={negotiationLoading === freelancer.id}
                className="w-full py-3 bg-primary hover:bg-primary-hover border border-primary-hover text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {negotiationLoading === freelancer.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Handshake className="w-4 h-4" />
                    Negotiate with Agent
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Negotiation Modal */}
      <AnimatePresence>
        {showModal && negotiationData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`border w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className={`p-6 border-b flex items-center justify-between transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className={`font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>AI Negotiation Agent</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Acting on your behalf</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto p-6 space-y-6 transition-colors ${isDarkMode ? 'bg-black/20' : 'bg-zinc-50/30'}`}>
                {negotiationData.conversation.map((msg: any, i: number) => (
                  <div key={i} className={`flex gap-4 ${msg.role === 'agent' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      msg.role === 'agent' 
                        ? 'bg-primary/10 border border-primary/20' 
                        : (isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200')
                    }`}>
                      {msg.role === 'agent' ? <Bot className="w-4 h-4 text-primary" /> : <User className={`w-4 h-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`} />}
                    </div>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm transition-colors ${
                      msg.role === 'agent' 
                        ? (isDarkMode ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-300' : 'bg-white border border-zinc-100 text-zinc-700 shadow-sm') 
                        : (isDarkMode ? 'bg-zinc-800 text-zinc-100' : 'bg-blue-600 text-white shadow-md')
                    }`}>
                      <p className={`font-bold text-[10px] uppercase tracking-widest mb-1 opacity-50 transition-colors ${isDarkMode ? 'text-zinc-400' : (msg.role === 'agent' ? 'text-zinc-500' : 'text-blue-100')}`}>
                        {msg.role === 'agent' ? 'AI Agent' : negotiationData.freelancer.name}
                      </p>
                      {msg.content}
                    </div>
                  </div>
                ))}

                <div className={`pt-6 border-t transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                  <div className={`border rounded-2xl p-6 transition-colors ${isDarkMode ? 'bg-primary/5 border-primary/20' : 'bg-primary-light border-primary/20'}`}>
                    <div className="flex items-center gap-2 text-primary mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <h4 className="font-bold uppercase tracking-widest text-xs">Agreement Reached!</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Final Price</p>
                        <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{negotiationData.finalDetails.agreedPrice}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Final Timeline</p>
                        <p className={`text-lg font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{negotiationData.finalDetails.agreedTimeline}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] text-zinc-500 uppercase mb-2">Freelancer Contact Details</p>
                      <div className={`flex items-center gap-3 text-sm transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <Mail className="w-4 h-4 text-primary" />
                        {negotiationData.finalDetails.contactDetails.email}
                      </div>
                      <div className={`flex items-center gap-3 text-sm transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <Phone className="w-4 h-4 text-primary" />
                        {negotiationData.finalDetails.contactDetails.phone}
                      </div>
                      <div className={`flex items-center gap-3 text-sm transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <Globe className="w-4 h-4 text-primary" />
                        <a href="#" className="hover:text-primary-hover underline decoration-primary/30">
                          {negotiationData.finalDetails.contactDetails.portfolio}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  Confirm and Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-20 text-center">
        <Link to="/dashboard" className={`inline-flex items-center gap-2 transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
          <RefreshCcw className="w-4 h-4" />
          View all projects in Dashboard
        </Link>
      </div>
    </div>
  );
};
