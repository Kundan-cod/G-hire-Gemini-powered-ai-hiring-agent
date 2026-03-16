import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, collection, query, where, orderBy, onSnapshot, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { seedFreelancers } from '../lib/seed';
import { Briefcase, Clock, ExternalLink, MessageSquare, Search, User, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  isDarkMode: boolean;
}

export const Dashboard = ({ isDarkMode }: DashboardProps) => {
  const [user] = useAuthState(auth);
  const [projects, setProjects] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Seed if needed
    seedFreelancers();

    const qProjects = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const qResponses = query(
      collection(db, 'responses'),
      orderBy('createdAt', 'desc')
    );

    const qMyProfile = query(
      collection(db, 'freelancers'),
      where('userId', '==', user.uid)
    );

    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Projects listener error:", err);
      setLoading(false);
    });

    const unsubResponses = onSnapshot(qResponses, (snap) => {
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Responses listener error:", err);
    });

    const unsubProfile = onSnapshot(qMyProfile, (snap) => {
      if (!snap.empty) {
        setMyProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    }, (err) => {
      console.error("Profile listener error:", err);
    });

    // Fetch negotiations where user is client
    const qNegClient = query(
      collection(db, 'negotiations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Fetch negotiations where user is freelancer
    const qNegFreelancer = query(
      collection(db, 'negotiations'),
      where('freelancerUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubNegClient = onSnapshot(qNegClient, (snap) => {
      const clientNegs = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'client' }));
      setNegotiations(prev => {
        const otherNegs = prev.filter(n => n.role !== 'client');
        return [...otherNegs, ...clientNegs].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }, (err) => {
      console.error("Negotiations (client) listener error:", err);
    });

    const unsubNegFreelancer = onSnapshot(qNegFreelancer, (snap) => {
      const freelancerNegs = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'freelancer' }));
      setNegotiations(prev => {
        const otherNegs = prev.filter(n => n.role !== 'freelancer');
        return [...otherNegs, ...freelancerNegs].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }, (err) => {
      console.error("Negotiations (freelancer) listener error:", err);
    });

    return () => {
      unsubProjects();
      unsubResponses();
      unsubProfile();
      unsubNegClient();
      unsubNegFreelancer();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
          <User className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className={`text-2xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Sign in to view Dashboard</h2>
        <p className="text-zinc-500 max-w-sm">You need to be authenticated to manage your projects and view AI matches.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className={`text-4xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Dashboard</h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">G-HIRE Control Center</p>
        </div>
        <Link 
          to="/submit"
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl transition-all shadow-lg active:scale-95"
        >
          New Project
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Professional Profile Section */}
          {myProfile && (
            <div className="space-y-6">
              <h3 className={`text-lg font-bold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                <User className="w-5 h-5 text-primary" />
                My Professional Profile
              </h3>
              <div className={`p-8 border rounded-2xl backdrop-blur-md transition-all ${
                isDarkMode 
                  ? 'bg-zinc-900/50 border-zinc-800' 
                  : 'bg-white/70 border-zinc-200 shadow-xl'
              }`}>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-4xl font-black text-white">{myProfile.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{myProfile.name}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-primary font-medium">{myProfile.title || myProfile.role}</p>
                          {myProfile.experience && (
                            <>
                              <span className="text-zinc-400">•</span>
                              <p className="text-zinc-500 text-sm font-mono uppercase tracking-tighter">{myProfile.experience} exp</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-sm font-bold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                        ₹{myProfile.rate}
                      </div>
                    </div>
                    
                    <p className="text-zinc-500 text-sm leading-relaxed mb-6 italic">"{myProfile.bio}"</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {myProfile.skills.map((skill: string, idx: number) => (
                        <span key={idx} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-6">
            <h3 className={`text-lg font-bold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              <Briefcase className="w-5 h-5 text-primary" />
              My Projects
            </h3>
            
            {projects.length === 0 && negotiations.length === 0 && !loading ? (
              <div className={`p-12 border border-dashed rounded-2xl text-center transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-300 bg-white/50'}`}>
                <Search className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No projects or negotiations found. Start by submitting one or creating a profile!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Client Projects */}
                {projects.map((project) => (
                  <Link 
                    key={project.id}
                    to={`/results/${project.id}`}
                    className={`block p-6 border rounded-xl transition-all group backdrop-blur-sm ${
                      isDarkMode 
                        ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' 
                        : 'bg-white/70 border-zinc-200 hover:border-blue-500/30 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider rounded">Client</span>
                          <h4 className={`text-xl font-bold transition-colors ${isDarkMode ? 'group-hover:text-primary-hover' : 'text-zinc-900 group-hover:text-primary-hover'}`}>{project.title}</h4>
                        </div>
                        <p className="text-zinc-500 text-sm mt-1 line-clamp-1">{project.description}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                        {project.status}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        {project.skills.length} Skills
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {format(new Date(project.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Negotiation History (Matched Projects for Freelancers) */}
                {negotiations.map((neg) => (
                  <div 
                    key={neg.id}
                    className={`block p-6 border rounded-xl transition-all group backdrop-blur-sm ${
                      isDarkMode 
                        ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' 
                        : 'bg-white/70 border-zinc-200 hover:border-primary/30 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                            neg.role === 'freelancer' ? 'bg-green-500/10 text-green-500' : 'bg-purple-500/10 text-purple-500'
                          }`}>
                            {neg.role === 'freelancer' ? 'Matched' : 'Negotiation'}
                          </span>
                          <h4 className={`text-xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{neg.projectTitle || 'Untitled Project'}</h4>
                        </div>
                        <p className="text-zinc-500 text-sm mt-1">
                          {neg.role === 'freelancer' ? `Matched with client for ${neg.projectTitle}` : `Negotiated with ${neg.freelancerName}`}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-colors ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                        {neg.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 rounded-lg bg-black/5 dark:bg-white/5">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Final Price</p>
                        <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{neg.data.finalDetails.agreedPrice}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Timeline</p>
                        <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{neg.data.finalDetails.agreedTimeline}</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Contact</p>
                        <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{neg.data.finalDetails.contactDetails.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono mt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {format(new Date(neg.createdAt), 'MMM d, yyyy')}
                      </div>
                      {neg.role === 'freelancer' && (
                        <div className="flex items-center gap-2 text-primary">
                          <Zap className="w-3 h-3" />
                          AI Match
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Responses */}
        <div className="space-y-6">
          <h3 className={`text-lg font-bold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            <MessageSquare className="w-5 h-5 text-primary" />
            Outreach Activity
          </h3>
          
          <div className={`backdrop-blur-sm border rounded-2xl p-6 transition-colors ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white/70 border-zinc-200 shadow-sm'}`}>
            {responses.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8 italic">No outreach activity yet.</p>
            ) : (
              <div className="space-y-6">
                {responses.slice(0, 5).map((resp) => (
                  <div key={resp.id} className={`relative pl-6 border-l transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-primary" />
                    <p className="text-xs text-zinc-500 mb-1">{format(new Date(resp.createdAt), 'HH:mm • MMM d')}</p>
                    <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Contacted {resp.freelancerName}</p>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2 italic">"{resp.message}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
