import { useState } from 'react';
import { Sparkles, Compass, AlertCircle, ShieldAlert, Map, RefreshCw, Activity, Droplets, Zap } from 'lucide-react';
import { CommunityIssue } from '../types';
import { motion } from 'framer-motion';

interface PredictiveInsightsPanelProps {
  issues: CommunityIssue[];
  onViewOnMap: (lat: number, lng: number, address: string) => void;
}

export default function PredictiveInsightsPanel({ issues, onViewOnMap }: PredictiveInsightsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Mock static insights formatted per the new constraints
  const staticInsights = [
    {
      id: 1,
      title: 'Water Leakage Hotspot',
      confidence: 94,
      location: 'Okhla Phase 2 Junction',
      lat: 28.5355,
      lng: 77.2640,
      summary: 'High probability of severe flooding due to incoming rain and existing blocked drains.',
      icon: Droplets,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-50 dark:bg-blue-900/30',
      barColor: 'bg-blue-500'
    },
    {
      id: 2,
      title: 'Safety Blindspot',
      confidence: 88,
      location: 'Outer Ring Road Corridor',
      lat: 28.5562,
      lng: 77.1565,
      summary: 'Cluster of broken street lamps creates dark paths. High priority for pedestrian safety.',
      icon: Zap,
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-50 dark:bg-amber-900/30',
      barColor: 'bg-amber-500'
    },
    {
      id: 3,
      title: 'Crime Hotspot Indicator',
      confidence: 76,
      location: 'Nehru Park Area',
      lat: 28.5925,
      lng: 77.1895,
      summary: 'Multiple vandalism reports suggest increased night-time patrol is required.',
      icon: ShieldAlert,
      colorClass: 'text-rose-500',
      bgClass: 'bg-rose-50 dark:bg-rose-900/30',
      barColor: 'bg-rose-500'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6" id="predictive-insights-card">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-sans font-black text-slate-800 dark:text-white text-xl tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500 fill-purple-400" />
            AI Predictive Hotspots
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Detecting patterns before they escalate
          </p>
        </div>
        <button
          onClick={() => setIsLoading(true)}
          className="p-2.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
          title="Refresh Analysis"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staticInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 rounded-xl ${insight.bgClass} ${insight.colorClass}`}>
                <insight.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-end w-32">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">AI Confidence: {insight.confidence}%</span>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden flex">
                  <div className={`h-full ${insight.barColor}`} style={{ width: `${insight.confidence}%` }}></div>
                </div>
              </div>
            </div>
            
            <h3 className="font-black text-slate-800 dark:text-white text-base mb-1">{insight.title}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mb-3 line-clamp-2 leading-relaxed">
              {insight.summary}
            </p>
            
            <div className="mt-auto space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold truncate">
                <Map className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{insight.location}</span>
              </div>
              <button 
                onClick={() => onViewOnMap(insight.lat, insight.lng, insight.location)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-purple-200 dark:shadow-none"
              >
                <Map className="h-3.5 w-3.5" />
                View on Map
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
