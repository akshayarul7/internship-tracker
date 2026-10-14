'use client';

import { useState, useMemo } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import { NEETCODE_PROBLEMS, NEETCODE_CATEGORIES } from '@/data/neetcode150';
import { isReviewDue, isReviewOverdue, getRecallDescription } from '@/lib/neetcode/scheduling';
import RecordAttemptModal from './RecordAttemptModal';
import ProblemDetailModal from './ProblemDetailModal';
import type { Difficulty, StatusFilter, NeetcodeProblem } from '@/types/neetcode';
import {
  Search,
  Filter,
  ExternalLink,
  CheckCircle,
  Circle,
  AlertCircle,
  Eye,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProblemRoadmap() {
  const { progress } = useNeetcodeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(NEETCODE_CATEGORIES));

  const [attemptProblem, setAttemptProblem] = useState<NeetcodeProblem | null>(null);
  const [detailProblem, setDetailProblem] = useState<NeetcodeProblem | null>(null);

  const filteredProblems = useMemo(() => {
    return NEETCODE_PROBLEMS.filter((problem) => {
      const prog = progress[problem.id];

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!problem.name.toLowerCase().includes(q) && !problem.category.toLowerCase().includes(q)) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'all' && problem.category !== categoryFilter) return false;

      // Difficulty
      if (difficultyFilter !== 'all' && problem.difficulty !== difficultyFilter) return false;

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'unattempted' && prog?.hasAttempted) return false;
        if (statusFilter === 'attempted' && !prog?.hasAttempted) return false;
        if (statusFilter === 'solved' && !(prog?.hasSolvedIndependently || prog?.hasSolvedWithHints)) return false;
        if (statusFilter === 'needs_review' && !prog?.needsReview) return false;
      }

      // Review status
      if (reviewFilter !== 'all') {
        if (reviewFilter === 'due' && !isReviewDue(prog?.nextReviewDate)) return false;
        if (reviewFilter === 'overdue' && !isReviewOverdue(prog?.nextReviewDate)) return false;
      }

      return true;
    });
  }, [progress, searchQuery, categoryFilter, difficultyFilter, statusFilter, reviewFilter]);

  // Group by category
  const groupedProblems = useMemo(() => {
    const groups: Record<string, NeetcodeProblem[]> = {};
    for (const problem of filteredProblems) {
      if (!groups[problem.category]) groups[problem.category] = [];
      groups[problem.category].push(problem);
    }
    return groups;
  }, [filteredProblems]);

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const getDifficultyColor = (d: Difficulty) => {
    switch (d) {
      case 'Easy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'Medium': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
      case 'Hard': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    }
  };

  const getStatusIcon = (problemId: string) => {
    const prog = progress[problemId];
    if (!prog || !prog.hasAttempted) {
      return <Circle size={18} className="text-zinc-300 dark:text-zinc-600" />;
    }
    if (prog.hasSolvedIndependently) {
      return <CheckCircle size={18} className="text-green-500" />;
    }
    if (prog.hasSolvedWithHints) {
      return <HelpCircle size={18} className="text-blue-500" />;
    }
    if (prog.hasSolutionViewed) {
      return <Eye size={18} className="text-amber-500" />;
    }
    return <AlertCircle size={18} className="text-orange-500" />;
  };

  const getReviewBadge = (problemId: string) => {
    const prog = progress[problemId];
    if (!prog?.nextReviewDate) return null;

    if (isReviewOverdue(prog.nextReviewDate)) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Overdue
        </span>
      );
    }
    if (isReviewDue(prog.nextReviewDate)) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Due Today
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problems..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Categories</option>
            {NEETCODE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Difficulty */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="unattempted">Not Started</option>
            <option value="attempted">Attempted</option>
            <option value="solved">Solved</option>
            <option value="needs_review">Needs Review</option>
          </select>

          {/* Review */}
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Reviews</option>
            <option value="due">Due for Review</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          Showing {filteredProblems.length} of 150 problems
        </p>
      </div>

      {/* Problem List */}
      <div className="space-y-3">
        {NEETCODE_CATEGORIES.filter(cat => groupedProblems[cat]?.length > 0).map((cat) => {
          const problems = groupedProblems[cat];
          const isExpanded = expandedCategories.has(cat);
          const catSolved = problems.filter(p => {
            const prog = progress[p.id];
            return prog?.hasSolvedIndependently || prog?.hasSolvedWithHints;
          }).length;

          return (
            <div key={cat} className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <h3 className="font-semibold">{cat}</h3>
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {catSolved}/{problems.length}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t dark:border-zinc-800">
                  {problems.map((problem) => {
                    const prog = progress[problem.id];
                    return (
                      <div
                        key={problem.id}
                        className="px-6 py-3 flex items-center justify-between border-b dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(problem.id)}
                          <button
                            onClick={() => setDetailProblem(problem)}
                            className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate"
                          >
                            <span className="text-zinc-400 mr-2">#{problem.order}</span>
                            {problem.name}
                          </button>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getDifficultyColor(problem.difficulty))}>
                            {problem.difficulty}
                          </span>
                          {getReviewBadge(problem.id)}
                          {prog?.lastRecallRating && (
                            <span className="text-xs text-zinc-400 hidden lg:inline">
                              Recall: {getRecallDescription(prog.lastRecallRating)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={problem.leetcodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors"
                            title="Open on LeetCode"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => setAttemptProblem(problem)}
                            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            {prog?.hasAttempted ? 'Log Attempt' : 'Start'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProblems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed dark:border-zinc-800">
          <Filter size={32} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
          <p className="text-zinc-500">No problems match your filters.</p>
        </div>
      )}

      {/* Modals */}
      {attemptProblem && (
        <RecordAttemptModal
          problem={attemptProblem}
          onClose={() => setAttemptProblem(null)}
        />
      )}
      {detailProblem && (
        <ProblemDetailModal
          problem={detailProblem}
          onClose={() => setDetailProblem(null)}
          onLogAttempt={() => {
            setAttemptProblem(detailProblem);
            setDetailProblem(null);
          }}
        />
      )}
    </div>
  );
}
