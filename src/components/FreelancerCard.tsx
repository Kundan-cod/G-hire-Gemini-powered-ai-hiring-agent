import React from 'react';
import { Star, Mail, ExternalLink, CheckCircle2, Clock } from 'lucide-react';

interface FreelancerProps {
  freelancer: {
    name: string;
    skills: string[];
    experience: string;
    rating: number;
    portfolioUrl: string;
    availability: string;
    priceRange: string;
    contactEmail: string;
    score?: number;
  };
}

export const FreelancerCard = ({ freelancer }: FreelancerProps) => {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:border-primary/50 transition-all group shadow-sm dark:shadow-none">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-primary-hover dark:group-hover:text-primary-hover transition-colors">{freelancer.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="ml-1 text-sm font-bold">{freelancer.rating}</span>
            </div>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-mono uppercase tracking-tighter">{freelancer.experience} exp</span>
          </div>
        </div>
        {freelancer.score !== undefined && (
          <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            <span className="text-primary-hover dark:text-primary text-xs font-bold font-mono tracking-widest">MATCH: {Math.round(freelancer.score * 100)}%</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {freelancer.skills.map((skill) => (
          <span key={skill} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded border border-zinc-200 dark:border-zinc-700 font-mono">
            {skill}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <CheckCircle2 className={`w-4 h-4 ${freelancer.availability === 'Available' ? 'text-primary' : 'text-zinc-400 dark:text-zinc-600'}`} />
          <span className="text-xs">{freelancer.availability}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
          <span className="text-xs">{freelancer.priceRange}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <a 
          href={`mailto:${freelancer.contactEmail}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg text-sm transition-colors"
        >
          <Mail className="w-4 h-4" />
          Contact
        </a>
        <a 
          href={freelancer.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
