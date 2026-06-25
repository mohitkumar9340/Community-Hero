import { CheckCircle2, AlertTriangle, ShieldCheck, HeartHandshake, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { CommunityIssue } from '../types';
import { motion } from 'framer-motion';

interface DashboardStatsProps {
  issues: CommunityIssue[];
  isAdmin?: boolean;
  department?: string;
}

const CardItem = ({ delay, title, value, subValue, icon: Icon, colorClass, trend, trendLabel, bgClass }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2 flex items-baseline gap-1">
            {value}
            {subValue && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{subValue}</span>}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(trend || trendLabel) && (
        <div className="mt-4 flex items-center gap-2">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-500" />}
          {trend === 'neutral' && <Activity className="h-4 w-4 text-slate-400" />}
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {trendLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default function DashboardStats({ issues, isAdmin = false, department = '' }: DashboardStatsProps) {
  if (isAdmin) {
    // Admin specific stats
    const deptIssues = issues.filter(i => i.assignedDepartment === department);
    const totalReports = deptIssues.length;
    const pendingDispatch = deptIssues.filter(i => i.status === 'Reported' || i.status === 'Under Review').length;
    
    // SLA Breaches: Unresolved and either critical/high priority, or reported > 48h ago
    const isSlaBreached = (i: CommunityIssue) => {
      if (i.status === 'Resolved') return false;
      if (i.priority === 'Critical' || i.priority === 'High') return true;
      const hoursSinceReport = (Date.now() - new Date(i.reportedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceReport > 48;
    };
    const slaBreaches = deptIssues.filter(isSlaBreached).length;

    // Avg resolution time for department
    const resolvedIssues = deptIssues.filter(i => i.status === 'Resolved' && (i.timeline || []).length > 0);
    let totalResolutionTimeMs = 0;
    resolvedIssues.forEach(i => {
      const start = new Date(i.reportedAt).getTime();
      const resolveEvent = (i.timeline || []).find(t => t.status === 'Resolved');
      if (resolveEvent) {
        const end = new Date(resolveEvent.updatedAt).getTime();
        totalResolutionTimeMs += (end - start);
      }
    });
    const avgResolutionTimeDays = resolvedIssues.length > 0 
      ? (totalResolutionTimeMs / resolvedIssues.length / (1000 * 60 * 60 * 24)).toFixed(1)
      : 'N/A';

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
        <CardItem
          delay={0}
          title="Dept Workload"
          value={totalReports}
          icon={AlertTriangle}
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/30"
          trend="neutral"
          trendLabel={`${department} assigned tickets`}
        />
        <CardItem
          delay={1}
          title="Pending Review"
          value={pendingDispatch}
          icon={Activity}
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50 dark:bg-amber-900/30"
          trend={pendingDispatch > 3 ? 'up' : 'neutral'}
          trendLabel="Awaiting action plan/review"
        />
        <CardItem
          delay={2}
          title="SLA Breaches"
          value={slaBreaches}
          icon={ShieldCheck}
          colorClass={slaBreaches > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
          bgClass={slaBreaches > 0 ? "bg-rose-50 dark:bg-rose-900/30" : "bg-emerald-50 dark:bg-emerald-900/30"}
          trend={slaBreaches > 0 ? 'up' : 'neutral'}
          trendLabel={slaBreaches > 0 ? 'SLA Alert: Action required' : 'All targets healthy'}
        />
        <CardItem
          delay={3}
          title="Avg Resolution"
          value={avgResolutionTimeDays}
          subValue={avgResolutionTimeDays !== 'N/A' ? "days" : ""}
          icon={Clock}
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50 dark:bg-blue-900/30"
          trend="down"
          trendLabel="Target resolution under 48h"
        />
      </div>
    );
  }

  // 1. Problems Reported
  const totalReports = issues.length;

  // 2. Verified Issues
  const verifiedReports = issues.filter(i => (i.verifiedBy?.length || 0) > 0).length;

  // 3. Resolved Issues
  const resolvedReports = issues.filter(i => i.status === 'Resolved').length;

  // 4. Average Resolution Time (in days)
  const resolvedIssuesWithTime = issues.filter(i => i.status === 'Resolved' && (i.timeline || []).length > 0);
  let totalResolutionTimeMs = 0;
  resolvedIssuesWithTime.forEach(i => {
    const start = new Date(i.reportedAt).getTime();
    // find resolved event
    const resolveEvent = (i.timeline || []).find(t => t.status === 'Resolved');
    if (resolveEvent) {
      const end = new Date(resolveEvent.updatedAt).getTime();
      totalResolutionTimeMs += (end - start);
    }
  });
  const avgResolutionTimeDays = resolvedIssuesWithTime.length > 0 
    ? (totalResolutionTimeMs / resolvedIssuesWithTime.length / (1000 * 60 * 60 * 24)).toFixed(1)
    : 'N/A';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
      <CardItem
        delay={0}
        title="Problems Reported"
        value={totalReports}
        icon={AlertTriangle}
        colorClass="text-rose-600 dark:text-rose-400"
        bgClass="bg-rose-50 dark:bg-rose-900/30"
        trend="up"
        trendLabel="Active community reporting"
      />
      <CardItem
        delay={1}
        title="Verified"
        value={verifiedReports}
        icon={ShieldCheck}
        colorClass="text-blue-600 dark:text-blue-400"
        bgClass="bg-blue-50 dark:bg-blue-900/30"
        trend="up"
        trendLabel="Double-checked by citizens"
      />
      <CardItem
        delay={2}
        title="Resolved"
        value={resolvedReports}
        icon={CheckCircle2}
        colorClass="text-emerald-600 dark:text-emerald-400"
        bgClass="bg-emerald-50 dark:bg-emerald-900/30"
        trend="up"
        trendLabel="Fixed by municipal crew"
      />
      <CardItem
        delay={3}
        title="Avg Resolution"
        value={avgResolutionTimeDays}
        subValue="days"
        icon={Clock}
        colorClass="text-amber-600 dark:text-amber-400"
        bgClass="bg-amber-50 dark:bg-amber-900/30"
        trend="down"
        trendLabel="Faster than 3 day SLA"
      />
    </div>
  );
}
