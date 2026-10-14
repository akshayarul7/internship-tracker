'use client';

import { useState } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import type { NeetcodeProblem } from '@/types/neetcode';
import { getRecallDescription } from '@/lib/neetcode/scheduling';
import {
  X,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Eye,
  Clock,
  Edit3,
  Save,
  Brain,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemDetailModalProps {
  problem: NeetcodeProblem;
  onClose: () => void;
  onLogAttempt: () => void;
}

export default function ProblemDetailModal({ problem, onClose, onLogAttempt }: ProblemDetailModalProps) {
  const store = useNeetcodeStore();
  const prog = store.progress[problem.id];

  const [editing, setEditing] = useState(false);
  const [personalNotes, setPersonalNotes] = useState(prog?.personalNotes || '');
  const [keyApproach, setKeyApproach] = useState(prog?.keyApproach || '');
  const [timeComplexity, setTimeComplexity] = useState(prog?.timeComplexity || '');
  const [spaceComplexity, setSpaceComplexity] = useState(prog?.spaceComplexity || '');
  const [understandsPattern, setUnderstandsPattern] = useState(prog?.understandsPattern || false);
  const [completedDate, setCompletedDate] = useState(() =>
    prog?.completedDate ? prog.completedDate.split('T')[0] : ''
  );

  const handleSaveNotes = () => {
    store.updateProblemNotes(problem.id, {
      personalNotes,
      keyApproach,
      timeComplexity,
      spaceComplexity,
      understandsPattern,
      completedDate: completedDate || undefined,
    });
    setEditing(false);
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'Easy': return 'text-green-600 dark:text-green-400';
      case 'Medium': return 'text-amber-600 dark:text-amber-400';
      case 'Hard': return 'text-red-600 dark:text-red-400';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-zinc-400 text-sm">#{problem.order}</span>
              <h2 className="text-lg font-semibold">{problem.name}</h2>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={cn('font-medium', getDifficultyColor(problem.difficulty))}>{problem.difficulty}</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-500">{problem.category}</span>
              <a
                href={problem.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
              >
                LeetCode <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusBadge
              active={prog?.hasSolvedIndependently}
              icon={<CheckCircle size={16} />}
              label="Independent"
              activeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            />
            <StatusBadge
              active={prog?.hasSolvedWithHints}
              icon={<HelpCircle size={16} />}
              label="With Hints"
              activeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            />
            <StatusBadge
              active={prog?.hasAttempted && !prog?.hasSolvedIndependently && !prog?.hasSolvedWithHints}
              icon={<AlertCircle size={16} />}
              label="Attempted"
              activeColor="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            />
            <StatusBadge
              active={prog?.hasSolutionViewed}
              icon={<Eye size={16} />}
              label="Solution Viewed"
              activeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            />
          </div>

          {/* Review Info */}
          {prog?.lastRecallRating && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain size={18} className="text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Last Recall: {getRecallDescription(prog.lastRecallRating)}</p>
                  {prog.nextReviewDate && (
                    <p className="text-xs text-zinc-400">Next review: {new Date(prog.nextReviewDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => store.toggleNeedsReview(problem.id)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                  prog.needsReview
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                )}
              >
                {prog.needsReview ? 'Needs Review' : 'Mark for Review'}
              </button>
            </div>
          )}

          {/* Dates */}
          {(prog?.firstAttemptDate || prog?.completedDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {prog.completedDate && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle size={14} />
                  <span>Completed: {new Date(prog.completedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {prog.firstAttemptDate && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock size={14} />
                  <span>First attempt: {new Date(prog.firstAttemptDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {prog.lastAttemptDate && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Clock size={14} />
                  <span>Last attempt: {new Date(prog.lastAttemptDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes Section */}
          <div className="border dark:border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
              <h3 className="font-medium text-sm">Notes & Approach</h3>
              <button
                onClick={() => editing ? handleSaveNotes() : setEditing(true)}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {editing ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {editing ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Key Approach</label>
                    <textarea
                      value={keyApproach}
                      onChange={(e) => setKeyApproach(e.target.value)}
                      placeholder="What algorithm/pattern did you use?"
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1">Time Complexity</label>
                      <input
                        value={timeComplexity}
                        onChange={(e) => setTimeComplexity(e.target.value)}
                        placeholder="e.g. O(n log n)"
                        className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1">Space Complexity</label>
                      <input
                        value={spaceComplexity}
                        onChange={(e) => setSpaceComplexity(e.target.value)}
                        placeholder="e.g. O(n)"
                        className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-zinc-400" />
                      <span>Date Completed</span>
                    </label>
                    <input
                      type="date"
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Personal Notes</label>
                    <textarea
                      value={personalNotes}
                      onChange={(e) => setPersonalNotes(e.target.value)}
                      placeholder="Key insights, edge cases, gotchas..."
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={understandsPattern}
                      onChange={(e) => setUnderstandsPattern(e.target.checked)}
                      className="rounded"
                    />
                    I understand the underlying pattern
                  </label>
                </>
              ) : (
                <>
                  {prog?.keyApproach ? (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Key Approach</p>
                      <p className="text-sm">{prog.keyApproach}</p>
                    </div>
                  ) : null}
                  {(prog?.timeComplexity || prog?.spaceComplexity) && (
                    <div className="flex gap-4 text-sm">
                      {prog.timeComplexity && <span>Time: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">{prog.timeComplexity}</code></span>}
                      {prog.spaceComplexity && <span>Space: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">{prog.spaceComplexity}</code></span>}
                    </div>
                  )}
                  {prog?.personalNotes ? (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{prog.personalNotes}</p>
                    </div>
                  ) : null}
                  {!prog?.keyApproach && !prog?.personalNotes && !prog?.timeComplexity && (
                    <p className="text-sm text-zinc-400 italic">No notes yet. Click Edit to add your approach and key insights.</p>
                  )}
                  {prog?.understandsPattern && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle size={12} /> Understands pattern
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Attempt History */}
          {prog?.attempts && prog.attempts.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3">Attempt History ({prog.attempts.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...prog.attempts].reverse().map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between text-sm py-2 border-b dark:border-zinc-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        attempt.outcome === 'solved_independently' ? 'bg-green-500' :
                        attempt.outcome === 'solved_with_hints' ? 'bg-blue-500' :
                        attempt.outcome === 'attempted' ? 'bg-orange-500' : 'bg-amber-500'
                      )} />
                      <span className="capitalize">{attempt.outcome.replace(/_/g, ' ')}</span>
                      {attempt.recallRating && (
                        <span className="text-zinc-400 text-xs">• Recall: {attempt.recallRating}/4</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(attempt.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink size={14} />
              Open on LeetCode
            </a>
            <button
              onClick={onLogAttempt}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Log Attempt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active, icon, label, activeColor }: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
      active ? activeColor : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
    )}>
      {icon}
      {label}
    </div>
  );
}
