'use client';

import { useMemo, useState } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS, NEETCODE_CATEGORIES } from '@/data/neetcode150';
import { isReviewOverdue, getDueProblems, getRecallDescription } from '@/lib/neetcode/scheduling';
import ProblemDetailModal from './ProblemDetailModal';
import RecordAttemptModal from './RecordAttemptModal';
import type { NeetcodeProblem } from '@/types/neetcode';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Eye,
  TrendingUp,
  Clock,
  Target,
  BarChart2,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LearningInsights() {
  const { progress, sessionHistory } = useNeetcodeStore();
  const [selectedProblem, setSelectedProblem] = useState<NeetcodeProblem | null>(null);
  const [attemptProblem, setAttemptProblem] = useState<NeetcodeProblem | null>(null);

  const problemsMap = useMemo(() => {
    const map = new Map<string, NeetcodeProblem>();
    for (const p of NEETCODE_PROBLEMS) map.set(p.id, p);
    return map;
  }, []);

  // 1. Solve quality breakdown
  const solveQuality = useMemo(() => {
    const vals = Object.values(progress);
    const independent = vals.filter(p => p.hasSolvedIndependently).length;
    const withHints = vals.filter(p => p.hasSolvedWithHints && !p.hasSolvedIndependently).length;
    const solutionViewed = vals.filter(p => p.hasSolutionViewed && !p.hasSolvedIndependently && !p.hasSolvedWithHints).length;
    const attemptedOnly = vals.filter(p => p.hasAttempted && !p.hasSolvedIndependently && !p.hasSolvedWithHints && !p.hasSolutionViewed).length;
    const totalAttempted = independent + withHints + solutionViewed + attemptedOnly;

    return {
      independent,
      withHints,
      solutionViewed,
      attemptedOnly,
      totalAttempted,
      independentPct: totalAttempted > 0 ? Math.round((independent / totalAttempted) * 100) : 0,
      withHintsPct: totalAttempted > 0 ? Math.round((withHints / totalAttempted) * 100) : 0,
      solutionViewedPct: totalAttempted > 0 ? Math.round((solutionViewed / totalAttempted) * 100) : 0,
      attemptedOnlyPct: totalAttempted > 0 ? Math.round((attemptedOnly / totalAttempted) * 100) : 0,
    };
  }, [progress]);

  // 2. Pattern understanding
  const patternStats = useMemo(() => {
    const vals = Object.values(progress);
    const attempted = vals.filter(p => p.hasAttempted);
    const understands = attempted.filter(p => p.understandsPattern).length;
    return {
      understands,
      total: attempted.length,
      pct: attempted.length > 0 ? Math.round((understands / attempted.length) * 100) : 0,
    };
  }, [progress]);

  // 3. Category strengths & weaknesses
  const categoryAnalysis = useMemo(() => {
    const analysis = NEETCODE_CATEGORIES.map(category => {
      const categoryProblems = NEETCODE_PROBLEMS.filter(p => p.category === category);
      const total = categoryProblems.length;
      let attempted = 0;
      let solved = 0;
      let independent = 0;
      let recallSum = 0;
      let recallCount = 0;

      for (const p of categoryProblems) {
        const prog = progress[p.id];
        if (prog?.hasAttempted) {
          attempted++;
          if (prog.hasSolvedIndependently || prog.hasSolvedWithHints) solved++;
          if (prog.hasSolvedIndependently) independent++;
          if (prog.lastRecallRating) {
            recallSum += prog.lastRecallRating;
            recallCount++;
          }
        }
      }

      const avgRecall = recallCount > 0 ? recallSum / recallCount : null;

      return {
        category,
        total,
        attempted,
        solved,
        independent,
        avgRecall,
        recallCount,
      };
    });

    const categoriesWithActivity = analysis.filter(a => a.attempted > 0);
    const strongCategories = [...categoriesWithActivity]
      .filter(a => a.avgRecall !== null && a.avgRecall >= 3)
      .sort((a, b) => (b.avgRecall ?? 0) - (a.avgRecall ?? 0));
    const weakCategories = [...categoriesWithActivity]
      .filter(a => a.avgRecall !== null && a.avgRecall < 3)
      .sort((a, b) => (a.avgRecall ?? 0) - (b.avgRecall ?? 0));

    return {
      all: analysis,
      strong: strongCategories,
      weak: weakCategories,
    };
  }, [progress]);

  // 4. Frequently forgotten or struggling problems
  const strugglingProblems = useMemo(() => {
    const list: { problem: NeetcodeProblem; prog: (typeof progress)[string]; reason: string; severity: number }[] = [];

    for (const p of NEETCODE_PROBLEMS) {
      const prog = progress[p.id];
      if (!prog || !prog.hasAttempted) continue;

      let lowRecallCount = 0;
      for (const att of prog.attempts) {
        if (att.recallRating && att.recallRating <= 2) lowRecallCount++;
      }
      for (const rev of prog.reviews) {
        if (rev.recallRating <= 2) lowRecallCount++;
      }

      if (prog.lastRecallRating === 1) {
        list.push({
          problem: p,
          prog,
          reason: 'Last recall was forgotten (1/4)',
          severity: 4,
        });
      } else if (lowRecallCount >= 2) {
        list.push({
          problem: p,
          prog,
          reason: `Struggled in ${lowRecallCount} past reviews/attempts`,
          severity: 3,
        });
      } else if (prog.lastRecallRating === 2) {
        list.push({
          problem: p,
          prog,
          reason: 'Last recall was weak (2/4)',
          severity: 2,
        });
      } else if (prog.needsReview) {
        list.push({
          problem: p,
          prog,
          reason: 'Manually flagged for review',
          severity: 1,
        });
      }
    }

    return list.sort((a, b) => b.severity - a.severity).slice(0, 8);
  }, [progress]);

  // 5. Overdue problems queue
  const { overdue: overdueIds } = useMemo(() => getDueProblems(progress), [progress]);

  const overdueProblems = useMemo(() => {
    return overdueIds
      .map(id => {
        const prob = problemsMap.get(id);
        const prog = progress[id];
        if (!prob || !prog || !prog.nextReviewDate) return null;
        const days = Math.floor((Date.now() - new Date(prog.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24));
        return {
          problem: prob,
          prog,
          daysOverdue: Math.max(1, days),
        };
      })
      .filter((x): x is { problem: NeetcodeProblem; prog: (typeof progress)[string]; daysOverdue: number } => x !== null)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [overdueIds, problemsMap, progress]);

  // 6. Recent review performance
  const reviewPerformance = useMemo(() => {
    const allReviews: { timestamp: string; recallRating: number; problemId: string }[] = [];
    for (const [id, prog] of Object.entries(progress)) {
      for (const rev of prog.reviews) {
        allReviews.push({ timestamp: rev.timestamp, recallRating: rev.recallRating, problemId: id });
      }
    }
    allReviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recent = allReviews.slice(0, 15);
    const avgRecent = recent.length > 0 ? (recent.reduce((sum, r) => sum + r.recallRating, 0) / recent.length) : null;

    return {
      totalReviews: allReviews.length,
      recent,
      avgRecent,
    };
  }, [progress]);

  const hasActivity = Object.keys(progress).length > 0;

  if (!hasActivity) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed dark:border-zinc-800 p-12 text-center">
        <BarChart2 size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
        <h3 className="text-lg font-semibold mb-2">No Learning Data Yet</h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          As you practice problems and log your recall ratings, this page will surface insights
          on your strengths, weak patterns, overdue reviews, and retention performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Independence Rate */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Independent Solves</span>
            <Target size={20} className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold">{solveQuality.independentPct}%</p>
          <p className="text-xs text-zinc-400 mt-1">
            {solveQuality.independent} independent / {solveQuality.totalAttempted} attempted
          </p>
          <div className="mt-3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
            <div style={{ width: `${solveQuality.independentPct}%` }} className="bg-green-500" title="Independent" />
            <div style={{ width: `${solveQuality.withHintsPct}%` }} className="bg-blue-400" title="With hints" />
            <div style={{ width: `${solveQuality.solutionViewedPct}%` }} className="bg-amber-400" title="Solution viewed" />
            <div style={{ width: `${solveQuality.attemptedOnlyPct}%` }} className="bg-orange-400" title="Attempted only" />
          </div>
        </div>

        {/* Pattern Mastery */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pattern Mastery</span>
            <Brain size={20} className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold">{patternStats.pct}%</p>
          <p className="text-xs text-zinc-400 mt-1">
            {patternStats.understands} of {patternStats.total} attempted problems understood
          </p>
          <div className="mt-3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div style={{ width: `${patternStats.pct}%` }} className="bg-purple-500 h-full rounded-full transition-all" />
          </div>
        </div>

        {/* Recent Review Retention */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Review Retention</span>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          <p className="text-3xl font-bold">
            {reviewPerformance.avgRecent ? `${reviewPerformance.avgRecent.toFixed(1)}/4` : 'N/A'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {reviewPerformance.totalReviews} total reviews logged
          </p>
          <div className="mt-3 flex items-center gap-1">
            {reviewPerformance.recent.slice(0, 10).map((r, i) => (
              <span
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full inline-block',
                  r.recallRating === 4 ? 'bg-green-500' :
                  r.recallRating === 3 ? 'bg-blue-400' :
                  r.recallRating === 2 ? 'bg-amber-400' : 'bg-red-500'
                )}
                title={`Rating: ${r.recallRating}/4`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Solves Quality Breakdown Details */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Solve Quality Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium text-sm mb-1">
              <CheckCircle size={16} /> Independent
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">{solveQuality.independent}</p>
            <p className="text-xs text-green-600 dark:text-green-400">{solveQuality.independentPct}% of attempts</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-sm mb-1">
              <HelpCircle size={16} /> With Hints
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{solveQuality.withHints}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">{solveQuality.withHintsPct}% of attempts</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium text-sm mb-1">
              <Eye size={16} /> Solution Viewed
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{solveQuality.solutionViewed}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{solveQuality.solutionViewedPct}% of attempts</p>
          </div>

          <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 font-medium text-sm mb-1">
              <AlertTriangle size={16} /> Attempted Only
            </div>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{solveQuality.attemptedOnly}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">{solveQuality.attemptedOnlyPct}% of attempts</p>
          </div>
        </div>
      </div>

      {/* Category Strengths vs Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Categories */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">
            <Sparkles size={18} /> Strong Recall Categories
          </h3>
          {categoryAnalysis.strong.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No categories with high recall rating yet. Practice more to reveal strengths.</p>
          ) : (
            <div className="space-y-3">
              {categoryAnalysis.strong.map(c => (
                <div key={c.category} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{c.category}</p>
                    <p className="text-xs text-zinc-400">{c.solved}/{c.total} solved ({c.independent} independently)</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full font-semibold text-xs">
                    {c.avgRecall?.toFixed(1)}/4 avg recall
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Categories */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} /> Weak / Struggling Categories
          </h3>
          {categoryAnalysis.weak.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No weak categories detected. Great job keeping your recall high!</p>
          ) : (
            <div className="space-y-3">
              {categoryAnalysis.weak.map(c => (
                <div key={c.category} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{c.category}</p>
                    <p className="text-xs text-zinc-400">{c.solved}/{c.total} solved ({c.attempted} attempted)</p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full font-semibold text-xs">
                    {c.avgRecall?.toFixed(1)}/4 avg recall
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Frequently Forgotten Problems */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Frequently Forgotten / At-Risk Problems</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Problems where you struggled or rated your recall as weak. Prioritize these for extra review.
        </p>

        {strugglingProblems.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-4">No struggling problems found! Keep up the great work.</p>
        ) : (
          <div className="divide-y dark:divide-zinc-800">
            {strugglingProblems.map(({ problem, prog, reason }) => (
              <div key={problem.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProblem(problem)}
                      className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate text-left"
                    >
                      #{problem.order} {problem.name}
                    </button>
                    <span className="text-xs text-zinc-400 hidden sm:inline">({problem.category})</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAttemptProblem(problem)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    Practice Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue Queue */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Overdue Review Queue ({overdueProblems.length})</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          These problems have passed their scheduled spaced repetition interval.
        </p>

        {overdueProblems.length === 0 ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            All reviews are up to date! There are no overdue problems right now.
          </div>
        ) : (
          <div className="divide-y dark:divide-zinc-800">
            {overdueProblems.map(({ problem, prog, daysOverdue }) => (
              <div key={problem.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProblem(problem)}
                      className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate text-left"
                    >
                      #{problem.order} {problem.name}
                    </button>
                    <span className="text-xs text-zinc-400 hidden sm:inline">({problem.category})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                    <span className="text-red-500 font-medium">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                    {prog.lastRecallRating && (
                      <span>Last recall: {getRecallDescription(prog.lastRecallRating)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAttemptProblem(problem)}
                    className="px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedProblem && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onLogAttempt={() => {
            setAttemptProblem(selectedProblem);
            setSelectedProblem(null);
          }}
        />
      )}
      {attemptProblem && (
        <RecordAttemptModal
          problem={attemptProblem}
          onClose={() => setAttemptProblem(null)}
        />
      )}
    </div>
  );
}
