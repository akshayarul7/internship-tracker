import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  NeetcodeState,
  ProblemProgress,
  AttemptOutcome,
  RecallRating,
  SessionType,
  SessionProblem,
  PracticeSession,
  SessionHistoryEntry,
  SpacedRepetitionConfig,
  DailyPracticeConfig,
  ReactivationConfig,
  AttemptRecord,
  ReviewRecord,
} from '@/types/neetcode';
import { calculateNextReviewDate } from '@/lib/neetcode/scheduling';
import { NEETCODE_PROBLEMS } from '@/data/neetcode150';

export interface NeetcodeStoreActions {
  // Record an attempt on a problem
  recordAttempt: (
    problemId: string,
    outcome: AttemptOutcome,
    recallRating?: RecallRating,
    notes?: string,
    timeSpentMinutes?: number,
    completedDate?: string
  ) => void;

  // Record a review of a problem
  recordReview: (
    problemId: string,
    recallRating: RecallRating,
    notes?: string
  ) => void;

  // Update problem notes and details
  updateProblemNotes: (
    problemId: string,
    updates: {
      personalNotes?: string;
      keyApproach?: string;
      timeComplexity?: string;
      spaceComplexity?: string;
      understandsPattern?: boolean;
      completedDate?: string;
    }
  ) => void;

  // Toggle needsReview flag
  toggleNeedsReview: (problemId: string) => void;

  // Start a new practice session
  startSession: (type: SessionType, problems: SessionProblem[]) => void;

  // Complete a problem in the active session
  completeSessionProblem: (problemId: string, attemptId?: string) => void;

  // Move to next problem in session
  advanceSession: () => void;

  // End the current session
  endSession: () => void;

  // Pause session (just records progress, session stays active)
  pauseSession: () => void;

  // Update settings
  updateSpacedRepetitionConfig: (config: Partial<SpacedRepetitionConfig>) => void;
  updateDailyPracticeConfig: (config: Partial<DailyPracticeConfig>) => void;
  updateReactivationConfig: (config: Partial<ReactivationConfig>) => void;

  // Dismiss reactivation prompt
  dismissReactivation: () => void;

  // Update last activity
  touchActivity: () => void;

  // Update current roadmap position
  updatePosition: (position: number) => void;

  // Update an existing attempt
  updateAttempt: (
    problemId: string,
    attemptId: string,
    updates: {
      outcome?: AttemptOutcome;
      recallRating?: RecallRating;
      notes?: string;
      timeSpentMinutes?: number;
      timestamp?: string;
    }
  ) => void;

  // Delete an existing attempt
  deleteAttempt: (problemId: string, attemptId: string) => void;

  // Set or update completion date for a problem
  setCompletedDate: (problemId: string, date: string | undefined) => void;

  // Delete a practice session from history
  deleteSessionHistoryEntry: (sessionId: string) => void;

  // Clear all practice session history
  clearSessionHistory: () => void;

  // Reset all progress (careful!)
  resetAllProgress: () => void;
}

export interface NeetcodeStoreState extends NeetcodeState, NeetcodeStoreActions {}

/**
 * Creates default initial progress for a problem.
 */
function createDefaultProgress(problemId: string): ProblemProgress {
  return {
    problemId,
    hasAttempted: false,
    hasSolvedIndependently: false,
    hasSolvedWithHints: false,
    hasSolutionViewed: false,
    needsReview: false,
    understandsPattern: false,
    attempts: [],
    reviews: [],
  };
}

const DEFAULT_SPACED_REPETITION_CONFIG: SpacedRepetitionConfig = {
  intervals: {
    4: 30,
    3: 14,
    2: 3,
    1: 1,
  },
};

const DEFAULT_DAILY_PRACTICE_CONFIG: DailyPracticeConfig = {
  reviewPercentage: 20,
  newPercentage: 80,
  maxProblemsPerSession: 5,
  maxOverduePerSession: 3,
};

const DEFAULT_REACTIVATION_CONFIG: ReactivationConfig = {
  inactivityThresholdDays: 14,
  diagnosticProblemCount: 8,
};

/**
 * Recalculates problem flags, dates, and review scheduling when attempts change.
 */
function recalculateProgress(
  problemId: string,
  existing: ProblemProgress,
  config: SpacedRepetitionConfig
): ProblemProgress {
  const attempts = existing.attempts || [];
  const reviews = existing.reviews || [];

  const hasAttempted = attempts.length > 0;
  const hasSolvedIndependently = attempts.some(
    (a) => a.outcome === 'solved_independently'
  );
  const hasSolvedWithHints = attempts.some(
    (a) => a.outcome === 'solved_with_hints'
  );
  const hasSolutionViewed = attempts.some(
    (a) => a.outcome === 'solution_viewed'
  );

  // Chronologically sort attempts
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstAttemptDate = sortedAttempts.length > 0 ? sortedAttempts[0].timestamp : undefined;
  const lastAttemptDate =
    sortedAttempts.length > 0
      ? sortedAttempts[sortedAttempts.length - 1].timestamp
      : undefined;

  // Latest recall rating
  const lastAttemptWithRecall = [...sortedAttempts]
    .reverse()
    .find((a) => a.recallRating !== undefined);
  const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : undefined;

  let lastRecallRating: RecallRating | undefined = undefined;
  let nextReviewDate = existing.nextReviewDate;
  let needsReview = existing.needsReview;

  if (lastReview) {
    lastRecallRating = lastReview.recallRating;
    nextReviewDate = calculateNextReviewDate(
      lastRecallRating,
      config,
      new Date(lastReview.timestamp)
    );
    needsReview = lastRecallRating < 3;
  } else if (lastAttemptWithRecall?.recallRating) {
    lastRecallRating = lastAttemptWithRecall.recallRating;
    nextReviewDate = calculateNextReviewDate(
      lastRecallRating,
      config,
      new Date(lastAttemptWithRecall.timestamp)
    );
    needsReview = lastRecallRating < 3;
  } else if (!hasAttempted) {
    nextReviewDate = undefined;
    needsReview = false;
  }

  // Update completed date
  let completedDate = existing.completedDate;
  if (!hasSolvedIndependently && !hasSolvedWithHints) {
    completedDate = undefined;
  } else if (!completedDate) {
    const solvedAttempt = [...sortedAttempts]
      .reverse()
      .find(
        (a) =>
          a.outcome === 'solved_independently' ||
          a.outcome === 'solved_with_hints'
      );
    if (solvedAttempt) completedDate = solvedAttempt.timestamp;
  }

  return {
    ...existing,
    hasAttempted,
    hasSolvedIndependently,
    hasSolvedWithHints,
    hasSolutionViewed,
    needsReview,
    lastRecallRating,
    nextReviewDate,
    completedDate,
    firstAttemptDate,
    lastAttemptDate,
    attempts: sortedAttempts,
  };
}

export const useNeetcodeStore = create<NeetcodeStoreState>()(
  persist(
    (set, get) => ({
      // State defaults
      progress: {},
      currentPosition: 1,
      activeSession: null,
      sessionHistory: [],
      lastActivityDate: undefined,
      lastReactivationDate: undefined,
      reactivationDismissedAt: undefined,
      spacedRepetitionConfig: DEFAULT_SPACED_REPETITION_CONFIG,
      dailyPracticeConfig: DEFAULT_DAILY_PRACTICE_CONFIG,
      reactivationConfig: DEFAULT_REACTIVATION_CONFIG,

      recordAttempt: (problemId, outcome, recallRating, notes, timeSpentMinutes, completedDate) => {
        let attemptDate = new Date();
        if (completedDate) {
          if (completedDate.includes('T')) {
            attemptDate = new Date(completedDate);
          } else {
            const [y, m, d] = completedDate.split('-').map(Number);
            attemptDate = new Date(y, m - 1, d, 12, 0, 0);
          }
        }
        const nowIso = attemptDate.toISOString();
        const attemptId = crypto.randomUUID();
        const attemptRecord: AttemptRecord = {
          id: attemptId,
          timestamp: nowIso,
          outcome,
          recallRating,
          notes,
          timeSpentMinutes,
        };

        set((state) => {
          const existing =
            state.progress[problemId] ?? createDefaultProgress(problemId);

          // Update outcome flags
          const hasAttempted = true;
          const isSolved = outcome === 'solved_independently' || outcome === 'solved_with_hints';
          const hasSolvedIndependently =
            existing.hasSolvedIndependently || outcome === 'solved_independently';
          const hasSolvedWithHints =
            existing.hasSolvedWithHints || outcome === 'solved_with_hints';
          const hasSolutionViewed =
            existing.hasSolutionViewed || outcome === 'solution_viewed';

          // Update scheduling and review indicators
          let nextReviewDate = existing.nextReviewDate;
          let lastRecallRating = existing.lastRecallRating;
          let needsReview = existing.needsReview;

          if (recallRating !== undefined) {
            lastRecallRating = recallRating;
            nextReviewDate = calculateNextReviewDate(
              recallRating,
              state.spacedRepetitionConfig,
              attemptDate
            );
            needsReview = recallRating < 3;
          } else if (outcome === 'attempted' || outcome === 'solution_viewed') {
            needsReview = true;
          }

          const updatedProgress: ProblemProgress = {
            ...existing,
            hasAttempted,
            hasSolvedIndependently,
            hasSolvedWithHints,
            hasSolutionViewed,
            needsReview,
            lastRecallRating,
            nextReviewDate,
            completedDate: isSolved
              ? (completedDate ? nowIso : (existing.completedDate || nowIso))
              : existing.completedDate,
            firstAttemptDate: existing.firstAttemptDate || nowIso,
            lastAttemptDate: nowIso,
            attempts: [...(existing.attempts || []), attemptRecord],
          };

          // Advance currentPosition if solved and problem's order >= currentPosition
          let newPosition = state.currentPosition;
          if (outcome === 'solved_independently' || outcome === 'solved_with_hints') {
            const problem = NEETCODE_PROBLEMS.find((p) => p.id === problemId);
            if (problem && problem.order >= state.currentPosition) {
              newPosition = problem.order + 1;
            }
          }

          // If an active session contains this problem, update its status
          let updatedActiveSession = state.activeSession;
          if (state.activeSession) {
            const pIdx = state.activeSession.problems.findIndex(
              (p) => p.problemId === problemId
            );
            if (pIdx !== -1) {
              const updatedProblems = [...state.activeSession.problems];
              updatedProblems[pIdx] = {
                ...updatedProblems[pIdx],
                completed: true,
                attemptId,
              };
              updatedActiveSession = {
                ...state.activeSession,
                problems: updatedProblems,
              };
            }
          }

          return {
            progress: {
              ...state.progress,
              [problemId]: updatedProgress,
            },
            currentPosition: newPosition,
            activeSession: updatedActiveSession,
            lastActivityDate: nowIso,
          };
        });
      },

      recordReview: (problemId, recallRating, notes) => {
        const nowIso = new Date().toISOString();
        const reviewRecord: ReviewRecord = {
          id: crypto.randomUUID(),
          timestamp: nowIso,
          recallRating,
          notes,
        };

        set((state) => {
          const existing =
            state.progress[problemId] ?? createDefaultProgress(problemId);
          const nextReviewDate = calculateNextReviewDate(
            recallRating,
            state.spacedRepetitionConfig
          );

          const updatedProgress: ProblemProgress = {
            ...existing,
            lastReviewDate: nowIso,
            lastRecallRating: recallRating,
            nextReviewDate,
            needsReview: recallRating < 3,
            reviews: [...(existing.reviews || []), reviewRecord],
          };

          return {
            progress: {
              ...state.progress,
              [problemId]: updatedProgress,
            },
            lastActivityDate: nowIso,
          };
        });
      },

      updateProblemNotes: (problemId, updates) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const existing =
            state.progress[problemId] ?? createDefaultProgress(problemId);

          const updatedProgress: ProblemProgress = {
            ...existing,
            personalNotes:
              updates.personalNotes !== undefined
                ? updates.personalNotes
                : existing.personalNotes,
            keyApproach:
              updates.keyApproach !== undefined
                ? updates.keyApproach
                : existing.keyApproach,
            timeComplexity:
              updates.timeComplexity !== undefined
                ? updates.timeComplexity
                : existing.timeComplexity,
            spaceComplexity:
              updates.spaceComplexity !== undefined
                ? updates.spaceComplexity
                : existing.spaceComplexity,
            understandsPattern:
              updates.understandsPattern !== undefined
                ? updates.understandsPattern
                : existing.understandsPattern,
            completedDate:
              updates.completedDate !== undefined
                ? (updates.completedDate ? (updates.completedDate.includes('T') ? updates.completedDate : `${updates.completedDate}T12:00:00.000Z`) : undefined)
                : existing.completedDate,
          };

          return {
            progress: {
              ...state.progress,
              [problemId]: updatedProgress,
            },
            lastActivityDate: nowIso,
          };
        });
      },

      toggleNeedsReview: (problemId) => {
        set((state) => {
          const existing =
            state.progress[problemId] ?? createDefaultProgress(problemId);
          return {
            progress: {
              ...state.progress,
              [problemId]: {
                ...existing,
                needsReview: !existing.needsReview,
              },
            },
          };
        });
      },

      startSession: (type, problems) => {
        const nowIso = new Date().toISOString();
        const session: PracticeSession = {
          id: crypto.randomUUID(),
          type,
          startedAt: nowIso,
          problems: problems.map((p) => ({
            ...p,
            completed: p.completed ?? false,
          })),
          currentIndex: 0,
        };

        set({
          activeSession: session,
          lastActivityDate: nowIso,
        });
      },

      completeSessionProblem: (problemId, attemptId) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          if (!state.activeSession) return state;

          const updatedProblems = state.activeSession.problems.map((p) => {
            if (p.problemId === problemId) {
              return {
                ...p,
                completed: true,
                attemptId: attemptId ?? p.attemptId,
              };
            }
            return p;
          });

          return {
            activeSession: {
              ...state.activeSession,
              problems: updatedProblems,
            },
            lastActivityDate: nowIso,
          };
        });
      },

      advanceSession: () => {
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              currentIndex: Math.min(
                state.activeSession.currentIndex + 1,
                state.activeSession.problems.length
              ),
            },
          };
        });
      },

      endSession: () => {
        const nowIso = new Date().toISOString();
        set((state) => {
          if (!state.activeSession) return state;

          const { activeSession, progress } = state;
          const completedProblems = activeSession.problems.filter((p) => p.completed);
          const attemptedProblems = activeSession.problems.filter(
            (p) => p.completed || Boolean(p.attemptId)
          );

          let totalRecall = 0;
          let recallCount = 0;

          for (const sp of activeSession.problems) {
            const prog = progress[sp.problemId];
            if (prog) {
              if (sp.attemptId) {
                const attempt = prog.attempts?.find((a) => a.id === sp.attemptId);
                if (attempt?.recallRating) {
                  totalRecall += attempt.recallRating;
                  recallCount++;
                  continue;
                }
              }
              if (sp.completed && prog.lastRecallRating) {
                totalRecall += prog.lastRecallRating;
                recallCount++;
              }
            }
          }

          const averageRecall =
            recallCount > 0 ? Number((totalRecall / recallCount).toFixed(2)) : undefined;

          const historyEntry: SessionHistoryEntry = {
            id: activeSession.id,
            type: activeSession.type,
            date: nowIso,
            problemsAttempted: Math.max(attemptedProblems.length, completedProblems.length),
            problemsCompleted: completedProblems.length,
            averageRecall,
          };

          const isReactivation = activeSession.type === 'reactivation';

          return {
            activeSession: null,
            sessionHistory: [...state.sessionHistory, historyEntry],
            lastReactivationDate: isReactivation ? nowIso : state.lastReactivationDate,
            lastActivityDate: nowIso,
          };
        });
      },

      pauseSession: () => {
        const nowIso = new Date().toISOString();
        set({
          lastActivityDate: nowIso,
        });
      },

      updateSpacedRepetitionConfig: (config) => {
        set((state) => ({
          spacedRepetitionConfig: {
            ...state.spacedRepetitionConfig,
            ...config,
            intervals: {
              ...state.spacedRepetitionConfig.intervals,
              ...(config.intervals || {}),
            },
          },
        }));
      },

      updateDailyPracticeConfig: (config) => {
        set((state) => ({
          dailyPracticeConfig: {
            ...state.dailyPracticeConfig,
            ...config,
          },
        }));
      },

      updateReactivationConfig: (config) => {
        set((state) => ({
          reactivationConfig: {
            ...state.reactivationConfig,
            ...config,
          },
        }));
      },

      dismissReactivation: () => {
        set({
          reactivationDismissedAt: new Date().toISOString(),
        });
      },

      touchActivity: () => {
        set({
          lastActivityDate: new Date().toISOString(),
        });
      },

      updatePosition: (position) => {
        set({
          currentPosition: Math.max(1, position),
        });
      },

      getProgress: (problemId: string) => {
        const current = get().progress[problemId];
        if (current) return current;
        const initial = createDefaultProgress(problemId);
        set((state) => ({
          progress: {
            ...state.progress,
            [problemId]: initial,
          },
        }));
        return initial;
      },

      updateAttempt: (problemId, attemptId, updates) => {
        set((state) => {
          const existing = state.progress[problemId];
          if (!existing) return state;

          const attempts = (existing.attempts || []).map((att) => {
            if (att.id !== attemptId) return att;
            let timestamp = att.timestamp;
            if (updates.timestamp) {
              timestamp = updates.timestamp.includes('T')
                ? updates.timestamp
                : `${updates.timestamp}T12:00:00.000Z`;
            }
            return {
              ...att,
              outcome: updates.outcome ?? att.outcome,
              recallRating:
                updates.recallRating !== undefined
                  ? updates.recallRating
                  : att.recallRating,
              notes: updates.notes !== undefined ? updates.notes : att.notes,
              timeSpentMinutes:
                updates.timeSpentMinutes !== undefined
                  ? updates.timeSpentMinutes
                  : att.timeSpentMinutes,
              timestamp,
            };
          });

          const updatedProg = recalculateProgress(
            problemId,
            { ...existing, attempts },
            state.spacedRepetitionConfig
          );

          return {
            progress: {
              ...state.progress,
              [problemId]: updatedProg,
            },
            lastActivityDate: new Date().toISOString(),
          };
        });
      },

      deleteAttempt: (problemId, attemptId) => {
        set((state) => {
          const existing = state.progress[problemId];
          if (!existing) return state;

          const attempts = (existing.attempts || []).filter(
            (att) => att.id !== attemptId
          );

          const updatedProg = recalculateProgress(
            problemId,
            { ...existing, attempts },
            state.spacedRepetitionConfig
          );

          return {
            progress: {
              ...state.progress,
              [problemId]: updatedProg,
            },
            lastActivityDate: new Date().toISOString(),
          };
        });
      },

      setCompletedDate: (problemId, date) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const existing =
            state.progress[problemId] ?? createDefaultProgress(problemId);
          let formattedDate: string | undefined = undefined;
          if (date) {
            formattedDate = date.includes('T') ? date : `${date}T12:00:00.000Z`;
          }
          return {
            progress: {
              ...state.progress,
              [problemId]: {
                ...existing,
                completedDate: formattedDate,
              },
            },
            lastActivityDate: nowIso,
          };
        });
      },

      deleteSessionHistoryEntry: (sessionId) => {
        set((state) => ({
          sessionHistory: state.sessionHistory.filter((s) => s.id !== sessionId),
        }));
      },

      clearSessionHistory: () => {
        set({ sessionHistory: [] });
      },

      resetAllProgress: () => {
        set({
          progress: {},
          currentPosition: 1,
          activeSession: null,
          sessionHistory: [],
          lastActivityDate: undefined,
          lastReactivationDate: undefined,
          reactivationDismissedAt: undefined,
        });
      },
    }),
    {
      name: 'neetcode-tracker-storage',
    }
  )
);
