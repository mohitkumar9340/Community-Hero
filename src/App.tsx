import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Sparkles,
  Award,
  AlertTriangle,
  Flame,
  Plus,
  HelpCircle,
  UserCheck,
  Building,
  Navigation,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  Shield,
  Filter
} from 'lucide-react';
import { CommunityIssue, UserProfile } from './types';
import { fetchIssues, createIssue, BADGES, auth, logoutUser } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import InteractiveMap from './components/InteractiveMap';
import DashboardStats from './components/DashboardStats';
import IssueList from './components/IssueList';
import IssueDetail from './components/IssueDetail';
import ReportIssueForm from './components/ReportIssueForm';
import PredictiveInsightsPanel from './components/PredictiveInsightsPanel';
import Leaderboard from './components/Leaderboard';
import { LoginModal } from './components/LoginModal';
import { Toaster, toast } from 'react-hot-toast';

export default function App() {
  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<CommunityIssue | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTab, setCurrentTab] = useState<'map' | 'predictive' | 'gamification'>('map');
  const [isReporting, setIsReporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState<'mine' | 'all'>('mine');

  // Authentication state
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Gamification profile state with localStorage persistence
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const cached = localStorage.getItem('community_hero_profile');
    if (cached) return JSON.parse(cached);
    return {
      name: 'CivicHero',
      level: 1,
      xp: 25,
      badges: [],
      reportsCount: 0,
      verificationsCount: 0,
      isAdmin: false,
      department: ''
    };
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);

  // Derive admin status from both auth state and profile config
  const isAdmin = !!authUser && (authUser.email === 'admin@newdelhi.gov.in' || authUser.uid === 'admin-portal' || userProfile.isAdmin);

  // Visible issues based on administrative department filter
  const visibleIssues = isAdmin
    ? (adminFilter === 'mine'
        ? issues.filter(issue => !userProfile.department || issue.assignedDepartment === userProfile.department)
        : issues)
    : issues;

  useEffect(() => {
    if (isAdmin) {
      if (visibleIssues.length > 0) {
        if (!selectedIssue || !visibleIssues.some(i => i.id === selectedIssue.id)) {
          setSelectedIssue(visibleIssues[0]);
        }
      } else {
        setSelectedIssue(null);
      }
    }
  }, [adminFilter, issues, isAdmin, userProfile.department]);

  useEffect(() => {
    // Check if there is a cached mock user first
    const cachedMockUser = localStorage.getItem('current_mock_user');
    if (cachedMockUser) {
      try {
        const mockUser = JSON.parse(cachedMockUser);
        setAuthUser(mockUser);
        setUserProfile(prev => ({
          ...prev,
          name: mockUser.displayName || mockUser.name || mockUser.email?.split('@')[0] || 'CivicHero',
          isAdmin: !!mockUser.isAdmin || mockUser.email === 'admin@newdelhi.gov.in' || mockUser.uid === 'admin-portal',
          department: mockUser.department || prev.department
        }));
      } catch (e) {
        console.error("Error parsing cached mock user", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        
        // Preserve admin status and department from local storage if they match the logged in user
        let isUserAdmin = user.email === 'admin@newdelhi.gov.in';
        let userDepartment = '';
        
        try {
          const cached = localStorage.getItem('current_mock_user');
          if (cached) {
            const mock = JSON.parse(cached);
            if (mock.uid === user.uid || mock.email === user.email) {
              if (mock.isAdmin) isUserAdmin = true;
              if (mock.department) userDepartment = mock.department;
            }
          }
        } catch (e) {
          // ignore
        }

        setUserProfile(prev => ({ 
          ...prev, 
          name: user.displayName || user.email?.split('@')[0] || 'CivicHero',
          isAdmin: isUserAdmin,
          department: userDepartment || prev.department
        }));
      } else {
        // Only reset if there's no mock user currently set
        if (!localStorage.getItem('current_mock_user')) {
          setAuthUser(null);
          setUserProfile(prev => ({
            ...prev,
            name: 'CivicHero',
            isAdmin: false,
            department: ''
          }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync profile to localStorage
  useEffect(() => {
    localStorage.setItem('community_hero_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Load issues on mount
  const refreshIssuesList = async () => {
    setIsLoading(true);
    const data = await fetchIssues();
    setIssues(data);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshIssuesList();
  }, []);

  // Set default selected issue when list loads if none selected
  useEffect(() => {
    const targetIssues = isAdmin ? visibleIssues : issues;
    if (targetIssues.length > 0 && !selectedIssue && !isReporting) {
      setSelectedIssue(targetIssues[0]);
    }
  }, [issues, visibleIssues, selectedIssue, isReporting, isAdmin]);

  // Reward XP and calculate levels / badges
  const rewardXp = (amount: number, reason: string) => {
    setUserProfile((prev) => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 100) + 1;
      const reportsInc = reason === 'report' ? prev.reportsCount + 1 : prev.reportsCount;
      const verifyInc = reason === 'verification' || reason === 'validation-trigger' ? prev.verificationsCount + 1 : prev.verificationsCount;

      // Calculate badges unlocked dynamically
      const earnedBadges = [...prev.badges];
      
      // First Responder badge
      if (reportsInc >= 1 && !earnedBadges.includes('badge-1')) {
        earnedBadges.push('badge-1');
      }
      // Pothole Patrol (if reportsInc >= 3)
      if (reportsInc >= 3 && !earnedBadges.includes('badge-3')) {
        earnedBadges.push('badge-3');
      }
      // Streetlight Sentinel (if verifyInc >= 3)
      if (verifyInc >= 3 && !earnedBadges.includes('badge-2')) {
        earnedBadges.push('badge-2');
      }
      // Eco Warrior (Level 3+)
      if (newLevel >= 3 && !earnedBadges.includes('badge-4')) {
        earnedBadges.push('badge-4');
      }
      // Community Pillar (Level 5+)
      if (newLevel >= 5 && !earnedBadges.includes('badge-5')) {
        earnedBadges.push('badge-5');
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        reportsCount: reportsInc,
        verificationsCount: verifyInc,
        badges: earnedBadges
      };
    });
  };

  const handleSelectCoordsFromMap = (lat: number, lng: number, address: string) => {
    if (isAdmin) {
      toast('As an administrator, you are here to review and resolve reported issues, not report new ones.', { icon: '🛡️' });
      return;
    }
    if (!authUser) {
      setShowLoginModal(true);
      toast('Please sign in to pinpoint a hazard on the map', { icon: '👋' });
      return;
    }
    setUserCoords({ lat, lng, address });
    setIsReporting(true);
    setSelectedIssue(null);
    setTimeout(() => {
      const container = document.getElementById('issue-details-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const runDemoFlow = async () => {
    toast.success('Starting Hackathon Demo Flow...', { icon: '🚀' });
    
    // Ensure we have a user
    if (!authUser) {
        setAuthUser({ email: 'demo@newdelhi.gov.in', uid: 'demo123' } as any);
        setUserProfile(prev => ({...prev, name: 'Demo Citizen'}));
    }

    // Step 1: Simulate locating issue
    await new Promise(r => setTimeout(r, 2500));
    toast('Citizen locates hazard on map...', { icon: '📍' });
    setUserCoords({ lat: 28.6139, lng: 77.2090, address: "Block 10, Janpath Road, New Delhi" });
    setIsReporting(true);
    setSelectedIssue(null);
    setTimeout(() => {
      const container = document.getElementById('issue-details-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Step 2: Simulate AI Analysis
    await new Promise(r => setTimeout(r, 3000));
    toast('Uploading photo & triggering AI Analysis...', { icon: '📸' });
    
    await new Promise(r => setTimeout(r, 3000));
    toast.success('AI classified as: Roads & Traffic (High Priority)', { icon: '✨' });

    // Step 3: Create the Issue
    await new Promise(r => setTimeout(r, 3000));
    toast('Filing community report...', { icon: '📝' });
    
    const demoIssue = {
        title: 'Deep Pothole at Crosswalk',
        description: 'Large sinkhole/pothole forming right at the pedestrian crossing. Dangerous for bikes.',
        category: 'Roads & Traffic' as any,
        priority: 'High' as any,
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Block 10, Janpath Road, New Delhi',
        reportedBy: 'Demo Citizen',
        reportedAt: new Date().toISOString(),
        aiActionPlan: '• Review Route: Assigning local inspector to verify coordinates.\n• Public Hazard Level: Moderate. Avoid walking close to zone.',
        priorityRationale: 'Road surface anomaly identified. Priority set based on potential vehicle tire damage and traffic flow disruption risk.',
        assignedDepartment: 'PWD Delhi'
    };

    let newId;
    try {
      newId = await createIssue({
        ...demoIssue,
        votes: 1,
        votedBy: ['Demo Citizen'],
        verifiedBy: [],
        status: 'Reported',
        timeline: [
          {
            status: 'Reported',
            updatedAt: new Date().toISOString(),
            note: 'Issue created via citizen portal.',
            updatedBy: 'Demo Citizen'
          }
        ]
      });
      await refreshIssuesList();
    } catch(err) {
      console.error(err);
      return;
    }

    // Step 4: Admin mode
    await new Promise(r => setTimeout(r, 3500));
    toast('City Admin is notified...', { icon: '🚨' });
    const demoAdminUser = {
      email: 'admin@newdelhi.gov.in',
      uid: 'admin123',
      displayName: 'City Admin',
      photoURL: null
    };
    setAuthUser(demoAdminUser);
    setUserProfile(prev => ({ ...prev, name: 'City Admin', isAdmin: true, department: 'Civic Audit Department' }));
    
    // Find the issue to select it
    // Note: React state `issues` might be stale here, so we will use refresh
    const freshIssues = await fetchIssues();
    setIssues(freshIssues);
    const issueToSelect = freshIssues.find(i => i.id === newId);
    if (issueToSelect) {
      handleSelectIssue(issueToSelect);
    }

    // Step 5: Admin resolves
    await new Promise(r => setTimeout(r, 4500));
    toast.success('Admin dispatches crew and resolves issue!', { icon: '✅' });
  };

  const handleCreateReport = async (newReportData: Omit<CommunityIssue, 'id' | 'votes' | 'votedBy' | 'verifiedBy' | 'timeline'>) => {
    if (!authUser) {
      alert("Please log in to report an issue.");
      return;
    }
    try {
      const newId = await createIssue({
        ...newReportData,
        votes: 1,
        votedBy: [userProfile.name],
        verifiedBy: [],
        status: 'Reported',
        timeline: [
          {
            status: 'Reported',
            updatedAt: new Date().toISOString(),
            note: 'Issue created via citizen portal.',
            updatedBy: userProfile.name
          }
        ]
      });

      rewardXp(45, 'report');
      setIsReporting(false);
      setUserCoords(null);
      await refreshIssuesList();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateIssueInList = (updated: CommunityIssue) => {
    // If verifications count went up, award XP
    const prevIssueIndex = issues.findIndex(i => i.id === updated.id);
    if (prevIssueIndex !== -1) {
      const prevIssue = issues[prevIssueIndex];
      const prevVerified = prevIssue.verifiedBy?.includes(userProfile.name) || false;
      const nowVerified = updated.verifiedBy?.includes(userProfile.name) || false;
      
      if (!prevVerified && nowVerified) {
        rewardXp(20, 'verification');
      }
    }

    setIssues(issues.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedIssue(updated);
  };

  const handleSelectIssue = (issue: CommunityIssue) => {
    setSelectedIssue(issue);
    setIsReporting(false);
    setTimeout(() => {
      const container = document.getElementById('issue-details-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserProfile((prev) => ({ ...prev, name: tempName.trim() }));
      setIsEditingName(false);
    }
  };

  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('current_mock_user');
      setAuthUser(null);
      setUserProfile(prev => ({
        ...prev,
        name: 'CivicHero',
        isAdmin: false,
        department: ''
      }));
      setShowProfileModal(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-200" id="app-root">
      <Toaster />
      {/* 1. Navbar Header */}
      <header className="bg-white dark:bg-slate-950 border-b-2 border-slate-100 dark:border-slate-800 shadow-xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl shadow-lg flex items-center justify-center">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-black text-blue-600 dark:text-blue-400 block leading-none font-sans">
                New Delhi Community
              </span>
              <h1 className="font-sans font-black text-slate-800 dark:text-white text-xl tracking-tight flex items-center gap-1.5 mt-0.5">
                Community Hero
                <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {authUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="bg-blue-50/50 dark:bg-blue-900/30 border-2 border-blue-100/30 dark:border-blue-800/50 p-2 rounded-2xl flex items-center gap-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <div className="h-9 w-9 bg-blue-600 dark:bg-blue-500 text-white rounded-xl flex items-center justify-center font-black font-sans text-xs shadow-md overflow-hidden">
                    {authUser.photoURL ? (
                      <img src={authUser.photoURL} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      isAdmin ? 'A' : `Lv.${userProfile.level}`
                    )}
                  </div>
                  <div className="text-left font-sans hidden sm:block">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{userProfile.name}</span>
                      {isAdmin && <Shield className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono font-bold block leading-none mt-0.5">
                      {isAdmin ? (userProfile.department || 'Admin Portal') : `${userProfile.xp} cumulative XP`}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <UserCircle className="h-4.5 w-4.5" />
                Sign In
              </button>
            )}
            
            {isAdmin && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900/30">
                {userProfile.department || 'Admin Portal'}
              </span>
            )}
            {!isAdmin && (
              <button
                onClick={() => {
                  if (!authUser) {
                    setShowLoginModal(true);
                    toast('Please sign in to report an issue', { icon: '👋' });
                    return;
                  }
                  setIsReporting(true);
                  setSelectedIssue(null);
                  setTimeout(() => {
                    const container = document.getElementById('issue-details-container');
                    if (container) {
                      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-200 dark:shadow-none hover:shadow-lg transition-all cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Report Issue</span>
                <span className="sm:hidden">Report</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onAdminLogin={(adminData) => {
            const adminUser = {
              email: adminData.email || 'admin@newdelhi.gov.in',
              uid: adminData.uid || 'admin-portal',
              displayName: adminData.name || 'City Admin',
              photoURL: null,
              isAdmin: true,
              department: adminData.department || 'Civic Audit Department'
            };
            setAuthUser(adminUser);
            localStorage.setItem('current_mock_user', JSON.stringify(adminUser));
            setUserProfile(prev => ({ 
              ...prev, 
              name: adminData.name || 'City Admin', 
              isAdmin: true,
              department: adminData.department || 'Civic Audit Department'
            }));
            setShowLoginModal(false);
            toast.success(`Authenticated as ${adminData.name || 'Municipal Admin'}`);
          }}
          onUserLogin={(user) => {
            const citizenUser = {
              email: user.email,
              uid: user.uid || 'mock-user-' + Date.now(),
              displayName: user.displayName || user.name || user.email?.split('@')[0],
              photoURL: null
            };
            setAuthUser(citizenUser);
            localStorage.setItem('current_mock_user', JSON.stringify(citizenUser));
            setUserProfile(prev => ({ 
              ...prev, 
              name: citizenUser.displayName, 
              isAdmin: false 
            }));
            setShowLoginModal(false);
            toast.success('Signed in successfully');
          }}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && authUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-20 w-20 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-md overflow-hidden border-4 border-white dark:border-slate-800">
                {authUser.photoURL ? (
                  <img src={authUser.photoURL} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  authUser.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{userProfile.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{authUser.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 dark:border-slate-800">
                {!isAdmin ? (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Level</span>
                      <span className="block text-xl font-black text-blue-600 dark:text-blue-400">{userProfile.level}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">XP</span>
                      <span className="block text-xl font-black text-amber-500">{userProfile.xp}</span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex flex-col items-center justify-center">
                    <Shield className="h-6 w-6 text-emerald-500 mb-1" />
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Administrative Access</span>
                    <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{userProfile.department || 'Civic Audit Department'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newName = prompt("Enter your new display name:", userProfile.name);
                    if (newName && newName.trim() !== '') {
                      setUserProfile(prev => ({ ...prev, name: newName.trim() }));
                    }
                  }}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Edit Display Name
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Admin Title / Filter Controls bar */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                Municipal Dispatch Console
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Active department: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{userProfile.department || 'Civic Audit Department'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-250/50 dark:border-slate-700/50">
                <button
                  onClick={() => setAdminFilter('mine')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${adminFilter === 'mine' ? 'bg-white dark:bg-slate-755 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  My Department Only
                </button>
                <button
                  onClick={() => setAdminFilter('all')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${adminFilter === 'all' ? 'bg-white dark:bg-slate-755 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  All Municipal Tickets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Top-level dashboard counts */}
        <DashboardStats 
          issues={issues} 
          isAdmin={isAdmin} 
          department={userProfile.department} 
        />

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-24 text-center space-y-2">
            <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-600 dark:text-slate-400 font-sans font-medium">Downloading latest community records...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6" id="app-main-content">
            
            {/* 1. MAP SECTION (Hero) */}
            <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-sm border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
              <InteractiveMap
                issues={isAdmin ? visibleIssues : issues}
                selectedIssue={selectedIssue}
                onSelectIssue={handleSelectIssue}
                onSelectCoords={handleSelectCoordsFromMap}
                userCoords={userCoords}
                isAdmin={isAdmin}
                focusLocation={focusLocation}
              />
              
              {/* Floating Report Button */}
              {!isAdmin && (
                <button
                  onClick={() => {
                    if (!authUser) {
                      setShowLoginModal(true);
                      toast('Please sign in to report an issue', { icon: '👋' });
                      return;
                    }
                    setIsReporting(true);
                    setSelectedIssue(null);
                    // Scroll to details container
                    setTimeout(() => {
                      const container = document.getElementById('issue-details-container');
                      if (container) {
                        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                  className="absolute bottom-6 right-6 z-[1000] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border-4 border-white/20 dark:border-slate-900/50"
                >
                  <Plus className="h-6 w-6" />
                  Report Issue
                </button>
              )}
            </div>
            
            {/* 2. CURRENT INCIDENT (Issue Details) */}
            <div className="w-full" id="issue-details-container">
              <div className="w-full rounded-3xl shadow-sm relative">
                {isReporting ? (
                  <ReportIssueForm
                    userCoords={userCoords}
                    currentIssues={issues}
                    onSubmit={handleCreateReport}
                    onCancel={() => {
                      setIsReporting(false);
                      setUserCoords(null);
                      if (issues.length > 0) {
                        setSelectedIssue(issues[0]);
                      }
                    }}
                    currentUser={userProfile.name}
                  />
                ) : selectedIssue ? (
                  <IssueDetail
                    issue={selectedIssue}
                    currentUser={userProfile.name}
                    isAdmin={isAdmin}
                    onUpdateIssue={handleUpdateIssueInList}
                    onRefreshList={refreshIssuesList}
                    onAwardXp={(amount, reason) => rewardXp(amount, reason)}
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm p-6 text-center space-y-4 font-sans flex flex-col justify-center min-h-[300px] animate-fade-in">
                    <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-1 border-2 border-blue-100 dark:border-blue-800/50">
                      <Navigation className="h-6 w-6 rotate-45" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Select an Issue</h3>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed">
                      Click any point marker on the live map to inspect timelines or add comments
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. RECENT REPORTS */}
            <div className="w-full">
              <IssueList
                issues={isAdmin ? visibleIssues : issues}
                selectedIssueId={selectedIssue?.id}
                onSelectIssue={handleSelectIssue}
              />
            </div>

            {/* 4. AI INSIGHTS */}
            {!isAdmin && (
              <div className="w-full">
                <PredictiveInsightsPanel 
                  issues={issues} 
                  onViewOnMap={(lat, lng, address) => {
                    setFocusLocation({ lat, lng });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />
              </div>
            )}
            
            {/* 5. LEADERBOARD */}
            {!isAdmin && (
              <div className="w-full">
                <Leaderboard userProfile={userProfile} />
              </div>
            )}

          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 Community Hero Inc. Empowering citizens through social collaborations and AI.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              New Delhi Central Grid Active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
