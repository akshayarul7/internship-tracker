'use client';

import { useState } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import type { AttemptOutcome, RecallRating, NeetcodeProblem } from '@/types/neetcode';
import { getRecallDescription, getIntervalDescription } from '@/lib/neetcode/scheduling';
import { X, ExternalLink, CheckCircle, HelpCircle, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordAttemptModalProps {
  problem: NeetcodeProblem;
  onClose: () => void;
  sessionMode?: boolean; // When used inside a practice session
  onRecorded?: (attemptId: string) => void;
}

const outcomes: { value: AttemptOutcome; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { value: 'solved_independently', label: 'Solved Independently', description: 'No hints or help needed', icon: CheckCircle, color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
  { value: 'solved_with_hints', label: 'Solved with Hints', description: 'Needed hints or editorial', icon: HelpCircle, color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { value: 'attempted', label: 'Attempted', description: "Tried but couldn't solve", icon: AlertCircle, color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  { value: 'solution_viewed', label: 'Solution Viewed', description: 'Studied the solution', icon: Eye, color: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
];

const recallOptions: { value: RecallRating; label: string; description: string; color: string }[] = [
  { value: 1, label: '1 — Forgotten', description: "Couldn't recall at all", color: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
  { value: 2, label: '2 — Weak', description: 'Struggled significantly', color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  { value: 3, label: '3 — Good', description: 'Recalled with some effort', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { value: 4, label: '4 — Strong', description: 'Instant recall', color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
];

export default function RecordAttemptModal({ problem, onClose, sessionMode, onRecorded }: RecordAttemptModalProps) {
  const { recordAttempt, spacedRepetitionConfig } = useNeetcodeStore();

  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const [recallRating, setRecallRating] = useState<RecallRating | null>(null);
  const [notes, setNotes] = useState('');
  const [timeSpent, setTimeSpent] = useState('');

  const handleSubmit = () => {
    if (!outcome) return;
    recordAttempt(
      problem.id,
      outcome,
      recallRating ?? undefined,
      notes || undefined,
      timeSpent ? parseInt(timeSpent) : undefined
    );
    onRecorded?.(problem.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <h2 className="text-lg font-semibold">Record Attempt</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-500">#{problem.order} {problem.name}</span>
              <a
                href={problem.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Outcome */}
          <div>
            <label className="text-sm font-medium mb-3 block">How did it go? *</label>
            <div className="grid grid-cols-2 gap-2">
              {outcomes.map((o) => {
                const Icon = o.icon;
                const isSelected = outcome === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      isSelected
                        ? o.color + ' border-opacity-100'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} />
                      <span className="text-sm font-medium">{o.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{o.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recall Rating */}
          <div>
            <label className="text-sm font-medium mb-3 block">Recall Rating</label>
            <div className="grid grid-cols-4 gap-2">
              {recallOptions.map((r) => {
                const isSelected = recallRating === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setRecallRating(isSelected ? null : r.value)}
                    className={cn(
                      'p-2 rounded-lg border-2 text-center transition-all',
                      isSelected
                        ? r.color
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    )}
                  >
                    <span className="text-sm font-medium block">{r.value}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{r.label.split(' — ')[1]}</span>
                  </button>
                );
              })}
            </div>
            {recallRating && (
              <p className="text-xs text-zinc-400 mt-2">
                {getIntervalDescription(recallRating, spacedRepetitionConfig)}
              </p>
            )}
          </div>

          {/* Time Spent */}
          <div>
            <label className="text-sm font-medium mb-1 block">Time Spent (minutes)</label>
            <input
              type="number"
              min="0"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Quick Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key insight, approach used, what to remember..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[80px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:border-zinc-700 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!outcome}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                outcome
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
              )}
            >
              Save Attempt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
