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
  ChevronDown
} from 'lucide-react';
import { CommunityIssue, IssueComment } from '../types';
import { toggleVoteIssue, toggleVerifyIssue, fetchComments, addComment } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Accordion = ({ title, icon: Icon, children, defaultOpen = false }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left focus:outline-none group cursor-pointer py-2"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wide">
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
            <div className="pt-2 pb-4">{children}</div>
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
  onUpdateIssue: (updatedIssue: CommunityIssue) => void;
  onRefreshList: () => void;
  onAwardXp?: (amount: number, reason: string) => void;
}

export default function IssueDetail({
  issue,
  currentUser,
  isAdmin = false,
  onUpdateIssue,
  onRefreshList,
  onAwardXp
}: IssueDetailProps) {
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    let active = true;
    const loadComments = async () => {
      const fetched = await fetchComments(issue.id);
      if (active) setComments(fetched);
    };
    loadComments();
    return () => { active = false; };
  }, [issue.id]);

  const handleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = await toggleVoteIssue(issue.id, currentUser);
      const updatedVotedBy = [...(issue.votedBy || [])];
      const index = updatedVotedBy.indexOf(currentUser);
      if (result.voted && index === -1) updatedVotedBy.push(currentUser);
      else if (!result.voted && index !== -1) updatedVotedBy.splice(index, 1);
      onUpdateIssue({ ...issue, votes: result.votes, votedBy: updatedVotedBy });
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

      if (verifiedAdded && issue.status === 'Reported') {
        nextStatus = 'Under Review';
        nextTimeline.push({
          status: 'Under Review',
          updatedAt: new Date().toISOString(),
          note: `Automated validation: Verified by ${currentUser}.`,
          updatedBy: 'Civic Validation Engine'
        });
        if (onAwardXp) onAwardXp(15, 'validation-trigger');
      }

      onUpdateIssue({ ...issue, verifiedBy: updatedVerifiedBy, status: nextStatus, timeline: nextTimeline });
      if (verifiedAdded) toast.success('Validation logged successfully');
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
      toast.success('Comment posted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const hasVoted = issue.votedBy?.includes(currentUser) || false;
  const hasVerified = issue.verifiedBy?.includes(currentUser) || false;

  const statusMap: Record<string, { color: string; dot: string; step: number }> = {
    Reported: { color: 'text-rose-500 bg-rose-50 border-rose-100', dot: 'bg-rose-500', step: 0 },
    'Under Review': { color: 'text-orange-500 bg-orange-50 border-orange-100', dot: 'bg-orange-500', step: 1 },
    Scheduled: { color: 'text-blue-500 bg-blue-50 border-blue-100', dot: 'bg-blue-500', step: 2 },
    'In Progress': { color: 'text-amber-500 bg-amber-50 border-amber-100', dot: 'bg-amber-500', step: 3 },
    Resolved: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', step: 4 }
  };

  const priorityColors: Record<string, string> = {
    Critical: 'bg-rose-100 text-rose-800 border-rose-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-100 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              {issue.category}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md border flex items-center gap-1 ${priorityColors[issue.priority]}`}>
              {issue.priority} Priority
            </span>
          </div>
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg border-2 uppercase ${statusMap[issue.status].color}`}>
            {issue.status}
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="font-sans font-black text-slate-850 text-2xl tracking-tight leading-tight">
            {issue.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mt-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>Reported by <span className="font-black text-slate-600">{issue.reportedBy}</span></span>
            <span>•</span>
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date(issue.reportedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="py-2">
          <div className="flex justify-between items-center mb-2 px-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span className={statusMap[issue.status].step >= 0 ? "text-rose-500 font-black" : ""}>Reported</span>
            <span className={statusMap[issue.status].step >= 1 ? "text-orange-500 font-black" : ""}>Verified</span>
            <span className={statusMap[issue.status].step >= 2 ? "text-blue-500 font-black" : ""}>Scheduled</span>
            <span className={statusMap[issue.status].step >= 4 ? "text-emerald-500 font-black" : ""}>Resolved</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${statusMap[issue.status].step === 0 ? 'bg-rose-500' : statusMap[issue.status].step === 1 ? 'bg-orange-500' : statusMap[issue.status].step === 2 || statusMap[issue.status].step === 3 ? 'bg-blue-500' : 'bg-emerald-500'}`}
              style={{ width: `${(statusMap[issue.status].step / 4) * 100}%` }}
            />
          </div>
        </div>

        {issue.videoUrl ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-100 flex items-center justify-center shadow-inner">
            <video src={issue.videoUrl} controls className="w-full object-cover max-h-60" />
          </div>
        ) : issue.imageUrl && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-100 max-h-60 flex items-center justify-center shadow-inner">
            <img src={issue.imageUrl} alt="Issue" className="w-full object-cover max-h-60" referrerPolicy="no-referrer" />
          </div>
        )}

        {issue.status === 'Resolved' && issue.resolutionImageUrl && (
          <div className="space-y-2 mt-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
              After Repair
            </h3>
            <div className="relative rounded-2xl overflow-hidden bg-emerald-900/10 border-2 border-emerald-100 max-h-60 flex items-center justify-center shadow-inner">
              <img src={issue.resolutionImageUrl} alt="Resolution" className="w-full object-cover max-h-60" referrerPolicy="no-referrer" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Issue Description</h3>
          <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border-2 border-slate-100/50">
            {issue.description}
          </p>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/30 border-2 border-blue-100/30">
          <MapPin className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Location</h4>
            <p className="text-sm font-bold text-slate-700">{issue.address}</p>
            <p className="text-[10px] text-slate-400 font-mono">GPS: {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="grid grid-cols-2 gap-3">
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

        <div className="space-y-0 pb-4">
          <Accordion title="Resolution Timeline" icon={Clock} defaultOpen={false}>
            <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-2 mt-2">
              {(issue.timeline || []).map((event, index) => (
                <div key={index} className="relative">
                  <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-white ring-4 ring-slate-50 flex items-center justify-center ${statusMap[event.status].dot}`} />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{event.status}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{new Date(event.updatedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">{event.note}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Logged by {event.updatedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          {issue.status === 'Resolved' && (
            <div className="p-5 bg-emerald-50/50 border-2 border-emerald-100 rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-800">Resolution Report</h3>
              {issue.resolutionDetails && (
                <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100">
                  {issue.resolutionDetails}
                </p>
              )}
            </div>
          )}

          <Accordion title={`Discussion (${comments.length})`} icon={MessageSquare} defaultOpen={true}>
            <div className="space-y-4 pt-2">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add your comment..."
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-full px-4 py-2.5 bg-slate-50 focus:outline-none focus:border-blue-400 transition-all focus:bg-white text-slate-800"
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
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1.5">
                      <span className="font-black text-slate-700">{comment.author}</span>
                      <span className="font-mono">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600 font-semibold leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
