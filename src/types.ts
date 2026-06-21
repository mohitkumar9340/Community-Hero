export type IssueCategory =
  | 'Roads & Traffic'
  | 'Water & Sanitation'
  | 'Waste Management'
  | 'Electricity & Lighting'
  | 'Public Parks & Safety'
  | 'Other';

export type IssueStatus =
  | 'Reported'
  | 'Under Review'
  | 'Scheduled'
  | 'In Progress'
  | 'Resolved';

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IssueTimelineEvent {
  status: IssueStatus;
  updatedAt: string;
  note: string;
  updatedBy: string;
}

export interface CommunityIssue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  videoUrl?: string;
  reportedBy: string;
  reportedAt: string;
  votes: number;
  votedBy?: string[];
  verifiedBy: string[];
  resolutionDetails?: string;
  resolutionImageUrl?: string;
  timeline: IssueTimelineEvent[];
  aiActionPlan?: string;
  aiSuggestedCategory?: string;
  priorityRationale?: string;
  assignedDepartment?: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xpRequired: number;
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  badges: string[];
  reportsCount: number;
  verificationsCount: number;
  isAdmin?: boolean;
  department?: string;
}

export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'info' | 'success';
  location: string;
  confidence: number;
  aiAnalysis: string;
}
