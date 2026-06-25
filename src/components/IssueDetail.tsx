import React, { useState, useEffect } from 'react';
import {
  ThumbsUp,
  HeartHandshake,
  MessageSquare,
  Clock,
  User,
  MapPin,
  Calendar,
  Sparkles,
  Send,
  Wrench,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  Building,
  Mail,
  Share2,
  X,
  Download,
  QrCode,
  AlertCircle,
  ChevronDown,
  ShieldAlert
} from 'lucide-react';
import { CommunityIssue, IssueComment, IssueStatus } from '../types';
import { toggleVoteIssue, toggleVerifyIssue, fetchComments, addComment, updateIssueStatus } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Helper Accordion Component
const Accordion = ({ title, icon: Icon, children, defaultOpen = false }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left focus:outline-none group cursor-pointer py-2"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
          <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface IssueDetailProps {
  issue: CommunityIssue;
  currentUser: string;
  isAdmin?: boolean;
  currentUserDept?: string;
  onUpdateIssue: (updatedIssue: CommunityIssue) => void;
  onRefreshList: () => void;
  onAwardXp?: (amount: number, reason: string) => void;
}

export default function IssueDetail({
  issue,
  currentUser,
  isAdmin = false,
  currentUserDept = '',
  onUpdateIssue,
  onRefreshList,
  onAwardXp
}: IssueDetailProps) {
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Simulated admin actions state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [selectedNextStatus, setSelectedNextStatus] = useState<IssueStatus>(issue.status);
  const [resolutionImage, setResolutionImage] = useState<string | null>(null);

  // Social share states
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    let active = true;
    const loadComments = async () => {
      const fetched = await fetchComments(issue.id);
      if (active) {
        setComments(fetched);
      }
    };
    loadComments();
    return () => {
      active = false;
    };
  }, [issue.id]);

  const handleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = await toggleVoteIssue(issue.id, currentUser);
      const updatedVotedBy = [...(issue.votedBy || [])];
      const index = updatedVotedBy.indexOf(currentUser);
      if (result.voted && index === -1) {
        updatedVotedBy.push(currentUser);
      } else if (!result.voted && index !== -1) {
        updatedVotedBy.splice(index, 1);
      }

      onUpdateIssue({
        ...issue,
        votes: result.votes,
        votedBy: updatedVotedBy
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const result = await toggleVerifyIssue(issue.id, currentUser);
      const updatedVerifiedBy = [...issue.verifiedBy];
      const index = updatedVerifiedBy.indexOf(currentUser);
      let verifiedAdded = false;
      if (result.verified && index === -1) {
        updatedVerifiedBy.push(currentUser);
        verifiedAdded = true;
      } else if (!result.verified && index !== -1) {
        updatedVerifiedBy.splice(index, 1);
      }

      let nextStatus = issue.status;
      let nextTimeline = [...(issue.timeline || [])];

      // Automated workflow: when an issue is reported and validated by a citizen verification,
      // it is automatically transitioned to 'Under Review' and assigned to its designated department.
      if (verifiedAdded && issue.status === 'Reported') {
        nextStatus = 'Under Review';
        const autoNote = `Automated validation: Verified by community hero ${currentUser}. Automatically assigned to ${issue.assignedDepartment || 'Public Works'} for immediate dispatch review.`;
        nextTimeline.push({
          status: 'Under Review',
          updatedAt: new Date().toISOString(),
          note: autoNote,
          updatedBy: 'Civic Validation Engine'
        });

        // Sync to Firestore
        await updateIssueStatus(issue.id, 'Under Review', autoNote, 'Civic Validation Engine');
        
        if (onAwardXp) {
          // Extra bonus for initiating community validation!
          onAwardXp(15, 'validation-trigger');
        }
      }

      onUpdateIssue({
        ...issue,
        verifiedBy: updatedVerifiedBy,
        status: nextStatus,
        timeline: nextTimeline
      });
      
      if (verifiedAdded) {
        toast.success('Validation logged securely on-chain');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const comment = await addComment(issue.id, currentUser, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
      toast.success('Feedback published to community log!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post feedback.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);
  const [resolutionVerificationResult, setResolutionVerificationResult] = useState<{ verified: boolean, confidence: number, analysis: string } | null>(null);

  const handleAdminStatusUpdate = async (e?: React.FormEvent, forceSubmit: boolean = false) => {
    if (e) e.preventDefault();
    if (!adminNote.trim()) return;

    if (!forceSubmit && selectedNextStatus === 'Resolved' && resolutionImage && issue.imageUrl) {
      setIsVerifyingResolution(true);
      try {
        const response = await fetch('/api/ai/verify-resolution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: issue.description,
            beforeImage: issue.imageUrl,
            afterImage: resolutionImage
          })
        });
        const data = await response.json();
        
        if (!data.verified && data.confidence > 50) {
          // If AI is confident it's not verified
          setResolutionVerificationResult(data);
          setIsVerifyingResolution(false);
          return;
        }
      } catch (err) {
        console.error('Resolution verification failed:', err);
      }
      setIsVerifyingResolution(false);
    }

    try {
      await updateIssueStatus(
        issue.id,
        selectedNextStatus,
        adminNote.trim(),
        `Admin: ${currentUser}`,
        resolutionImage || undefined
      );
      
      // Update local state issue object to reflect new timeline and status
      const updatedTimeline = [
        ...(issue.timeline || []),
        {
          status: selectedNextStatus,
          updatedAt: new Date().toISOString(),
          note: adminNote.trim(),
          updatedBy: `Admin: ${currentUser}`
        }
      ];

      const updatedObj: CommunityIssue = {
        ...issue,
        status: selectedNextStatus,
        timeline: updatedTimeline,
        ...(selectedNextStatus === 'Resolved' ? { 
          resolutionDetails: adminNote.trim(),
          resolutionImageUrl: resolutionImage || undefined
        } : {})
      };

      onUpdateIssue(updatedObj);
      setAdminNote('');
      setResolutionImage(null);
      setShowAdminPanel(false);
      onRefreshList();
    } catch (err) {
      console.error(err);
    }
  };

  const hasVoted = issue.votedBy?.includes(currentUser) || false;
  const hasVerified = issue.verifiedBy?.includes(currentUser) || false;

  const statusMap = {
    Reported: { color: 'text-rose-500 bg-rose-50 border-rose-100', dot: 'bg-rose-500', step: 0 },
    'Under Review': { color: 'text-orange-500 bg-orange-50 border-orange-100', dot: 'bg-orange-500', step: 1 },
    Scheduled: { color: 'text-blue-500 bg-blue-50 border-blue-100', dot: 'bg-blue-500', step: 2 },
    'In Progress': { color: 'text-amber-500 bg-amber-50 border-amber-100', dot: 'bg-amber-500', step: 3 },
    Resolved: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', step: 4 }
  };

  const priorityColors = {
    Critical: 'bg-rose-100 text-rose-800 border-rose-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  if (isAdmin && currentUserDept && issue.assignedDepartment && issue.assignedDepartment !== currentUserDept) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center space-y-4 font-sans flex flex-col justify-center min-h-[300px] animate-fade-in" id="restricted-issue-detail">
        <div className="h-16 w-16 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-rose-100 dark:border-rose-800/50">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight animate-pulse">Access Restricted</h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          This incident is assigned to <span className="font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-100 dark:border-purple-900/30">{issue.assignedDepartment}</span>.
        </p>
        <p className="text-xs font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          You are authenticated under <span className="font-bold text-slate-600 dark:text-slate-300">{currentUserDept}</span>. Administrative tasks, discussions, and details are strictly limited to the assigned department.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full" id="issue-detail-card">
      {/* Scrollable Detail Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Top Badges & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-md border border-blue-100 dark:border-blue-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              {issue.category}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border flex items-center gap-1 ${priorityColors[issue.priority]}`}>
              <Sparkles className="h-3 w-3 opacity-70" />
              {issue.priority} Priority
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border-2 uppercase ${statusMap[issue.status].color}`}>
              {issue.status}
            </span>
          </div>
        </div>

        {/* Title & Author */}
        <div className="space-y-2">
          <h1 className="font-sans font-black text-slate-850 dark:text-white text-2xl tracking-tight leading-tight">
            {issue.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-bold mt-2">
            <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span>Reported by <span className="font-black text-slate-600">{issue.reportedBy}</span></span>
            <span>•</span>
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date(issue.reportedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Visual Progress Timeline */}
        <div className="py-2">
          <div className="flex justify-between items-center mb-2 px-1 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <span className={statusMap[issue.status].step >= 0 ? "text-rose-500 font-black" : ""}>Reported</span>
            <span className={statusMap[issue.status].step >= 1 ? "text-orange-500 font-black" : ""}>Verified</span>
            <span className={statusMap[issue.status].step >= 2 ? "text-blue-500 font-black" : ""}>Scheduled</span>
            <span className={statusMap[issue.status].step >= 4 ? "text-emerald-500 font-black" : ""}>Resolved</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${statusMap[issue.status].step === 0 ? 'bg-rose-500' : statusMap[issue.status].step === 1 ? 'bg-orange-500' : statusMap[issue.status].step === 2 || statusMap[issue.status].step === 3 ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${(statusMap[issue.status].step / 4) * 100}%` }}></div>
          </div>
        </div>

        {/* Issue Media if exists */}
        {issue.videoUrl ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner">
            <video
              src={issue.videoUrl}
              controls
              className="w-full object-cover max-h-60"
            />
          </div>
        ) : issue.imageUrl && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-100 dark:border-slate-800 max-h-60 flex items-center justify-center shadow-inner">
            <img
              src={issue.imageUrl}
              alt="Community issue visual verification"
              className="w-full object-cover max-h-60"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Resolution Image if exists and resolved */}
        {issue.status === 'Resolved' && issue.resolutionImageUrl && (
          <div className="space-y-2 mt-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 font-sans flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              After Repair
            </h3>
            <div className="relative rounded-2xl overflow-hidden bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-800/30 max-h-60 flex items-center justify-center shadow-inner">
              <img
                src={issue.resolutionImageUrl}
                alt="Community issue resolution verification"
                className="w-full object-cover max-h-60"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 font-sans">
            Issue Description
          </h3>
          <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border-2 border-slate-100/50">
            {issue.description}
          </p>
        </div>

        {/* Location & GPS Info */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/30 border-2 border-blue-100/30">
          <MapPin className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Identified Geo-location</h4>
            <p className="text-sm font-bold text-slate-700 font-sans">{issue.address}</p>
            <p className="text-[10px] text-slate-400 font-mono">GPS Coordinates: {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}</p>
          </div>
        </div>

        {/* Action buttons (Vote & Verify) */}
        {!isAdmin && (
          <div className="grid grid-cols-2 gap-3" id="social-interaction-buttons">
            <button
              onClick={handleVote}
              disabled={isVoting}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                hasVoted
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                  : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${hasVoted ? 'fill-white' : ''}`} />
              <span>{hasVoted ? 'Upvoted!' : 'Upvote'} ({issue.votes})</span>
            </button>

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 text-sm font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                hasVerified
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                  : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <HeartHandshake className="h-4 w-4" />
              <span>{hasVerified ? 'Verified!' : 'Verify'} ({issue.verifiedBy?.length || 0})</span>
            </button>
          </div>
        )}

        {/* Generate Social Shareable Card button */}
        {!isAdmin && (
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/10 hover:bg-indigo-50/30 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            <span>Generate Shareable Card</span>
          </button>
        )}

        {/* Accordions for Advanced Info */}
        <div className="space-y-0 pb-4">
          
          {/* AI Smart Insight Plan */}
          {issue.aiActionPlan && (
            <Accordion title="AI Action Plan" icon={Sparkles} defaultOpen={false}>
              <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-2xl">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 space-y-2 whitespace-pre-wrap leading-relaxed">
                  {issue.aiActionPlan}
                </div>
              </div>
            </Accordion>
          )}

          {/* Assigned Department and Priority Rationale */}
          {isAdmin && (
            <Accordion title="Department Details" icon={Building} defaultOpen={false}>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Assigned Department</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50">
                    {issue.assignedDepartment || 'Public Works'}
                  </span>
                </div>
                {issue.priorityRationale && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">AI Risk Analysis</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-normal">
                      {issue.priorityRationale}
                    </p>
                  </div>
                )}
              </div>
            </Accordion>
          )}

        {/* Resolution details if resolved */}
        {issue.status === 'Resolved' && (
          <div className="p-5 bg-emerald-50/50 border-2 border-emerald-100 rounded-3xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-emerald-150 pb-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-800 font-sans">
                Official Resolution Report
              </h3>
            </div>
            {issue.resolutionDetails && (
              <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100">
                {issue.resolutionDetails}
              </p>
            )}

            {/* Before vs After Visual Proof */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700/80 block">Before vs After Comparison</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-emerald-100 h-28 flex flex-col justify-end shadow-sm">
                  {issue.imageUrl ? (
                    <img src={issue.imageUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover opacity-75" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">No initial image</div>
                  )}
                  <span className="relative z-10 m-2 px-1.5 py-0.5 bg-rose-600/90 text-white font-extrabold text-[8px] rounded uppercase tracking-wider self-start">
                    Before
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-emerald-100 h-28 flex flex-col justify-end shadow-sm">
                  {issue.resolutionImageUrl ? (
                    <img src={issue.resolutionImageUrl} alt="After" className="absolute inset-0 w-full h-full object-cover opacity-85" referrerPolicy="no-referrer" />
                  ) : (
                    <img src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&q=80&w=800" alt="After" className="absolute inset-0 w-full h-full object-cover opacity-85" referrerPolicy="no-referrer" />
                  )}
                  <span className="relative z-10 m-2 px-1.5 py-0.5 bg-emerald-600/90 text-white font-extrabold text-[8px] rounded uppercase tracking-wider self-start">
                    After
                  </span>
                </div>
              </div>
            </div>

            {/* Satisfaction Survey */}
            {!isAdmin && (
              <div className="bg-white/80 border border-emerald-100 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                <span className="text-[10px] font-bold text-slate-600">Are you satisfied with this fix?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onAwardXp) onAwardXp(5, 'feedback');
                      alert('Thank you for your feedback! It has been logged to New Delhi Municipal dashboard.');
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 text-[10px] font-bold text-emerald-700 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  >
                    👍 Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Feedback registered. Our civic audit team will inspect.');
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-[10px] font-bold text-rose-700 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  >
                    👎 No
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Resolution Pipeline Tracker */}
          <Accordion title="Resolution Timeline" icon={Clock} defaultOpen={false}>
            <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-2">
              {(issue.timeline || []).map((event, index) => (
                <div key={index} className="relative">
                  {/* Dot indicator */}
                  <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ring-4 ring-slate-50 dark:ring-slate-800/50 flex items-center justify-center ${statusMap[event.status].dot}`} />
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{event.status}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{new Date(event.updatedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{event.note}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Logged by {isAdmin ? event.updatedBy : 'Municipal Representative'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          {/* Automated Notification Hub */}
          {isAdmin && (
            <Accordion title="Dispatch Logs" icon={Mail} defaultOpen={false}>
              <div className="p-4 bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl space-y-3 font-sans">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-400">Automated Notification Dispatcher</span>
                </div>

                <div className="space-y-2.5 mt-2">
                  {/* Notification 1: Reporter Email */}
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 shadow-sm">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Reporter Email Dispatch</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${issue.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}>
                          {issue.status === 'Resolved' ? 'Sent (Email)' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notification 2: Community Channel Broadcast */}
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 shadow-sm">
                    <div className="p-2 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Community Channel Alert</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${issue.status === 'Resolved' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}>
                          {issue.status === 'Resolved' ? 'Broadcast Completed' : 'Queued'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Accordion>
          )}

          {/* Comments Feed Section */}
          <Accordion title={`Citizen Discussion (${comments.length})`} icon={MessageSquare} defaultOpen={true}>
            <div className="space-y-4 pt-2">
              {/* Comment input form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add your local feedback or update..."
                  className="flex-1 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:border-blue-400 transition-all focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1.5">
                      <span className="font-black text-slate-700 dark:text-slate-300">{comment.author}</span>
                      <span className="font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>

        {/* Municipal dispatcher control panel simulation */}
        {isAdmin && (
          <Accordion title="Municipal Dispatch Controls (Admin)" icon={Wrench} defaultOpen={false}>
            <form onSubmit={(e) => handleAdminStatusUpdate(e)} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 font-sans mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Advance Status
                  </label>
                  <select
                    value={selectedNextStatus}
                    onChange={(e) => setSelectedNextStatus(e.target.value as any)}
                    className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 font-bold"
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Signatory Agent
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`Admin (${currentUser})`}
                    className="w-full text-xs bg-slate-100 border-2 border-slate-100 rounded-xl p-2.5 text-slate-500 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Timeline update note / resolution report
                </label>
                <textarea
                  placeholder={selectedNextStatus === 'Resolved' ? 'Describe the work completed...' : 'Detail dispatcher scheduling notes...'}
                  className="w-full text-xs bg-white border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-blue-400 h-16 font-semibold"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  required
                />
              </div>

              {selectedNextStatus === 'Resolved' && (
                <div className="animate-fade-in">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Upload Proof of Resolution Photo
                  </label>
                  {resolutionImage ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-900 h-24 flex items-center justify-center">
                      <img src={resolutionImage} alt="Resolution Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => {
                          setResolutionImage(null);
                          setResolutionVerificationResult(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 bg-white hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center gap-1">
                      <label className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold cursor-pointer block w-full text-center">
                        <span>Upload Resolution Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setResolutionImage(reader.result as string);
                                setResolutionVerificationResult(null);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[8px] text-slate-450 font-semibold">PNG or JPG up to 5MB</span>
                    </div>
                  )}
                </div>
              )}

              {resolutionVerificationResult && !resolutionVerificationResult.verified && (
                <div className="p-3 bg-rose-50 border-2 border-rose-200 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex gap-2 text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">Verification Failed</span>
                      <p className="text-[10px] font-semibold leading-snug">{resolutionVerificationResult.analysis}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResolutionVerificationResult(null);
                      // Force submission bypassing AI verification
                      handleAdminStatusUpdate(undefined, true);
                    }}
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Override & Resolve Anyway
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingResolution}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isVerifyingResolution && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isVerifyingResolution ? 'Verifying Proof...' : 'Publish Municipal Dispatch Log'}
              </button>
            </form>
          </Accordion>
        )}
        </div>

      </div>

      {/* 14. Shareable Social Media Card Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in" id="share-social-modal">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col relative animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1.5">
                <Share2 className="h-4 w-4" />
                Social Card Generator
              </span>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setCopiedShareLink(false);
                }}
                className="p-1.5 hover:bg-slate-200 text-slate-450 hover:text-slate-700 rounded-full cursor-pointer transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Social Card Preview */}
            <div className="p-6 bg-slate-100/50 flex flex-col items-center justify-center">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden w-full max-w-[280px] space-y-3 p-4 flex flex-col relative" id="sharable-instagram-card">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {issue.category}
                  </span>
                  <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">
                    {issue.status}
                  </span>
                </div>

                {/* Photo or placeholder */}
                <div className="h-32 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center relative border border-slate-100">
                  {issue.imageUrl ? (
                    <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-4xl">📍</div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-[7px] text-white rounded font-mono font-bold">
                    GPS: {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <h4 className="font-sans font-black text-slate-850 text-xs truncate leading-tight">
                    {issue.title}
                  </h4>
                  <p className="text-[8px] text-slate-450 line-clamp-2 font-bold leading-relaxed">
                    "{issue.description}"
                  </p>
                </div>

                {/* QR Code and link block */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                  <div className="p-1 border border-slate-200 rounded-lg bg-white flex-shrink-0">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-[7px] font-black uppercase text-slate-400 block tracking-wider">CIVIC COMPLAINT URL</span>
                    <span className="text-[8px] font-mono font-bold text-blue-600 truncate block">https://communityhero.gov/issue/{issue.id.slice(0,8)}</span>
                    <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold block">New Delhi Municipal Dispatch</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?issue=${issue.id}`);
                  setCopiedShareLink(true);
                  if (onAwardXp) onAwardXp(2, 'share');
                  setTimeout(() => setCopiedShareLink(false), 2000);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-150 cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{copiedShareLink ? 'Link Copied!' : 'Copy Social Share Link'}</span>
              </button>
              <p className="text-[9px] text-slate-400 text-center font-bold">
                Share this card to WhatsApp or social channels to escalate pressure!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
