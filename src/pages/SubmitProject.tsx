import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Upload, Send, Loader2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { auth, db, addDoc, collection } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { extractRequirements } from '../lib/gemini';

interface SubmitProjectProps {
  isDarkMode: boolean;
}

export const SubmitProject = ({ isDarkMode }: SubmitProjectProps) => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    timeline: '',
    skills: '',
    referenceLinks: ''
  });
  const [image, setImage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to submit a project");
      return;
    }

    setLoading(true);
    try {
      // 1. Call AI to analyze and extract requirements directly from frontend
      const aiRequirements = await extractRequirements(formData.description, image || undefined);

      // 2. Save to Firestore
      const projectData = {
        title: formData.title,
        description: formData.description,
        budget: Number(formData.budget) || aiRequirements.budget || 0,
        timeline: formData.timeline || aiRequirements.timeline || "TBD",
        skills: aiRequirements.skills || formData.skills.split(',').map(s => s.trim()),
        projectType: aiRequirements.projectType || "General",
        referenceLinks: formData.referenceLinks.split(',').map(l => l.trim()),
        imageUrl: image,
        status: 'analyzed',
        createdAt: new Date().toISOString(),
        userId: user.uid
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      navigate(`/results/${docRef.id}`);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`backdrop-blur-md border rounded-2xl p-8 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/70 border-zinc-200 shadow-xl'}`}
      >
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Submit Project</h2>
          <p className="text-zinc-500 text-sm">Describe what you need, and our AI agent will find the perfect match.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Project Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 focus:border-primary outline-none transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
              placeholder="e.g. E-commerce Mobile App"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Description (Natural Language)</label>
            <textarea
              required
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full border rounded-lg px-4 py-3 focus:border-primary outline-none transition-colors resize-none ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
              placeholder="I need a React developer to build a SaaS dashboard. Budget 50k. Timeline 2 weeks."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Budget (₹)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className={`w-full border rounded-lg px-4 py-3 focus:border-primary outline-none transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Timeline</label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className={`w-full border rounded-lg px-4 py-3 focus:border-primary outline-none transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Design Reference (Image)</label>
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center group-hover:border-primary/50 transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200 bg-zinc-50/50'}`}>
                {image ? (
                  <div className="relative w-full h-40">
                    <img src={image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                    <button 
                      type="button"
                      onClick={() => setImage(null)}
                      className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${isDarkMode ? 'bg-black/50 hover:bg-black text-white' : 'bg-white/80 hover:bg-white text-zinc-900 shadow-sm'}`}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-500">Click or drag to upload design reference</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Reference Links</label>
            <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 transition-colors ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <LinkIcon className="w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={formData.referenceLinks}
                onChange={(e) => setFormData({ ...formData, referenceLinks: e.target.value })}
                className={`flex-1 bg-transparent outline-none ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                placeholder="Comma separated URLs"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI Agent Analyzing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Analyze & Find Matches
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
