import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { CommunityIssue, IssueComment, UserProfile, PredictiveInsight, Badge } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyC7VAi13TzByA2OVDHolW6ytBstdh5b3As",
  authDomain: "gen-lang-client-0960596705.firebaseapp.com",
  projectId: "gen-lang-client-0960596705",
  storageBucket: "gen-lang-client-0960596705.firebasestorage.app",
  messagingSenderId: "226311654517",
  appId: "1:226311654517:web:56bc863833841e3c283c3c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-communityhero-d8f94824-06a0-4fa5-ba37-7366c9ece035");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

const hashPassword = (password: string): string => {
  try {
    return btoa(password).split('').reverse().join('');
  } catch (e) {
    return password;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      console.warn("Email Auth disabled. Using mock user.");
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
      if (mockUsers[email]) {
        throw new Error('User already exists');
      }
      const newUser = { uid: 'mock-' + Date.now(), email, displayName: name || email.split('@')[0], pass: hashPassword(pass) };
      mockUsers[email] = newUser;
      localStorage.setItem('mock_users', JSON.stringify(mockUsers));
      return newUser;
    }
    console.error("Error registering with email:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      console.warn("Email Auth disabled. Using mock user.");
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '{}');
      const user = mockUsers[email];
      if (!user) {
        throw new Error('Invalid email or password');
      }
      const isMatch = user.pass === hashPassword(pass) || user.pass === pass;
      if (!isMatch) {
        throw new Error('Invalid email or password');
      }
      return user;
    }
    console.error("Error logging in with email:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Seed data
export const DEFAULT_ISSUES: CommunityIssue[] = [
  {
    id: 'seed-issue-1',
    title: 'Massive Fallen Banyan Tree Blocking Munirka Marg',
    description: 'A large, ancient banyan tree has uprooted after last night\'s thunderstorms, completely blocking all three lanes of traffic near the Munirka Metro Station.',
    category: 'Roads & Traffic',
    status: 'In Progress',
    priority: 'Critical',
    latitude: 28.5560,
    longitude: 77.1700,
    address: 'Munirka Marg, near Metro Station Pillar 104',
    imageUrl: 'https://images.unsplash.com/photo-1596700762141-94ec06efb5c3?q=80&w=800',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    reportedBy: 'Kavita Menon',
    reportedAt: '2026-06-27T06:15:00Z',
    votes: 45,
    votedBy: ['Kavita Menon', 'Rahul Sharma', 'Sneha Patel', 'Amit Kumar'],
    verifiedBy: ['Traffic Police', 'NDRF Team'],
    priorityRationale: 'Complete road blockage on arterial route. High risk of electrocution.',
    assignedDepartment: 'PWD Delhi',
    aiActionPlan: '• Emergency Response: Dispatching NDRF tree-cutting team.\n• Utility Coordination: Power grid notified.\n• Estimated Clearance: 4-6 hours.',
    timeline: [
      { status: 'Reported', updatedAt: '2026-06-27T06:15:00Z', note: 'Issue reported with photo evidence.', updatedBy: 'Kavita Menon' },
      { status: 'Under Review', updatedAt: '2026-06-27T06:30:00Z', note: 'AI flagged as Critical.', updatedBy: 'AI Dispatcher' },
      { status: 'In Progress', updatedAt: '2026-06-27T07:10:00Z', note: 'Emergency crews arrived.', updatedBy: 'Site Supervisor' }
    ]
  },
  {
    id: 'seed-issue-2',
    title: 'Overflowing Toxic Garbage Dump in Residential Zone',
    description: 'The main community waste collection bin hasn\'t been cleared for over a week.',
    category: 'Waste Management',
    status: 'Reported',
    priority: 'High',
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'Rajpath Area, near India Gate Lawns',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    reportedBy: 'Aarav Sharma',
    reportedAt: '2026-06-26T14:45:00Z',
    votes: 82,
    votedBy: ['Aarav Sharma', 'Meera Rao', 'Siddharth Jain', 'Priya Singh'],
    verifiedBy: ['Meera Rao', 'Siddharth Jain'],
    priorityRationale: 'Severe public health risk due to rotting biological waste.',
    assignedDepartment: 'Sanitation & Waste Management',
    aiActionPlan: '• Clearance Request: Deploying compactor truck.\n• Sanitization: Scheduling bio-wash.',
    timeline: [
      { status: 'Reported', updatedAt: '2026-06-26T14:45:00Z', note: 'Multiple reports clustered.', updatedBy: 'Aarav Sharma' }
    ]
  },
  {
    id: 'seed-issue-3',
    title: 'Toxic Sewage Backflow Flooding Street',
    description: 'Sewage water overflowing from a choked manhole in a busy market street.',
    category: 'Water & Sanitation',
    status: 'Resolved',
    priority: 'Critical',
    latitude: 28.5677,
    longitude: 77.2433,
    address: 'Lajpat Nagar Central Market, Lane 4',
    imageUrl: 'https://images.unsplash.com/photo-1632125936737-251fcf549cb3?auto=format&fit=crop&q=80&w=800',
    resolutionImageUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&q=80&w=800',
    reportedBy: 'Rohan Patel',
    reportedAt: '2026-06-24T09:20:00Z',
    votes: 156,
    votedBy: ['Rohan Patel', 'Vikram Malhotra', 'Aarav Sharma'],
    verifiedBy: ['Market Association', 'Vikram Malhotra', 'Anjali Desai'],
    priorityRationale: 'Active sewage overflow in high-density commercial zone.',
    assignedDepartment: 'Delhi Jal Board',
    resolutionDetails: 'Main sewer line blockage cleared using high-pressure jetting machines.',
    aiActionPlan: '• Emergency Response: Dispatched Super Sucker machine.\n• Public Safety: Health department notified.',
    timeline: [
      { status: 'Reported', updatedAt: '2026-06-24T09:20:00Z', note: 'Emergency sewage overflow.', updatedBy: 'Rohan Patel' },
      { status: 'In Progress', updatedAt: '2026-06-24T10:15:00Z', note: 'DJB jetting truck arrived.', updatedBy: 'DJB Supervisor' },
      { status: 'Resolved', updatedAt: '2026-06-24T15:30:00Z', note: 'Blockage cleared and sanitized.', updatedBy: 'DJB Supervisor' }
    ]
  },
  {
    id: 'seed-issue-4',
    title: 'Exposed High-Voltage Live Wires Near Primary School',
    description: 'Electrical distribution box smashed open, live wires exposed near a school.',
    category: 'Electricity & Lighting',
    status: 'Under Review',
    priority: 'Critical',
    latitude: 28.6505,
    longitude: 77.2303,
    address: 'Chandni Chowk, near Town Hall',
    imageUrl: 'https://images.unsplash.com/photo-1542304910-c0b78d227db4?auto=format&fit=crop&q=80&w=800',
    reportedBy: 'Anjali Desai',
    reportedAt: '2026-06-27T07:10:00Z',
    votes: 34,
    votedBy: ['Anjali Desai', 'Suresh Kumar'],
    verifiedBy: ['Suresh Kumar'],
    priorityRationale: 'Lethal hazard near school children.',
    assignedDepartment: 'NDMC Utilities',
    aiActionPlan: '• Immediate Action: Auto-triggered grid shutdown.\n• Dispatch: Emergency repair crew mobilized.',
    timeline: [
      { status: 'Reported', updatedAt: '2026-06-27T07:10:00Z', note: 'Critical flagged report.', updatedBy: 'Anjali Desai' },
      { status: 'Under Review', updatedAt: '2026-06-27T07:12:00Z', note: 'Power supply suspended.', updatedBy: 'Grid Supervisor' }
    ]
  }
];

export const BADGES: Badge[] = [
  { id: 'badge-1', name: 'First Responder', description: 'Reported your first community issue.', icon: 'AlertTriangle', color: 'bg-amber-100 text-amber-700 border-amber-300', xpRequired: 10 },
  { id: 'badge-2', name: 'Streetlight Sentinel', description: 'Verify or report 3 electricity & lighting challenges.', icon: 'Lightbulb', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', xpRequired: 50 },
  { id: 'badge-3', name: 'Pothole Patrol', description: 'Report or upvote 5 road/traffic issues.', icon: 'Hammer', color: 'bg-blue-100 text-blue-700 border-blue-300', xpRequired: 100 },
  { id: 'badge-4', name: 'Eco Warrior', description: 'Resolved or reported 5 waste management issues.', icon: 'Leaf', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', xpRequired: 150 },
  { id: 'badge-5', name: 'Community Pillar', description: 'Reach Level 5 and verify 10 issues.', icon: 'Shield', color: 'bg-purple-100 text-purple-700 border-purple-300', xpRequired: 300 }
];

// LocalStorage helpers
const LOCAL_ISSUES_KEY = 'community_hero_local_issues';
const LOCAL_COMMENTS_KEY = 'community_hero_local_comments';

function getLocalIssues(): CommunityIssue[] {
  const data = localStorage.getItem(LOCAL_ISSUES_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_ISSUES_KEY, JSON.stringify(DEFAULT_ISSUES));
    return DEFAULT_ISSUES;
  }
  return JSON.parse(data);
}

function saveLocalIssues(issues: CommunityIssue[]) {
  localStorage.setItem(LOCAL_ISSUES_KEY, JSON.stringify(issues));
}

function getLocalComments(issueId?: string): IssueComment[] {
  const data = localStorage.getItem(LOCAL_COMMENTS_KEY);
  const comments: IssueComment[] = data ? JSON.parse(data) : [
    {
      id: 'seed-comment-1',
      issueId: 'seed-issue-1',
      author: 'David Kim',
      content: 'I almost hit this pothole yesterday on my bike. Highly dangerous!',
      createdAt: '2026-06-25T10:15:00Z'
    },
    {
      id: 'seed-comment-2',
      issueId: 'seed-issue-1',
      author: 'Sarah Jenkins',
      content: 'Thanks for putting up the safety cone markers, saw them this morning.',
      createdAt: '2026-06-26T08:00:00Z'
    }
  ];
  if (!data) {
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
  }
  if (issueId) {
    return comments.filter(c => c.issueId === issueId);
  }
  return comments;
}

function saveLocalComment(comment: IssueComment) {
  const comments = getLocalComments();
  comments.push(comment);
  localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
}

export async function seedDatabase() {
  return;
}

export async function fetchIssues(): Promise<CommunityIssue[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'issues'));
    const cloudIssues: CommunityIssue[] = [];
    querySnapshot.forEach((doc) => {
      cloudIssues.push({ id: doc.id, ...doc.data() } as CommunityIssue);
    });
    const isIndia = (lat: number, lng: number) => {
      return lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97;
    };
    const filteredIssues = cloudIssues.filter(i => isIndia(i.latitude, i.longitude));
    return filteredIssues.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

export async function createIssue(issue: Omit<CommunityIssue, 'id'>): Promise<string> {
  const tempId = `issue-${Date.now()}`;
  const localItem: CommunityIssue = { id: tempId, ...issue };

  const localList = getLocalIssues();
  saveLocalIssues([localItem, ...localList]);

  try {
    const docRef = await addDoc(collection(db, 'issues'), issue);
    const currentLocal = getLocalIssues();
    const updatedLocal = currentLocal.map(item => item.id === tempId ? { ...item, id: docRef.id } : item);
    saveLocalIssues(updatedLocal);
    return docRef.id;
  } catch (error) {
    console.warn('Error creating cloud issue:', error);
    return tempId;
  }
}

export async function updateIssueStatus(
  issueId: string,
  newStatus: 'Reported' | 'Under Review' | 'Scheduled' | 'In Progress' | 'Resolved',
  note: string,
  updatedBy: string,
  resolutionImageUrl?: string
): Promise<void> {
  const localList = getLocalIssues();
  const issueIndex = localList.findIndex(i => i.id === issueId);
  if (issueIndex !== -1) {
    const issueData = localList[issueIndex];
    const updatedTimeline = [
      ...issueData.timeline,
      { status: newStatus, updatedAt: new Date().toISOString(), note, updatedBy }
    ];
    localList[issueIndex] = {
      ...issueData,
      status: newStatus,
      timeline: updatedTimeline,
      ...(newStatus === 'Resolved' ? { resolutionDetails: note, resolutionImageUrl: resolutionImageUrl || issueData.resolutionImageUrl } : {})
    };
    saveLocalIssues(localList);
  }

  if (!issueId.startsWith('issue-')) {
    try {
      const issueRef = doc(db, 'issues', issueId);
      const issueSnap = await getDoc(issueRef);
      if (issueSnap.exists()) {
        const issueData = issueSnap.data() as CommunityIssue;
        const updatedTimeline = [
          ...issueData.timeline,
          { status: newStatus, updatedAt: new Date().toISOString(), note, updatedBy }
        ];
        const updateData: Partial<CommunityIssue> = { status: newStatus, timeline: updatedTimeline };
        if (newStatus === 'Resolved') {
          updateData.resolutionDetails = note;
          if (resolutionImageUrl) updateData.resolutionImageUrl = resolutionImageUrl;
        }
        await updateDoc(issueRef, updateData);
      }
    } catch (error) {
      console.warn('Error updating issue status in cloud:', error);
    }
  }
}

export async function toggleVoteIssue(issueId: string, userName: string): Promise<{ votes: number; voted: boolean }> {
  let votes = 0;
  let voted = false;

  const localList = getLocalIssues();
  const issueIndex = localList.findIndex(i => i.id === issueId);
  if (issueIndex !== -1) {
    const issueData = localList[issueIndex];
    const votedBy = issueData.votedBy || [];
    const index = votedBy.indexOf(userName);
    let newVotedBy = [...votedBy];
    if (index === -1) {
      newVotedBy.push(userName);
      votes = issueData.votes + 1;
      voted = true;
    } else {
      newVotedBy.splice(index, 1);
      votes = Math.max(0, issueData.votes - 1);
      voted = false;
    }
    localList[issueIndex] = { ...issueData, votes, votedBy: newVotedBy };
    saveLocalIssues(localList);
  }

  if (!issueId.startsWith('issue-')) {
    try {
      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, { votes, votedBy: localList[issueIndex]?.votedBy || [] });
    } catch (error) {
      console.warn('Error voting on cloud issue:', error);
    }
  }

  return { votes, voted };
}

export async function toggleVerifyIssue(issueId: string, userName: string): Promise<{ verified: boolean; count: number }> {
  let verified = false;
  let count = 0;

  const localList = getLocalIssues();
  const issueIndex = localList.findIndex(i => i.id === issueId);
  if (issueIndex !== -1) {
    const issueData = localList[issueIndex];
    const verifiedBy = issueData.verifiedBy || [];
    const index = verifiedBy.indexOf(userName);
    let newVerifiedBy = [...verifiedBy];
    if (index === -1) {
      newVerifiedBy.push(userName);
      verified = true;
    } else {
      newVerifiedBy.splice(index, 1);
      verified = false;
    }
    localList[issueIndex] = { ...issueData, verifiedBy: newVerifiedBy };
    saveLocalIssues(localList);
    count = newVerifiedBy.length;
  }

  return { verified, count };
}

export async function fetchComments(issueId: string): Promise<IssueComment[]> {
  try {
    const q = query(collection(db, 'comments'), where('issueId', '==', issueId), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    const cloudComments: IssueComment[] = [];
    querySnapshot.forEach((doc) => {
      cloudComments.push({ id: doc.id, ...doc.data() } as IssueComment);
    });
    return cloudComments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function addComment(issueId: string, author: string, content: string): Promise<IssueComment> {
  const tempCommentId = `comment-${Date.now()}`;
  const commentData: IssueComment = {
    id: tempCommentId, issueId, author, content, createdAt: new Date().toISOString()
  };

  saveLocalComment(commentData);

  if (!issueId.startsWith('issue-')) {
    try {
      const dataToSave: Omit<IssueComment, 'id'> = { issueId, author, content, createdAt: commentData.createdAt };
      const docRef = await addDoc(collection(db, 'comments'), dataToSave);
      const allComments = getLocalComments();
      const updatedComments = allComments.map(c => c.id === tempCommentId ? { ...c, id: docRef.id } : c);
      localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(updatedComments));
      return { id: docRef.id, ...dataToSave };
    } catch (error) {
      console.warn('Error adding comment to cloud:', error);
    }
  }

  return commentData;
}
