'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS, NEETCODE_CATEGORIES } from '@/data/neetcode150';
import { getDueProblems, isInactive, generateDailySession, getReactivationProblems } from '@/lib/neetcode/scheduling';
import NeetcodeDashboard from '@/components/neetcode/NeetcodeDashboard';
import ProblemRoadmap from '@/components/neetcode/ProblemRoadmap';
import PracticeSessionView from '@/components/neetcode/PracticeSessionView';
import ReactivationView from '@/components/neetcode/ReactivationView';
import LearningInsights from '@/components/neetcode/LearningInsights';
import SettingsPanel from '@/components/neetcode/SettingsPanel';
import { LayoutDashboard, Map, Brain, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'roadmap' | 'practice' | 'insights' | 'settings';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'practice', label: 'Practice', icon: Brain },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function NeetcodePage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMounted, setIsMounted] = useState(false);

  const store = useNeetcodeStore();
  const { progress, lastActivityDate, reactivationConfig, activeSession } = store;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for inactivity / reactivation need
  const needsReactivation = useMemo(() => {
    if (!isMounted) return false;
    if (!lastActivityDate) return false;
    // Only show reactivation if there's actual progress to check
    const hasProgress = Object.keys(progress).length > 0;
    if (!hasProgress) return false;
    return isInactive(lastActivityDate, reactivationConfig.inactivityThresholdDays);
  }, [isMounted, lastActivityDate, progress, reactivationConfig.inactivityThresholdDays]);

  // Check if reactivation was recently dismissed
  const reactivationDismissed = useMemo(() => {
    if (!store.reactivationDismissedAt) return false;
    const dismissed = new Date(store.reactivationDismissedAt);
    const now = new Date();
    // Only dismiss for 24 hours
    return (now.getTime() - dismissed.getTime()) < 24 * 60 * 60 * 1000;
  }, [store.reactivationDismissedAt]);

  const showReactivation = needsReactivation && !reactivationDismissed;

  // Auto-switch to practice tab if there's an active session
  useEffect(() => {
    if (activeSession && activeTab !== 'practice') {
      setActiveTab('practice');
    }
  }, [activeSession, activeTab]);

  if (!isMounted) return null;

  // Show reactivation flow if needed
  if (showReactivation && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <ReactivationView onDismiss={() => {
            store.dismissReactivation();
          }} onComplete={() => {
            store.touchActivity();
            setActiveTab('dashboard');
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">NeetCode 150 Tracker</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track your DSA practice, review patterns, and master algorithms.
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border dark:border-zinc-800 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
                )}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <NeetcodeDashboard
            onStartPractice={() => setActiveTab('practice')}
            onViewRoadmap={() => setActiveTab('roadmap')}
          />
        )}
        {activeTab === 'roadmap' && <ProblemRoadmap />}
        {activeTab === 'practice' && <PracticeSessionView />}
        {activeTab === 'insights' && <LearningInsights />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
