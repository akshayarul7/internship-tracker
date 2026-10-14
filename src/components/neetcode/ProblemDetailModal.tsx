'use client';

import { useState } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import type { NeetcodeProblem, AttemptOutcome, RecallRating, AttemptRecord } from '@/types/neetcode';
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
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { cn, getLocalDateString } from '@/lib/utils';

interface ProblemDetailModalProps {
  problem: NeetcodeProblem;
  onClose: () => void;
  onLogAttempt: () => void;
}

const outcomeOptions: { value: AttemptOutcome; label: string; color: string }[] = [
  { value: 'solved_independently', label: 'Solved Independently', color: 'bg-green-500' },
  { value: 'solved_with_hints', label: 'Solved with Hints', color: 'bg-blue-500' },
  { value: 'attempted', label: 'Attempted', color: 'bg-orange-500' },
  { value: 'solution_viewed', label: 'Solution Viewed', color: 'bg-amber-500' },
];

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
    prog?.completedDate ? getLocalDateString(prog.completedDate) : ''
  );

  // Direct completed date editing
  const [isEditingCompletedDate, setIsEditingCompletedDate] = useState(false);
  const [directCompletedDate, setDirectCompletedDate] = useState(
    prog?.completedDate ? getLocalDateString(prog.completedDate) : ''
  );

  // Attempt editing state
  const [editingAttemptId, setEditingAttemptId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState<AttemptOutcome>('solved_independently');
  const [editRecall, setEditRecall] = useState<RecallRating | undefined>(undefined);
  const [editTimestamp, setEditTimestamp] = useState('');
  const [editTimeSpent, setEditTimeSpent] = useState('');
  const [editNotes, setEditNotes] = useState('');

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

  const handleSaveCompletedDate = () => {
    store.setCompletedDate(problem.id, directCompletedDate || undefined);
    setIsEditingCompletedDate(false);
    setCompletedDate(directCompletedDate);
  };

  const handleStartEditAttempt = (att: AttemptRecord) => {
    setEditingAttemptId(att.id);
    setEditOutcome(att.outcome);
    setEditRecall(att.recallRating);
    setEditTimestamp(att.timestamp ? getLocalDateString(att.timestamp) : getLocalDateString());
    setEditTimeSpent(att.timeSpentMinutes !== undefined ? String(att.timeSpentMinutes) : '');
    setEditNotes(att.notes || '');
  };

  const handleSaveAttemptEdit = (attemptId: string) => {
    store.updateAttempt(problem.id, attemptId, {
      outcome: editOutcome,
      recallRating: editRecall,
      timestamp: editTimestamp,
      timeSpentMinutes: editTimeSpent ? parseInt(editTimeSpent, 10) : undefined,
      notes: editNotes,
    });
    setEditingAttemptId(null);
  };

  const handleDeleteAttempt = (attemptId: string) => {
    if (window.confirm('Are you sure you want to delete this attempt record? Your problem progress and solve status will be recalculated.')) {
      store.deleteAttempt(problem.id, attemptId);
      if (editingAttemptId === attemptId) {
        setEditingAttemptId(null);
      }
    }
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

          {/* Dates & Completion */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-3 space-y-2 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                {isEditingCompletedDate ? (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Completed Date:</span>
                    <input
                      type="date"
                      value={directCompletedDate}
                      onChange={(e) => setDirectCompletedDate(e.target.value)}
                      className="px-2 py-1 text-xs border rounded dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCompletedDate}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Save date"
                    >
                      <Check size={14} />
                    </button>
                    {prog?.completedDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setDirectCompletedDate('');
                          store.setCompletedDate(problem.id, undefined);
                          setIsEditingCompletedDate(false);
                          setCompletedDate('');
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Clear completed date"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCompletedDate(false);
                        setDirectCompletedDate(prog?.completedDate ? getLocalDateString(prog.completedDate) : '');
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {prog?.completedDate ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm">
                        <CheckCircle size={15} />
                        <span>Completed: {new Date(prog.completedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    ) : (prog?.hasSolvedIndependently || prog?.hasSolvedWithHints) ? (
                      <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm">
                        <CheckCircle size={15} className="text-green-500" />
                        <span>Completed (date not set)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
                        <Calendar size={14} />
                        <span>Not solved yet</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDirectCompletedDate(
                          prog?.completedDate
                            ? getLocalDateString(prog.completedDate)
                            : getLocalDateString()
                        );
                        setIsEditingCompletedDate(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1 font-normal"
                    >
                      <Pencil size={11} />
                      {prog?.completedDate ? 'Edit date' : 'Set date'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {prog?.firstAttemptDate && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    First: {new Date(prog.firstAttemptDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {prog?.lastAttemptDate && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Last: {new Date(prog.lastAttemptDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>

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
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {[...prog.attempts].reverse().map((attempt) => {
                  const isEditingThis = editingAttemptId === attempt.id;

                  if (isEditingThis) {
                    return (
                      <div
                        key={attempt.id}
                        className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-lg border dark:border-zinc-700 space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                            Edit Attempt
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingAttemptId(null)}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Outcome selection */}
                        <div>
                          <label className="text-xs font-medium text-zinc-500 block mb-1.5">Outcome</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {outcomeOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEditOutcome(opt.value)}
                                className={cn(
                                  'text-xs py-1.5 px-2 rounded-lg border text-left flex items-center gap-1.5 font-medium transition-colors',
                                  editOutcome === opt.value
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                )}
                              >
                                <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                                <span className="truncate">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Recall rating */}
                        <div>
                          <label className="text-xs font-medium text-zinc-500 block mb-1.5">Recall Rating</label>
                          <div className="grid grid-cols-5 gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setEditRecall(undefined)}
                              className={cn(
                                'py-1 rounded-lg border',
                                editRecall === undefined
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-300'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                              )}
                            >
                              None
                            </button>
                            {([1, 2, 3, 4] as RecallRating[]).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setEditRecall(r)}
                                className={cn(
                                  'py-1 rounded-lg border',
                                  editRecall === r
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-600 dark:text-blue-300'
                                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                                )}
                              >
                                {r} {r === 1 ? '— F' : r === 2 ? '— W' : r === 3 ? '— G' : '— S'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Date & Time Spent */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1">Date</label>
                            <input
                              type="date"
                              value={editTimestamp}
                              onChange={(e) => setEditTimestamp(e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1">Time Spent (min)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 25"
                              value={editTimeSpent}
                              onChange={(e) => setEditTimeSpent(e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-xs font-medium text-zinc-500 block mb-1">Attempt Notes</label>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes about this specific attempt..."
                            className="w-full px-2 py-1 text-xs border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[50px]"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAttemptId(null)}
                            className="px-2.5 py-1 text-xs border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAttemptEdit(attempt.id)}
                            className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={attempt.id}
                      className="py-2.5 px-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              attempt.outcome === 'solved_independently'
                                ? 'bg-green-500'
                                : attempt.outcome === 'solved_with_hints'
                                ? 'bg-blue-500'
                                : attempt.outcome === 'attempted'
                                ? 'bg-orange-500'
                                : 'bg-amber-500'
                            )}
                          />
                          <span className="capitalize font-medium text-xs sm:text-sm">
                            {attempt.outcome.replace(/_/g, ' ')}
                          </span>
                          {attempt.recallRating && (
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                              • Recall: {attempt.recallRating}/4 ({getRecallDescription(attempt.recallRating)})
                            </span>
                          )}
                          {attempt.timeSpentMinutes !== undefined && (
                            <span className="text-zinc-400 text-xs">
                              • {attempt.timeSpentMinutes}m
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <span className="text-xs text-zinc-400 mr-1">
                            {new Date(attempt.timestamp).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditAttempt(attempt)}
                            title="Edit attempt"
                            className="p-1 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttempt(attempt.id)}
                            title="Delete attempt"
                            className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {attempt.notes && (
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700 whitespace-pre-wrap">
                          {attempt.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
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
