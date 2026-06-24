import { useState } from 'react';
import { Award, Shield, Flame, Check, Sparkles, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { BADGES } from '../lib/firebase';

interface LeaderboardProps {
  userProfile: UserProfile;
}

interface LeaderboardUser {
  name: string;
  level: number;
  xp: number;
  reports: number;
  verifications: number;
  badgesCount: number;
}

export default function Leaderboard({ userProfile }: LeaderboardProps) {
  // Mock leaderboard users with current logged-in user spliced in dynamically
  const leaderboardUsers: LeaderboardUser[] = [
    { name: 'Officer Green', level: 8, xp: 950, reports: 14, verifications: 28, badgesCount: 5 },
    { name: 'Marcus Vance', level: 6, xp: 620, reports: 8, verifications: 15, badgesCount: 4 },
    { name: 'Sarah Jenkins', level: 5, xp: 480, reports: 6, verifications: 11, badgesCount: 3 },
    { name: userProfile.name, level: userProfile.level, xp: userProfile.xp, reports: userProfile.reportsCount, verifications: userProfile.verificationsCount, badgesCount: userProfile.badges.length },
    { name: 'Emily White', level: 3, xp: 290, reports: 4, verifications: 6, badgesCount: 2 },
    { name: 'David Kim', level: 2, xp: 180, reports: 2, verifications: 5, badgesCount: 1 }
  ].sort((a, b) => b.xp - a.xp);

  // Next level calculations
  const currentXpInLevel = userProfile.xp % 100;
  const xpNeededForNextLevel = 100 - currentXpInLevel;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in" id="leaderboard-card">
      {/* Header */}
      <div className="px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div>
          <h2 className="font-sans font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg uppercase tracking-tight">
            <Award className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
            Citizen Hero Hall of Fame
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">
            Earn experience points (XP) and claim prestigious community badges
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
        
        {/* Current User Profile Hub */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          {/* Ambient background accent */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 h-32 w-32 bg-white/10 rounded-full opacity-30 pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-200 block">
                Logged-In Citizen Profile
              </span>
              <h3 className="font-sans font-black text-xl flex items-center gap-1.5">
                {userProfile.name}
                <Flame className="h-4.5 w-4.5 text-amber-300 fill-amber-300 animate-pulse" />
              </h3>
            </div>
            
            <div className="bg-white/15 px-3.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
              <Shield className="h-4 w-4 text-amber-300 fill-amber-300" />
              <span className="text-xs font-black uppercase tracking-wider font-sans">Lv. {userProfile.level} Hero</span>
            </div>
          </div>

          {/* Level Progress */}
          <div className="space-y-1.5 font-sans relative z-10">
            <div className="flex justify-between text-xs text-blue-100 font-bold">
              <span>Level Progress ({currentXpInLevel} / 100 XP)</span>
              <span>{xpNeededForNextLevel} XP to Lv.{userProfile.level + 1}</span>
            </div>
            <div className="w-full bg-indigo-950/40 h-2.5 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentXpInLevel}%` }}
              />
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t-2 border-white/10 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/5">
              <span className="text-[10px] text-blue-200 uppercase tracking-widest block font-sans font-black">Reports</span>
              <span className="text-sm font-black font-sans">{userProfile.reportsCount} filed</span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl border border-white/5">
              <span className="text-[10px] text-blue-200 uppercase tracking-widest block font-sans font-black">Verifications</span>
              <span className="text-sm font-black font-sans">{userProfile.verificationsCount} double-checks</span>
            </div>
          </div>
        </div>

        {/* Badges Earned */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
            Earned Achievement Badges
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {BADGES.map((badge) => {
              const isEarned = userProfile.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all duration-300 ${
                    isEarned
                      ? `${badge.color} font-medium`
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isEarned ? 'bg-white/60 dark:bg-black/20 border border-white/35 dark:border-white/10 shadow-sm' : 'bg-slate-200 dark:bg-slate-800'}`}>
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black block leading-tight font-sans uppercase tracking-tight">{badge.name}</span>
                    <span className="text-[9px] block text-slate-500 leading-tight font-sans font-bold">{badge.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Leaderboard Ranking */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
            Top 3 Contributors
          </span>
          <div className="space-y-2.5 font-sans text-xs">
            {leaderboardUsers.slice(0, 3).map((user, index) => {
              const isCurrentUser = user.name === userProfile.name;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-md shadow-blue-50 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-400 dark:text-slate-500 w-5 text-center text-sm">
                      {medal}
                    </span>
                    <div className="space-y-0.5">
                      <span className={`font-black block text-sm ${isCurrentUser ? 'text-blue-900 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {user.name} {isCurrentUser && '(You)'}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-sans font-bold hidden sm:block">
                        {user.reports} reports • {user.verifications} verifications
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-800 dark:text-slate-200 block">{user.xp} XP</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase font-black">
                      Lv. {user.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
