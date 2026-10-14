'use client';

import { useState, useMemo, useCallback } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS } from '@/data/neetcode150';
import {
  getReactivationProblems,
  getRecommendationAfterReactivation,
} from '@/lib/neetcode/scheduling';
import RecordAttemptModal from './RecordAttemptModal';
import type { NeetcodeProblem, RecallRating, SessionProblem } from '@/types/neetcode';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Brain,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReactivationViewProps {
  onDismiss: () => void;
  onComplete: () => void;
}

export default function ReactivationView({ onDismiss, onComplete }: ReactivationViewProps) {
  const store = useNeetcodeStore();
  const { progress, reactivationConfig, activeSession } = store;

  const [stage, setStage] = useState<'intro' | 'session' | 'results'>('intro');
  const [attemptProblem, setAttemptProblem] = useState<NeetcodeProblem | null>(null);
  const [reactivationResults, setReactivationResults] = useState<{ problemId: string; recallRating: RecallRating }[]>([]);

  const problemsMap = useMemo(() => {
    const map = new Map<string, NeetcodeProblem>();
    for (const p of NEETCODE_PROBLEMS) map.set(p.id, p);
    return map;
  }, []);

  // Get recommended reactivation problems
  const reactivationProblems = useMemo(() => {
    return getReactivationProblems(
      progress,
      reactivationConfig.diagnosticProblemCount
    );
  }, [progress, reactivationConfig.diagnosticProblemCount]);

  const daysSinceActivity = useMemo(() => {
    if (!store.lastActivityDate) return 0;
    const diff = Date.now() - new Date(store.lastActivityDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [store.lastActivityDate]);

  const startReactivation = useCallback(() => {
    const sessionProblems: SessionProblem[] = reactivationProblems.map(rp => ({
      problemId: rp.problemId,
      type: 'reactivation' as const,
      reason: rp.reason,
      completed: false,
    }));

    store.startSession('reactivation', sessionProblems);
    store.touchActivity();
    setStage('session');
  }, [reactivationProblems, store]);

  const handleAttemptRecorded = useCallback((problemId: string) => {
    if (!activeSession) return;

    const prog = store.progress[problemId];
    const rating = prog?.lastRecallRating || 2;

    setReactivationResults(prev => [...prev, { problemId, recallRating: rating }]);
    store.completeSessionProblem(problemId);
    store.advanceSession();

    // Check if session is complete
    const currentIdx = activeSession.currentIndex;
    if (currentIdx >= activeSession.problems.length - 1) {
      setStage('results');
    }
  }, [activeSession, store]);

  const recommendation = useMemo(() => {
    if (reactivationResults.length === 0) return null;
    return getRecommendationAfterReactivation(progress, reactivationResults);
  }, [progress, reactivationResults]);

  const finishReactivation = useCallback(() => {
    store.endSession();
    onComplete();
  }, [store, onComplete]);

  // Intro stage
  if (stage === 'intro') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-4">
            <RefreshCw size={32} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            It&apos;s been <span className="font-semibold text-amber-600 dark:text-amber-400">{daysSinceActivity} days</span> since
            your last practice session. Let&apos;s do a quick diagnostic to see where you stand.
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Your progress is safe!</p>
            <p className="text-amber-700 dark:text-amber-300">
              This is a short assessment to gauge your recall — not a reset.
              All your previous completions, notes, and progress are preserved.
              We&apos;ll select {reactivationConfig.diagnosticProblemCount} problems from topics you&apos;ve studied
              to help you warm up.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-sm font-medium">What happens next:</p>
          <ul className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
            <li className="flex items-center gap-2"><span className="text-blue-500">1.</span> Try to solve {reactivationConfig.diagnosticProblemCount} previously studied problems from memory</li>
            <li className="flex items-center gap-2"><span className="text-blue-500">2.</span> Rate your recall for each one</li>
            <li className="flex items-center gap-2"><span className="text-blue-500">3.</span> Get a personalized recommendation on what to review vs. learn next</li>
          </ul>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onDismiss}
            className="px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors text-sm"
          >
            Skip for Now
          </button>
          <button
            onClick={startReactivation}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Diagnostic
          </button>
        </div>
      </div>
    );
  }

  // Session stage
  if (stage === 'session' && activeSession) {
    const currentIdx = activeSession.currentIndex;
    const sp = activeSession.problems[currentIdx];
    const currentProblem = sp ? problemsMap.get(sp.problemId) : null;
    const completed = activeSession.problems.filter(p => p.completed).length;

    if (!currentProblem || !sp) {
      // All problems done, move to results
      if (stage === 'session') setStage('results');
      return null;
    }

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Progress header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              <RefreshCw size={18} className="text-purple-500" />
              Reactivation Assessment
            </h2>
            <span className="text-sm text-zinc-400">{completed + 1} of {activeSession.problems.length}</span>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(completed / activeSession.problems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current problem */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
            🔄 Reactivation
          </span>
          <h3 className="text-xl font-semibold mt-3">
            <span className="text-zinc-400 mr-2">#{currentProblem.order}</span>
            {currentProblem.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className={cn(
              'font-medium',
              currentProblem.difficulty === 'Easy' ? 'text-green-600' :
              currentProblem.difficulty === 'Medium' ? 'text-amber-600' : 'text-red-600'
            )}>
              {currentProblem.difficulty}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-500">{currentProblem.category}</span>
          </div>

          {sp.reason && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
              <span className="font-medium">Selected because: </span>{sp.reason}
            </p>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4 italic">
            Try to recall and solve this problem from memory before checking your notes.
          </p>

          {/* Saved notes - hidden behind disclosure */}
          {progress[currentProblem.id]?.keyApproach && (
            <details className="mt-4">
              <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                Reveal your saved notes
              </summary>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm space-y-1">
                {progress[currentProblem.id]?.keyApproach && (
                  <p><strong>Approach:</strong> {progress[currentProblem.id]?.keyApproach}</p>
                )}
                {progress[currentProblem.id]?.personalNotes && (
                  <p><strong>Notes:</strong> {progress[currentProblem.id]?.personalNotes}</p>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={currentProblem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors text-sm"
            >
              <ExternalLink size={14} />
              Open on LeetCode
            </a>
            <button
              onClick={() => setAttemptProblem(currentProblem)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <CheckCircle size={14} />
              Record Result
            </button>
          </div>
        </div>

        {attemptProblem && (
          <RecordAttemptModal
            problem={attemptProblem}
            onClose={() => setAttemptProblem(null)}
            sessionMode
            onRecorded={(problemId) => {
              handleAttemptRecorded(problemId);
              setAttemptProblem(null);
            }}
          />
        )}
      </div>
    );
  }

  // Results stage
  if (stage === 'results') {
    const avgRecall = reactivationResults.length > 0
      ? reactivationResults.reduce((sum, r) => sum + r.recallRating, 0) / reactivationResults.length
      : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4">
              <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Here&apos;s how you did on your {reactivationResults.length} diagnostic problems.
            </p>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold">{reactivationResults.length}</p>
              <p className="text-xs text-zinc-400">Assessed</p>
            </div>
            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold">{avgRecall.toFixed(1)}</p>
              <p className="text-xs text-zinc-400">Avg Recall</p>
            </div>
            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <p className="text-2xl font-bold">{reactivationResults.filter(r => r.recallRating >= 3).length}</p>
              <p className="text-xs text-zinc-400">Strong Recall</p>
            </div>
          </div>

          {/* Individual results */}
          <div className="space-y-2 mb-6">
            {reactivationResults.map(r => {
              const p = problemsMap.get(r.problemId);
              return (
                <div key={r.problemId} className="flex items-center justify-between py-2 border-b dark:border-zinc-800 last:border-0 text-sm">
                  <span className="font-medium">{p?.name || r.problemId}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    r.recallRating >= 3
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : r.recallRating === 2
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  )}>
                    {r.recallRating}/4
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div className={cn(
              'rounded-lg p-4 mb-6',
              recommendation.shouldReviewMore
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            )}>
              <p className="font-medium text-sm mb-1">
                {recommendation.shouldReviewMore ? '📝 Recommendation: Review More' : '🚀 Recommendation: Continue Learning'}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{recommendation.message}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={finishReactivation}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
