import { useState } from 'react';
import { Search, Filter, AlertCircle, ThumbsUp, CheckSquare, Clock, ArrowUpDown } from 'lucide-react';
import { CommunityIssue, IssueCategory, IssueStatus } from '../types';

interface IssueListProps {
  issues: CommunityIssue[];
  onSelectIssue: (issue: CommunityIssue) => void;
  selectedIssueId?: string;
}

export default function IssueList({ issues, onSelectIssue, selectedIssueId }: IssueListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'reportedAt' | 'votes'>('reportedAt');

  const categories: (IssueCategory | 'All')[] = [
    'All',
    'Roads & Traffic',
    'Water & Sanitation',
    'Waste Management',
    'Electricity & Lighting',
    'Public Parks & Safety',
    'Other'
  ];

  const statuses: (IssueStatus | 'All')[] = [
    'All',
    'Reported',
    'Under Review',
    'Scheduled',
    'In Progress',
    'Resolved'
  ];

  // Filtering and sorting logic
  const filteredIssues = issues
    .filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || issue.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || issue.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'votes') {
        return b.votes - a.votes;
      } else {
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      }
    });

  const priorityColors = {
    Critical: 'bg-rose-100 text-rose-700 font-black border-2 border-rose-200',
    High: 'bg-orange-100 text-orange-700 font-black border-2 border-orange-200',
    Medium: 'bg-amber-100 text-amber-700 font-black border-2 border-amber-200',
    Low: 'bg-slate-100 text-slate-700 font-bold border-2 border-slate-200'
  };

  const statusColors = {
    Reported: 'bg-rose-50 text-rose-600 border-2 border-rose-200 font-black dark:bg-rose-900/30 dark:border-rose-800/50',
    'Under Review': 'bg-orange-50 text-orange-600 border-2 border-orange-200 font-black dark:bg-orange-900/30 dark:border-orange-800/50',
    Scheduled: 'bg-blue-50 text-blue-600 border-2 border-blue-200 font-black dark:bg-blue-900/30 dark:border-blue-800/50',
    'In Progress': 'bg-amber-50 text-amber-600 border-2 border-amber-200 font-black dark:bg-amber-900/30 dark:border-amber-800/50',
    Resolved: 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 font-black dark:bg-emerald-900/30 dark:border-emerald-800/50'
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col h-full" id="issue-list-card">
      {/* Filters Area */}
      <div className="p-6 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Recent Reports <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-lg text-slate-500 font-bold">NEW DELHI</span>
          </h2>
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest bg-white border border-slate-200/80 px-2 py-1 rounded-xl">
            {filteredIssues.length} found
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search neighborhood issues..."
            className="w-full pl-11 pr-5 py-3 text-sm bg-white border-2 border-slate-100 focus:border-blue-400 rounded-full outline-none transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories Scroller */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans block">
            Filter by Category
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap cursor-pointer font-bold ${
                  selectedCategory === category
                    ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Status & Sorting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="text-xs bg-white border-2 border-slate-100 rounded-xl py-1.5 px-3 focus:outline-none focus:border-blue-400 font-bold text-slate-600 cursor-pointer"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  Status: {status}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Toggles */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSortBy('reportedAt')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                sortBy === 'reportedAt' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Recent
            </button>
            <button
              onClick={() => setSortBy('votes')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                sortBy === 'votes' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Votes
            </button>
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto max-h-[550px] divide-y-2 divide-slate-50 p-4 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="h-12 w-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Filter className="h-6 w-6" />
            </div>
            <p className="text-sm font-sans font-bold text-slate-600">No community issues found</p>
            <p className="text-xs text-slate-400 font-sans">Try modifying your search or filter options</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isSelected = selectedIssueId === issue.id;
            
            // Get a nice colorful emoji/initial circle based on category
            const getCategoryStyle = (cat: string) => {
              switch (cat) {
                case 'Roads & Traffic':
                  return { emoji: '🚧', bg: 'bg-amber-100' };
                case 'Water & Sanitation':
                  return { emoji: '💧', bg: 'bg-sky-100' };
                case 'Waste Management':
                  return { emoji: '♻️', bg: 'bg-emerald-100' };
                case 'Electricity & Lighting':
                  return { emoji: '💡', bg: 'bg-yellow-100' };
                case 'Public Parks & Safety':
                  return { emoji: '🌳', bg: 'bg-green-100' };
                default:
                  return { emoji: '📍', bg: 'bg-blue-100' };
              }
            };
            const catStyle = getCategoryStyle(issue.category);

            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`p-5 bg-white dark:bg-slate-900 border-2 rounded-3xl flex items-center gap-5 transition-all duration-200 cursor-pointer group shadow-xs ${
                  isSelected ? 'border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/20 shadow-md shadow-blue-50/50 dark:shadow-none' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100 shadow-inner relative bg-slate-100 flex items-center justify-center">
                  {issue.imageUrl ? (
                    <img
                      src={issue.imageUrl}
                      alt={issue.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-full h-full ${catStyle.bg} flex items-center justify-center text-2xl shadow-inner`}>
                      {catStyle.emoji}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md uppercase tracking-wider">
                      {issue.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {new Date(issue.reportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="font-sans font-black text-slate-800 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {issue.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-1 font-semibold leading-relaxed">
                    {issue.description}
                  </p>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans pt-1">
                    <span className="truncate max-w-[150px] font-bold text-slate-500">
                      📍 {issue.address}
                    </span>
                    
                    <div className="flex items-center gap-3 font-mono">
                      <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50/50 px-1.5 py-0.5 rounded-md">
                        👍 {issue.votes}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50/50 px-1.5 py-0.5 rounded-md">
                        ✓ {issue.verifiedBy?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${statusColors[issue.status]}`}>
                    {issue.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
