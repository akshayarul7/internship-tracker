'use client';

import { useState, useMemo, useCallback } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS } from '@/data/neetcode150';
import { generateDailySession, getDueProblems } from '@/lib/neetcode/scheduling';
import RecordAttemptModal from './RecordAttemptModal';
import type { NeetcodeProblem, SessionProblem } from '@/types/neetcode';
import {
  Play,
  Pause,
  CheckCircle,
  Circle,
  ArrowRight,
  ExternalLink,
  X,
  SkipForward,
  Brain,
  Sparkles,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PracticeSessionView() {
  const store = useNeetcodeStore();
  const { activeSession, progress, dailyPracticeConfig, currentPosition } = store;

  const [attemptProblem, setAttemptProblem] = useState<NeetcodeProblem | null>(null);

  const problemsMap = useMemo(() => {
    const map = new Map<string, NeetcodeProblem>();
    for (const p of NEETCODE_PROBLEMS) map.set(p.id, p);
    return map;
  }, []);

  const startDailySession = useCallback(() => {
    const sessionProblems = generateDailySession(
      progress,
      dailyPracticeConfig,
      currentPosition
    );
    if (sessionProblems.length === 0) {
      return; // Nothing to practice
    }
    store.startSession('daily', sessionProblems);
    store.touchActivity();
  }, [progress, dailyPracticeConfig, currentPosition, store]);

  const startReviewSession = useCallback(() => {
    const { dueToday, overdue } = getDueProblems(progress);
    const allDue = [...overdue, ...dueToday];
    if (allDue.length === 0) return;

    const sessionProblems: SessionProblem[] = allDue.slice(0, 10).map(id => ({
      problemId: id,
      type: 'review' as const,
      reason: overdue.includes(id) ? 'Overdue for review' : 'Due for review today',
      completed: false,
    }));

    store.startSession('review', sessionProblems);
    store.touchActivity();
  }, [progress, store]);

  const handleEndSession = useCallback(() => {
    if (activeSession && window.confirm('End this session? Your recorded attempts are already saved.')) {
      store.endSession();
    }
  }, [activeSession, store]);

  const handlePauseSession = useCallback(() => {
    store.pauseSession();
  }, [store]);

  const currentProblem = useMemo(() => {
    if (!activeSession) return null;
    const sp = activeSession.problems[activeSession.currentIndex];
    if (!sp) return null;
    return problemsMap.get(sp.problemId);
  }, [activeSession, problemsMap]);

  const currentSessionProblem = activeSession?.problems[activeSession.currentIndex];

  const sessionStats = useMemo(() => {
    if (!activeSession) return null;
    const completed = activeSession.problems.filter(p => p.completed).length;
    return {
      completed,
      total: activeSession.problems.length,
      remaining: activeSession.problems.length - completed,
    };
  }, [activeSession]);

  const { dueToday, overdue } = useMemo(() => getDueProblems(progress), [progress]);

  // If no active session, show the session launcher
  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-8 text-center">
          <Brain size={48} className="mx-auto mb-4 text-blue-500 opacity-70" />
          <h2 className="text-xl font-semibold mb-2">Practice Session</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-lg mx-auto">
            Start a practice session to review due problems and learn new ones from the roadmap.
            Each attempt is saved immediately — you can pause and resume anytime.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={startDailySession}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Sparkles size={18} />
              Start Daily Practice
            </button>

            {(dueToday.length + overdue.length > 0) && (
              <button
                onClick={startReviewSession}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium"
              >
                <ListChecks size={18} />
                Review Only ({dueToday.length + overdue.length} due)
              </button>
            )}
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            title="Review Queue"
            value={`${dueToday.length + overdue.length}`}
            subtitle={`${overdue.length} overdue, ${dueToday.length} due today`}
            color="amber"
          />
          <InfoCard
            title="Session Mix"
            value={`${dailyPracticeConfig.reviewPercentage}/${dailyPracticeConfig.newPercentage}`}
            subtitle="Review / New problems ratio"
            color="blue"
          />
          <InfoCard
            title="Next Problem"
            value={`#${currentPosition}`}
            subtitle={problemsMap.get(NEETCODE_PROBLEMS.find(p => p.order === currentPosition)?.id || '')?.name || 'Roadmap complete'}
            color="green"
          />
        </div>
      </div>
    );
  }

  // Active session view
  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              activeSession.type === 'daily' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              activeSession.type === 'review' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
            )}>
              <Brain size={20} />
            </div>
            <div>
              <h2 className="font-semibold capitalize">{activeSession.type} Session</h2>
              <p className="text-sm text-zinc-400">
                {sessionStats?.completed}/{sessionStats?.total} completed • {sessionStats?.remaining} remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseSession}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors"
            >
              <Pause size={14} />
              Pause
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X size={14} />
              End
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${sessionStats ? (sessionStats.completed / sessionStats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Problem Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Problem */}
        <div className="lg:col-span-2">
          {currentProblem && currentSessionProblem ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    currentSessionProblem.type === 'review' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    currentSessionProblem.type === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  )}>
                    {currentSessionProblem.type === 'review' ? '📝 Review' : currentSessionProblem.type === 'new' ? '🆕 New' : '🔄 Reactivation'}
                  </span>
                  <h3 className="text-xl font-semibold mt-2">
                    <span className="text-zinc-400 mr-2">#{currentProblem.order}</span>
                    {currentProblem.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className={cn(
                      'font-medium',
                      currentProblem.difficulty === 'Easy' ? 'text-green-600 dark:text-green-400' :
                      currentProblem.difficulty === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {currentProblem.difficulty}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-500">{currentProblem.category}</span>
                  </div>
                </div>
              </div>

              {/* Why this problem */}
              {currentSessionProblem.reason && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium">Why this problem: </span>
                  {currentSessionProblem.reason}
                </div>
              )}

              {/* Saved Notes (hidden initially for review, to test recall) */}
              {currentSessionProblem.type === 'review' && progress[currentProblem.id]?.keyApproach && (
                <details className="mb-4">
                  <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    Reveal your saved notes (try to recall first!)
                  </summary>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm space-y-1">
                    {progress[currentProblem.id]?.keyApproach && (
                      <p><strong>Approach:</strong> {progress[currentProblem.id]?.keyApproach}</p>
                    )}
                    {progress[currentProblem.id]?.timeComplexity && (
                      <p><strong>Time:</strong> <code>{progress[currentProblem.id]?.timeComplexity}</code></p>
                    )}
                    {progress[currentProblem.id]?.personalNotes && (
                      <p><strong>Notes:</strong> {progress[currentProblem.id]?.personalNotes}</p>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={currentProblem.leetcodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink size={14} />
                  Open on LeetCode
                </a>
                <button
                  onClick={() => setAttemptProblem(currentProblem)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <CheckCircle size={14} />
                  Record Attempt
                </button>
                <button
                  onClick={() => {
                    store.completeSessionProblem(currentSessionProblem.problemId);
                    store.advanceSession();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors text-sm"
                >
                  <SkipForward size={14} />
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-12 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Session Complete! 🎉</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Great work! You completed {sessionStats?.completed} out of {sessionStats?.total} problems.
              </p>
              <button
                onClick={() => store.endSession()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Finish Session
              </button>
            </div>
          )}
        </div>

        {/* Queue Sidebar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-4">
          <h3 className="font-medium text-sm mb-3 text-zinc-500">Session Queue</h3>
          <div className="space-y-2">
            {activeSession.problems.map((sp, i) => {
              const p = problemsMap.get(sp.problemId);
              if (!p) return null;
              const isCurrent = i === activeSession.currentIndex;
              return (
                <div
                  key={sp.problemId}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                    isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                    sp.completed ? 'opacity-50' : ''
                  )}
                >
                  {sp.completed ? (
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <ArrowRight size={16} className="text-blue-500 flex-shrink-0" />
                  ) : (
                    <Circle size={16} className="text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={cn('truncate', isCurrent && 'font-medium')}>
                    {p.name}
                  </span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
                    sp.type === 'review' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    sp.type === 'new' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                  )}>
                    {sp.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attempt Modal */}
      {attemptProblem && (
        <RecordAttemptModal
          problem={attemptProblem}
          onClose={() => setAttemptProblem(null)}
          sessionMode
          onRecorded={() => {
            if (currentSessionProblem) {
              store.completeSessionProblem(currentSessionProblem.problemId);
              store.advanceSession();
            }
            setAttemptProblem(null);
          }}
        />
      )}
    </div>
  );
}

function InfoCard({ title, value, subtitle, color }: {
  title: string;
  value: string;
  subtitle: string;
  color: 'amber' | 'blue' | 'green';
}) {
  const colors = {
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  return (
    <div className={cn('rounded-xl border p-4', colors[color])}>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
