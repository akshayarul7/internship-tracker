'use client';

import { useMemo } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS, NEETCODE_CATEGORIES } from '@/data/neetcode150';
import { getDueProblems } from '@/lib/neetcode/scheduling';
import {
  CheckCircle,
  Target,
  Brain,
  AlertTriangle,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  Code2,
  Trash2,
} from 'lucide-react';
import type { NeetcodeStats, Difficulty } from '@/types/neetcode';

interface NeetcodeDashboardProps {
  onStartPractice: () => void;
  onViewRoadmap: () => void;
}

export default function NeetcodeDashboard({ onStartPractice, onViewRoadmap }: NeetcodeDashboardProps) {
  const { progress, currentPosition, sessionHistory, activeSession, deleteSessionHistoryEntry, clearSessionHistory } = useNeetcodeStore();

  const stats: NeetcodeStats = useMemo(() => {
    const progressValues = Object.values(progress);
    const solvedIndependently = progressValues.filter(p => p.hasSolvedIndependently).length;
    const solvedWithHints = progressValues.filter(p => p.hasSolvedWithHints && !p.hasSolvedIndependently).length;
    const attempted = progressValues.filter(p => p.hasAttempted && !p.hasSolvedIndependently && !p.hasSolvedWithHints).length;
    const needsReview = progressValues.filter(p => p.needsReview).length;

    const byDifficulty: Record<Difficulty, { total: number; solved: number }> = {
      Easy: { total: 0, solved: 0 },
      Medium: { total: 0, solved: 0 },
      Hard: { total: 0, solved: 0 },
    };

    const byCategory: Record<string, { total: number; solved: number }> = {};

    for (const problem of NEETCODE_PROBLEMS) {
      byDifficulty[problem.difficulty].total++;
      if (!byCategory[problem.category]) {
        byCategory[problem.category] = { total: 0, solved: 0 };
      }
      byCategory[problem.category].total++;

      const prog = progress[problem.id];
      if (prog?.hasSolvedIndependently || prog?.hasSolvedWithHints) {
        byDifficulty[problem.difficulty].solved++;
        byCategory[problem.category].solved++;
      }
    }

    const { dueToday, overdue } = getDueProblems(progress);

    return {
      totalProblems: 150,
      solvedCount: solvedIndependently + solvedWithHints,
      solvedIndependentlyCount: solvedIndependently,
      solvedWithHintsCount: solvedWithHints,
      attemptedCount: attempted,
      needsReviewCount: needsReview,
      dueForReviewCount: dueToday.length + overdue.length,
      byDifficulty,
      byCategory,
    };
  }, [progress]);

  const { dueToday, overdue } = useMemo(() => getDueProblems(progress), [progress]);

  const completionPct = Math.round((stats.solvedCount / 150) * 100);

  // Recent activity (last 7 sessions)
  const recentSessions = useMemo(() => {
    return [...sessionHistory].reverse().slice(0, 7);
  }, [sessionHistory]);

  // Find the next problem in the roadmap
  const nextProblem = useMemo(() => {
    return NEETCODE_PROBLEMS.find(p => p.order === currentPosition);
  }, [currentPosition]);

  const hasProgress = Object.keys(progress).length > 0;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Completed</p>
            <p className="text-2xl font-bold">{stats.solvedCount}<span className="text-base font-normal text-zinc-400"> / 150</span></p>
            <p className="text-xs text-zinc-400">{completionPct}% complete</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Independent Solves</p>
            <p className="text-2xl font-bold">{stats.solvedIndependentlyCount}</p>
            <p className="text-xs text-zinc-400">{stats.solvedWithHintsCount} with assistance</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
            <Brain size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Due for Review</p>
            <p className="text-2xl font-bold">{dueToday.length}</p>
            <p className="text-xs text-zinc-400">{overdue.length} overdue</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Attempted</p>
            <p className="text-2xl font-bold">{stats.attemptedCount}</p>
            <p className="text-xs text-zinc-400">{stats.needsReviewCount} need review</p>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onStartPractice}
          className="bg-blue-600 text-white p-6 rounded-xl shadow-sm hover:bg-blue-700 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Play size={20} />
                <span className="text-lg font-semibold">
                  {activeSession ? 'Continue Session' : "Start Today's Practice"}
                </span>
              </div>
              <p className="text-blue-200 text-sm">
                {activeSession
                  ? `${activeSession.problems.filter(p => p.completed).length}/${activeSession.problems.length} problems done`
                  : dueToday.length + overdue.length > 0
                    ? `${dueToday.length + overdue.length} reviews + new problems`
                    : 'Learn new problems from the roadmap'}
              </p>
            </div>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={onViewRoadmap}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="text-lg font-semibold">Resume Where I Left Off</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                {nextProblem
                  ? `Next: #${nextProblem.order} ${nextProblem.name} (${nextProblem.category})`
                  : 'All problems completed! 🎉'}
              </p>
            </div>
            <ArrowRight size={20} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {overdue.length} overdue review{overdue.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              These problems are past their scheduled review date. Review them to strengthen your recall.
            </p>
          </div>
        </div>
      )}

      {/* Progress by Category */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Progress by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {NEETCODE_CATEGORIES.map((cat) => {
            const catStats = stats.byCategory[cat] || { total: 0, solved: 0 };
            const pct = catStats.total > 0 ? Math.round((catStats.solved / catStats.total) * 100) : 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate font-medium">{cat}</span>
                    <span className="text-zinc-400 ml-2 flex-shrink-0">{catStats.solved}/{catStats.total}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          {recentSessions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all session history?')) {
                  clearSessionHistory();
                }
              }}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>No practice sessions yet. Start your first session!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b dark:border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    session.type === 'daily' ? 'bg-blue-500' :
                    session.type === 'review' ? 'bg-amber-500' : 'bg-purple-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium capitalize">{session.type} Session</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.problemsCompleted}/{session.problemsAttempted}</p>
                    <p className="text-xs text-zinc-400">problems</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this practice session entry?')) {
                        deleteSessionHistoryEntry(session.id);
                      }
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete session log"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!hasProgress && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed dark:border-zinc-800 p-12 text-center">
          <Code2 className="mx-auto mb-4 text-zinc-300 dark:text-zinc-600" size={48} />
          <h3 className="text-lg font-semibold mb-2">Ready to Start?</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
            Begin your NeetCode 150 journey. Track your progress, review patterns with spaced repetition,
            and build lasting algorithm knowledge.
          </p>
          <button
            onClick={onStartPractice}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Play size={18} />
            Start First Session
          </button>
        </div>
      )}
    </div>
  );
}


