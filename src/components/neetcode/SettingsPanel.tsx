'use client';

import { useState } from 'react';
import { useNeetcodeStore } from '@/store/useNeetcodeStore';
import {
  Settings,
  Clock,
  Sparkles,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import type { RecallRating } from '@/types/neetcode';
import { getLocalDateString } from '@/lib/utils';

export default function SettingsPanel() {
  const store = useNeetcodeStore();
  const {
    spacedRepetitionConfig,
    dailyPracticeConfig,
    reactivationConfig,
    updateSpacedRepetitionConfig,
    updateDailyPracticeConfig,
    updateReactivationConfig,
    resetAllProgress,
  } = store;

  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const showSaved = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleIntervalChange = (rating: RecallRating, days: number) => {
    updateSpacedRepetitionConfig({
      intervals: {
        ...spacedRepetitionConfig.intervals,
        [rating]: Math.max(1, days),
      },
    });
    showSaved('Spaced repetition intervals updated');
  };

  const handleReviewSplitChange = (reviewPct: number) => {
    const rPct = Math.min(100, Math.max(0, reviewPct));
    updateDailyPracticeConfig({
      reviewPercentage: rPct,
      newPercentage: 100 - rPct,
    });
    showSaved('Session allocation updated');
  };

  const handleMaxProblemsChange = (count: number) => {
    updateDailyPracticeConfig({
      maxProblemsPerSession: Math.max(1, count),
    });
    showSaved('Max problems updated');
  };

  const handleMaxOverdueChange = (count: number) => {
    updateDailyPracticeConfig({
      maxOverduePerSession: Math.max(1, count),
    });
    showSaved('Max overdue per session updated');
  };

  const handleInactivityDaysChange = (days: number) => {
    updateReactivationConfig({
      inactivityThresholdDays: Math.max(1, days),
    });
    showSaved('Inactivity threshold updated');
  };

  const handleDiagnosticCountChange = (count: number) => {
    updateReactivationConfig({
      diagnosticProblemCount: Math.min(15, Math.max(3, count)),
    });
    showSaved('Diagnostic problem count updated');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all settings to default values?')) {
      updateSpacedRepetitionConfig({
        intervals: { 4: 30, 3: 14, 2: 3, 1: 1 },
      });
      updateDailyPracticeConfig({
        reviewPercentage: 20,
        newPercentage: 80,
        maxProblemsPerSession: 5,
        maxOverduePerSession: 3,
      });
      updateReactivationConfig({
        inactivityThresholdDays: 14,
        diagnosticProblemCount: 8,
      });
      showSaved('Settings restored to defaults');
    }
  };

  const handleExportData = () => {
    const data = {
      progress: store.progress,
      currentPosition: store.currentPosition,
      sessionHistory: store.sessionHistory,
      lastActivityDate: store.lastActivityDate,
      spacedRepetitionConfig: store.spacedRepetitionConfig,
      dailyPracticeConfig: store.dailyPracticeConfig,
      reactivationConfig: store.reactivationConfig,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neetcode-tracker-backup-${getLocalDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.progress) {
          // Direct load into state
          useNeetcodeStore.setState((state) => ({
            ...state,
            progress: json.progress || {},
            currentPosition: json.currentPosition || 1,
            sessionHistory: json.sessionHistory || [],
            lastActivityDate: json.lastActivityDate || new Date().toISOString(),
            spacedRepetitionConfig: json.spacedRepetitionConfig || state.spacedRepetitionConfig,
            dailyPracticeConfig: json.dailyPracticeConfig || state.dailyPracticeConfig,
            reactivationConfig: json.reactivationConfig || state.reactivationConfig,
          }));
          showSaved('NeetCode data imported successfully!');
        } else {
          alert('Invalid backup file format');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetProgress = () => {
    if (
      window.confirm(
        'Are you SURE you want to reset all NeetCode 150 progress? This will delete all your logged attempts, reviews, and notes. This cannot be undone.'
      )
    ) {
      resetAllProgress();
      showSaved('All NeetCode progress has been reset');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {savedMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle size={18} />
          {savedMessage}
        </div>
      )}

      {/* Spaced Repetition Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold">Spaced Repetition Intervals</h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Define how many days to wait before scheduling the next review based on your recall rating.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">Rating 4 — Strong</span>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">Instant, effortless recall</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={spacedRepetitionConfig.intervals[4]}
                onChange={(e) => handleIntervalChange(4, parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm font-semibold text-center"
              />
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Rating 3 — Good</span>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">Recalled with some effort</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={spacedRepetitionConfig.intervals[3]}
                onChange={(e) => handleIntervalChange(3, parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm font-semibold text-center"
              />
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Rating 2 — Weak</span>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">Struggled significantly</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={spacedRepetitionConfig.intervals[2]}
                onChange={(e) => handleIntervalChange(2, parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm font-semibold text-center"
              />
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Rating 1 — Forgotten</span>
            <p className="text-xs text-zinc-400 mt-0.5 mb-2">Total blackout / couldn&apos;t recall</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={spacedRepetitionConfig.intervals[1]}
                onChange={(e) => handleIntervalChange(1, parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm font-semibold text-center"
              />
              <span className="text-xs text-zinc-500">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Practice Session Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-purple-500" />
          <h3 className="text-lg font-semibold">Daily Practice Session Mix</h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Adjust the balance between reviewing old problems and learning new problems during daily sessions.
        </p>

        <div className="space-y-6">
          {/* Ratio slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Session Problem Allocation</label>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {dailyPracticeConfig.reviewPercentage}% Review / {dailyPracticeConfig.newPercentage}% New
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={dailyPracticeConfig.reviewPercentage}
              onChange={(e) => handleReviewSplitChange(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>0% Review (All New)</span>
              <span>Default: 20% Review / 80% New</span>
              <span>100% Review (No New)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-sm font-medium block mb-1">Max Problems Per Session</label>
              <input
                type="number"
                min="1"
                max="20"
                value={dailyPracticeConfig.maxProblemsPerSession}
                onChange={(e) => handleMaxProblemsChange(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
              />
              <p className="text-xs text-zinc-400 mt-1">Default: 5 problems per daily practice</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Max Overdue Review Cap</label>
              <input
                type="number"
                min="1"
                max="10"
                value={dailyPracticeConfig.maxOverduePerSession}
                onChange={(e) => handleMaxOverdueChange(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
              />
              <p className="text-xs text-zinc-400 mt-1">Prevents overwhelming backlog dumps</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reactivation Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={20} className="text-amber-500" />
          <h3 className="text-lg font-semibold">Break &amp; Inactivity Reactivation</h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Configure how the app handles long absences without resetting your roadmap position.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Inactivity Threshold (Days)</label>
            <input
              type="number"
              min="3"
              max="90"
              value={reactivationConfig.inactivityThresholdDays}
              onChange={(e) => handleInactivityDaysChange(parseInt(e.target.value) || 14)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            />
            <p className="text-xs text-zinc-400 mt-1">Trigger diagnostic review after this many days of absence (Default: 14)</p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Diagnostic Problem Count</label>
            <input
              type="number"
              min="3"
              max="15"
              value={reactivationConfig.diagnosticProblemCount}
              onChange={(e) => handleDiagnosticCountChange(parseInt(e.target.value) || 8)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
            />
            <p className="text-xs text-zinc-400 mt-1">Number of problems in the calibration test (Default: 8)</p>
          </div>
        </div>
      </div>

      {/* Data Backup & Management */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Data Management &amp; Persistence</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Your NeetCode data is stored securely in your browser&apos;s local storage. You can backup or restore your progress anytime.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export NeetCode JSON
          </button>

          <label className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 text-sm font-medium transition-colors cursor-pointer">
            <Upload size={16} />
            Import NeetCode JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:border-zinc-700 text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Restore Default Settings
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 pt-6 border-t dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            Permanently clear all NeetCode problem attempts, reviews, and progress history. (Does not affect internship applications).
          </p>
          <button
            onClick={handleResetProgress}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} />
            Reset All NeetCode Progress
          </button>
        </div>
      </div>
    </div>
  );
}
