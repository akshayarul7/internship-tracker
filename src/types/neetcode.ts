/**
 * NeetCode 150 Tracker Types
 * 
 * Defines all TypeScript interfaces, types, and configurations
 * for tracking NeetCode 150 problem-solving progress, spaced repetition,
 * session management, and reactivation after long breaks.
 */

// ==========================================
// Static Problem Definitions
// ==========================================

/**
 * Difficulty levels for NeetCode problems, matching LeetCode conventions.
 */
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * Standard topic categories in the NeetCode 150 roadmap.
 */
export type NeetcodeCategory =
  | 'Arrays & Hashing'
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Stack'
  | 'Binary Search'
  | 'Linked List'
  | 'Trees'
  | 'Tries'
  | 'Heap / Priority Queue'
  | 'Backtracking'
  | 'Graphs'
  | 'Advanced Graphs'
  | '1-D Dynamic Programming'
  | '2-D Dynamic Programming'
  | 'Greedy'
  | 'Intervals'
  | 'Math & Geometry'
  | 'Bit Manipulation';

/**
 * Static metadata for a NeetCode 150 problem (separate from user progress).
 */
export interface NeetcodeProblem {
  /** Unique problem identifier (e.g., 'two-sum', 'valid-anagram') */
  id: string;
  /** Sequential order in the NeetCode 150 roadmap (1-150) */
  order: number;
  /** Display title */
  title: string;
  /** LeetCode problem name alias */
  name: string;
  /** Problem difficulty level */
  difficulty: Difficulty;
  /** Topic category */
  category: NeetcodeCategory | string;
  /** LeetCode problem URL */
  leetcodeUrl: string;
  /** NeetCode solution or video explanation URL */
  neetcodeUrl?: string;
  /** Algorithmic pattern or paradigm */
  pattern?: string;
  /** Freeform tags or prerequisites */
  tags?: string[];
}

// ==========================================
// Attempt & Review Records
// ==========================================

/**
 * Outcome of a problem-solving attempt.
 * - 'solved_independently': Solved without any help
 * - 'solved_with_hints': Solved but needed hints or editorial
 * - 'attempted': Tried but could not arrive at a working solution
 * - 'solution_viewed': Looked at the solution/walkthrough
 */
export type AttemptOutcome =
  | 'solved_independently'
  | 'solved_with_hints'
  | 'attempted'
  | 'solution_viewed';

/**
 * Recall rating for spaced repetition (1-4 scale).
 * 1 = Complete blackout / reset interval
 * 2 = Hard / struggled significantly
 * 3 = Good / recalled with some effort
 * 4 = Easy / instant recall
 */
export type RecallRating = 1 | 2 | 3 | 4;

/**
 * Record of an individual problem attempt during active practice.
 */
export interface AttemptRecord {
  /** Unique attempt identifier */
  id: string;
  /** ISO date string of attempt */
  timestamp: string;
  /** Result outcome */
  outcome: AttemptOutcome;
  /** Optional recall rating (1-4) */
  recallRating?: RecallRating;
  /** Duration spent on problem in minutes */
  timeSpentMinutes?: number;
  /** Notes recorded during or after the attempt */
  notes?: string;
}

/**
 * Record of an individual spaced repetition review session.
 */
export interface ReviewRecord {
  /** Unique review identifier */
  id: string;
  /** ISO date string of review */
  timestamp: string;
  /** Subjective recall rating (1-4) */
  recallRating: RecallRating;
  /** Optional notes captured during review */
  notes?: string;
}

// ==========================================
// User Progress on Single Problem
// ==========================================

/**
 * Comprehensive user progress state for a single problem.
 * Designed with compatible boolean flags rather than a single mutually exclusive status.
 */
export interface ProblemProgress {
  /** Matches NeetcodeProblem.id */
  problemId: string;

  // Current state flags (compatible, not mutually exclusive)
  /** True if the user has ever attempted this problem */
  hasAttempted: boolean;
  /** True if solved completely independently at least once */
  hasSolvedIndependently: boolean;
  /** True if solved with hints or solution assistance */
  hasSolvedWithHints: boolean;
  /** True if the solution was ever viewed */
  hasSolutionViewed: boolean;
  /** Flag indicating whether this problem is marked or scheduled for review */
  needsReview: boolean;

  // Latest recall & understanding
  /** Most recent recall rating (1-4) */
  lastRecallRating?: RecallRating;
  /** User self-assessment on understanding the underlying algorithmic pattern */
  understandsPattern: boolean;

  // Personal notes & takeaways
  /** General personal notes or tips */
  personalNotes?: string;
  /** Summary of key approach / algorithm */
  keyApproach?: string;
  /** Time complexity notation (e.g., 'O(n)') */
  timeComplexity?: string;
  /** Space complexity notation (e.g., 'O(1)') */
  spaceComplexity?: string;

  // Dates (all ISO date strings)
  /** Date when the problem was solved */
  completedDate?: string;
  /** Date when the problem was first attempted */
  firstAttemptDate?: string;
  /** Date of the most recent attempt */
  lastAttemptDate?: string;
  /** Date of the most recent review */
  lastReviewDate?: string;
  /** Target date for next spaced repetition review */
  nextReviewDate?: string;

  // History log
  /** Full list of chronological attempts */
  attempts: AttemptRecord[];
  /** Full list of chronological spaced repetition reviews */
  reviews: ReviewRecord[];
}

// ==========================================
// Configuration Types
// ==========================================

/**
 * Spaced repetition configuration mapping recall ratings to intervals in days.
 */
export interface SpacedRepetitionConfig {
  /** Map of recall rating (1-4) to days until next scheduled review */
  intervals: Record<RecallRating, number>;
}

/**
 * Daily practice session configuration.
 */
export interface DailyPracticeConfig {
  /** Target percentage of review problems (0-100, default 20) */
  reviewPercentage: number;
  /** Target percentage of new problems (0-100, default 80) */
  newPercentage: number;
  /** Maximum problems recommended per practice session (default 5) */
  maxProblemsPerSession: number;
  /** Maximum overdue review problems to present in a single session (default 3) */
  maxOverduePerSession: number;
}

/**
 * Reactivation configuration for users returning after long breaks.
 */
export interface ReactivationConfig {
  /** Inactivity threshold in days triggering reactivation flow (default 14) */
  inactivityThresholdDays: number;
  /** Number of diagnostic problems for reactivation assessment (default 8) */
  diagnosticProblemCount: number;
}

// ==========================================
// Practice Sessions & History
// ==========================================

/**
 * Practice session types.
 * - 'daily': Standard mix of new problems and overdue reviews
 * - 'reactivation': Diagnostic calibration after an extended break
 * - 'review': Focused spaced repetition review session
 */
export type SessionType = 'daily' | 'reactivation' | 'review';

/**
 * A problem entry within an active practice session.
 */
export interface SessionProblem {
  /** Matches NeetcodeProblem.id */
  problemId: string;
  /** Role of this problem in the session */
  type: 'review' | 'new' | 'reactivation';
  /** Rationale for why this problem was selected */
  reason?: string;
  /** Whether the problem has been completed in this session */
  completed: boolean;
  /** ID of the AttemptRecord created during this session */
  attemptId?: string;
}

/**
 * An active practice session instance.
 */
export interface PracticeSession {
  /** Unique session identifier */
  id: string;
  /** Type of practice session */
  type: SessionType;
  /** ISO date string when session was initialized */
  startedAt: string;
  /** ISO date string when session was finished */
  completedAt?: string;
  /** List of problems queued for this session */
  problems: SessionProblem[];
  /** 0-based index of the currently active problem in problems */
  currentIndex: number;
}

/**
 * Summary log entry for a completed practice session.
 */
export interface SessionHistoryEntry {
  /** Unique session identifier */
  id: string;
  /** Type of practice session completed */
  type: SessionType;
  /** ISO date string when the session took place */
  date: string;
  /** Total problems attempted in the session */
  problemsAttempted: number;
  /** Total problems completed in the session */
  problemsCompleted: number;
  /** Average recall rating across problems in the session */
  averageRecall?: number;
}

// ==========================================
// Main Store State & Actions
// ==========================================

/**
 * Core NeetCode store state persisted in Zustand storage.
 */
export interface NeetcodeState {
  /** User progress keyed by problem ID */
  progress: Record<string, ProblemProgress>;

  /** Current roadmap position (order number of next unsolved problem, 1-150) */
  currentPosition: number;

  /** Active practice session, or null if idle */
  activeSession: PracticeSession | null;

  /** Completed session history log */
  sessionHistory: SessionHistoryEntry[];

  /** Last activity timestamp (ISO date string) */
  lastActivityDate?: string;

  /** Spaced repetition configuration */
  spacedRepetitionConfig: SpacedRepetitionConfig;

  /** Daily practice configuration */
  dailyPracticeConfig: DailyPracticeConfig;

  /** Reactivation configuration */
  reactivationConfig: ReactivationConfig;

  /** Date of last completed reactivation (ISO date string) */
  lastReactivationDate?: string;

  /** Date when reactivation prompt was dismissed (ISO date string) */
  reactivationDismissedAt?: string;
}

// ==========================================
// UI & Filter Types
// ==========================================

/**
 * Filter options for problem roadmap status.
 */
export type StatusFilter = 'all' | 'unattempted' | 'attempted' | 'solved' | 'needs_review';

/**
 * Criteria for filtering and searching problems in the UI.
 */
export interface ProblemFilterOptions {
  /** Filter by category name */
  category?: string;
  /** Filter by problem difficulty */
  difficulty?: Difficulty;
  /** Filter by completion/attempt status */
  status?: StatusFilter;
  /** Search text matching title or pattern */
  searchQuery?: string;
}

/**
 * Aggregated statistics for dashboard and progress tracking.
 */
export interface NeetcodeStats {
  totalProblems: number;
  solvedCount: number;
  solvedIndependentlyCount: number;
  solvedWithHintsCount: number;
  attemptedCount: number;
  needsReviewCount: number;
  dueForReviewCount: number;
  byDifficulty: Record<Difficulty, { total: number; solved: number }>;
  byCategory: Record<string, { total: number; solved: number }>;
}
