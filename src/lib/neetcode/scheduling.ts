import {
  addDays,
  differenceInDays,
  startOfDay,
  isBefore,
  isEqual,
  parseISO,
} from 'date-fns';
import {
  RecallRating,
  SpacedRepetitionConfig,
  ProblemProgress,
  DailyPracticeConfig,
  SessionProblem,
} from '@/types/neetcode';
import { NEETCODE_PROBLEMS } from '@/data/neetcode150';

/**
 * Default intervals (in days) for recall ratings 1 to 4:
 * 1: Forgotten -> review in 1 day
 * 2: Weak -> review in 3 days
 * 3: Good -> review in 14 days
 * 4: Strong -> review in 30 days
 */
export const DEFAULT_SPACED_REPETITION_CONFIG: SpacedRepetitionConfig = {
  intervals: {
    4: 30,
    3: 14,
    2: 3,
    1: 1,
  },
};

/**
 * Helper to safely parse an ISO date string or Date instance into a Date object.
 */
function parseSafeDate(date: string | Date | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  try {
    const parsed = parseISO(date);
    if (!isNaN(parsed.getTime())) return parsed;
    const fallback = new Date(date);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
}

/**
 * Helper to normalize a date to the start of its local day.
 */
function toStartOfDay(date: string | Date | undefined): Date | null {
  const d = parseSafeDate(date);
  return d ? startOfDay(d) : null;
}

/**
 * 1. Calculates the next spaced repetition review date for a problem.
 *
 * @param recallRating User recall score (1 to 4)
 * @param config Spaced repetition configuration specifying intervals
 * @param currentDate Optional anchor date for calculations (defaults to current date)
 * @returns ISO 8601 string representing next review date
 */
export function calculateNextReviewDate(
  recallRating: RecallRating,
  config?: SpacedRepetitionConfig,
  currentDate?: Date
): string {
  const intervals = config?.intervals ?? DEFAULT_SPACED_REPETITION_CONFIG.intervals;
  const daysToAdd =
    intervals[recallRating] ?? DEFAULT_SPACED_REPETITION_CONFIG.intervals[recallRating] ?? 1;

  const base = currentDate ? new Date(currentDate) : new Date();
  return addDays(base, daysToAdd).toISOString();
}

/**
 * 2. Checks if a problem is due for review (scheduled on or before today).
 *
 * @param nextReviewDate Scheduled review date as ISO string
 * @param currentDate Optional reference date (defaults to current date)
 * @returns true if nextReviewDate is on or before today
 */
export function isReviewDue(
  nextReviewDate: string | undefined,
  currentDate?: Date
): boolean {
  if (!nextReviewDate) return false;
  const reviewDay = toStartOfDay(nextReviewDate);
  if (!reviewDay) return false;

  const today = startOfDay(currentDate ? new Date(currentDate) : new Date());
  return isBefore(reviewDay, today) || isEqual(reviewDay, today);
}

/**
 * 3. Checks if a review is overdue (strictly before today).
 *
 * @param nextReviewDate Scheduled review date as ISO string
 * @param currentDate Optional reference date (defaults to current date)
 * @returns true if nextReviewDate has passed prior to today
 */
export function isReviewOverdue(
  nextReviewDate: string | undefined,
  currentDate?: Date
): boolean {
  if (!nextReviewDate) return false;
  const reviewDay = toStartOfDay(nextReviewDate);
  if (!reviewDay) return false;

  const today = startOfDay(currentDate ? new Date(currentDate) : new Date());
  return isBefore(reviewDay, today);
}

/**
 * 4. Categorizes progress records into problems due today vs overdue.
 *
 * @param progress Record of problem progresses keyed by problem ID
 * @param currentDate Optional reference date (defaults to current date)
 * @returns Object with dueToday and overdue problem ID lists
 */
export function getDueProblems(
  progress: Record<string, ProblemProgress>,
  currentDate?: Date
): { dueToday: string[]; overdue: string[] } {
  const dueToday: string[] = [];
  const overdue: string[] = [];
  const today = currentDate ? new Date(currentDate) : new Date();

  for (const [problemId, p] of Object.entries(progress)) {
    if (!p) continue;

    if (p.nextReviewDate) {
      if (isReviewOverdue(p.nextReviewDate, today)) {
        overdue.push(problemId);
      } else if (isReviewDue(p.nextReviewDate, today)) {
        dueToday.push(problemId);
      }
    } else if (p.needsReview) {
      dueToday.push(problemId);
    }
  }

  return { dueToday, overdue };
}

/**
 * 5. Computes a numeric review priority score for a problem.
 * Higher scores indicate higher urgency for review.
 * Factors:
 *  - Overdue duration (days past due)
 *  - Weak recall rating (lower rating increases urgency)
 *  - Elapsed time since last review / attempt
 *  - Failed or struggling attempts (solution viewed, hints, pattern not understood)
 *
 * @param problem User progress record for the problem
 * @param currentDate Optional reference date (defaults to current date)
 * @returns Priority score (higher = higher review priority)
 */
export function getReviewPriority(
  problem: ProblemProgress,
  currentDate?: Date
): number {
  if (!problem) return 0;
  const today = startOfDay(currentDate ? new Date(currentDate) : new Date());
  let priority = 0;

  // 1. Overdue duration factor
  if (problem.nextReviewDate) {
    const reviewDay = toStartOfDay(problem.nextReviewDate);
    if (reviewDay) {
      if (isBefore(reviewDay, today)) {
        const daysOverdue = Math.max(0, differenceInDays(today, reviewDay));
        // Up to 300 points for being overdue
        priority += Math.min(daysOverdue * 15, 300);
      } else if (isEqual(reviewDay, today)) {
        priority += 50; // Due today base priority
      }
    }
  } else if (problem.needsReview) {
    priority += 60;
  }

  // 2. Weak recall rating factor
  if (problem.lastRecallRating !== undefined) {
    const recallPriorityMap: Record<RecallRating, number> = {
      1: 120, // Forgotten
      2: 80,  // Weak
      3: 30,  // Good
      4: 5,   // Strong
    };
    priority += recallPriorityMap[problem.lastRecallRating] ?? 0;
  } else if (problem.hasAttempted || (problem.attempts && problem.attempts.length > 0)) {
    priority += 40;
  }

  // 3. Older last review / last attempt factor
  const lastActiveStr =
    problem.lastReviewDate ?? problem.lastAttemptDate ?? problem.firstAttemptDate;
  if (lastActiveStr) {
    const lastActiveDay = toStartOfDay(lastActiveStr);
    if (lastActiveDay) {
      const daysSince = Math.max(0, differenceInDays(today, lastActiveDay));
      // 1 point per elapsed day, capped at 90 points
      priority += Math.min(daysSince, 90);
    }
  }

  // 4. Failed attempts / difficulty indicators
  if (Array.isArray(problem.attempts) && problem.attempts.length > 0) {
    const failedAttempts = problem.attempts.filter(
      (a) => a.outcome === 'attempted' || a.outcome === 'solution_viewed'
    ).length;
    priority += failedAttempts * 25;
  }

  if (problem.hasSolutionViewed && !problem.hasSolvedIndependently) {
    priority += 35;
  } else if (problem.hasSolvedWithHints && !problem.hasSolvedIndependently) {
    priority += 20;
  }

  if (problem.understandsPattern === false) {
    priority += 30;
  }

  return priority;
}

/**
 * 6. Selects diagnostic problems for reactivation after a long break.
 * Prioritizes: weak recall, overdue reviews, older attempts, diversity of categories.
 * Each problem includes an informative reason explaining its selection.
 *
 * @param progress Record of user progress
 * @param problemCount Number of diagnostic problems to return (typically 5-10, e.g. 8)
 * @param currentDate Optional reference date (defaults to current date)
 * @returns Array of problem IDs with rationale reasons
 */
export function getReactivationProblems(
  progress: Record<string, ProblemProgress>,
  problemCount: number,
  currentDate?: Date
): { problemId: string; reason: string }[] {
  if (problemCount <= 0) return [];
  const today = startOfDay(currentDate ? new Date(currentDate) : new Date());

  // Category lookup from roadmap dataset
  const metaMap = new Map<string, { category: string; order: number }>();
  for (const p of NEETCODE_PROBLEMS) {
    metaMap.set(p.id, {
      category: p.category,
      order: p.order,
    });
  }

  interface Candidate {
    problemId: string;
    priority: number;
    category: string;
    reason: string;
  }

  const candidates: Candidate[] = [];

  for (const [id, p] of Object.entries(progress)) {
    if (!p) continue;

    // Only problems the user has previously engaged with qualify for reactivation
    const hasPracticed =
      p.hasAttempted ||
      (Array.isArray(p.attempts) && p.attempts.length > 0) ||
      p.hasSolvedIndependently ||
      p.hasSolvedWithHints ||
      p.hasSolutionViewed ||
      p.lastRecallRating !== undefined ||
      Boolean(p.lastReviewDate);

    if (!hasPracticed) continue;

    const meta = metaMap.get(id);
    const category = meta?.category ?? 'General';
    const priority = getReviewPriority(p, today);

    // Calculate days overdue
    let daysOverdue = 0;
    if (p.nextReviewDate) {
      const reviewDay = toStartOfDay(p.nextReviewDate);
      if (reviewDay) {
        daysOverdue = Math.max(0, differenceInDays(today, reviewDay));
      }
    }

    // Calculate days since last practice
    let daysSinceLast = 0;
    const lastActiveStr = p.lastReviewDate ?? p.lastAttemptDate ?? p.firstAttemptDate;
    if (lastActiveStr) {
      const lastActiveDay = toStartOfDay(lastActiveStr);
      if (lastActiveDay) {
        daysSinceLast = Math.max(0, differenceInDays(today, lastActiveDay));
      }
    }

    // Build explanatory reason string (e.g. "Overdue by 45 days, last recall was weak")
    const reasonParts: string[] = [];

    if (daysOverdue > 0) {
      reasonParts.push(`Overdue by ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}`);
    } else if (p.nextReviewDate && isReviewDue(p.nextReviewDate, today)) {
      reasonParts.push('Review due today');
    } else if (daysSinceLast > 0) {
      reasonParts.push(`Practiced ${daysSinceLast} ${daysSinceLast === 1 ? 'day' : 'days'} ago`);
    }

    if (p.lastRecallRating !== undefined) {
      const recallLabels: Record<RecallRating, string> = {
        1: 'last recall was forgotten',
        2: 'last recall was weak',
        3: 'last recall was good',
        4: 'last recall was strong',
      };
      reasonParts.push(recallLabels[p.lastRecallRating]);
    } else if (p.hasSolutionViewed && !p.hasSolvedIndependently) {
      reasonParts.push('solution was viewed');
    } else if (p.hasSolvedWithHints && !p.hasSolvedIndependently) {
      reasonParts.push('solved with hints');
    } else if (p.understandsPattern === false) {
      reasonParts.push('pattern not mastered');
    }

    let reason = reasonParts.join(', ');
    if (!reason) {
      reason = 'Selected for reactivation review';
    } else {
      reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    }

    candidates.push({
      problemId: id,
      priority,
      category,
      reason,
    });
  }

  // Sort candidate pool by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length <= problemCount) {
    return candidates.map((c) => ({ problemId: c.problemId, reason: c.reason }));
  }

  // Ensure category diversity across selected problems
  const selected: { problemId: string; reason: string }[] = [];
  const selectedIds = new Set<string>();
  const categoryCounts = new Map<string, number>();

  // Pass 1: Select top candidate per category
  for (const item of candidates) {
    if (selected.length >= problemCount) break;
    const count = categoryCounts.get(item.category) || 0;
    if (count === 0) {
      selected.push({ problemId: item.problemId, reason: item.reason });
      selectedIds.add(item.problemId);
      categoryCounts.set(item.category, count + 1);
    }
  }

  // Pass 2: Select up to 2 candidates per category if more slots remain
  if (selected.length < problemCount) {
    for (const item of candidates) {
      if (selected.length >= problemCount) break;
      if (selectedIds.has(item.problemId)) continue;
      const count = categoryCounts.get(item.category) || 0;
      if (count < 2) {
        selected.push({ problemId: item.problemId, reason: item.reason });
        selectedIds.add(item.problemId);
        categoryCounts.set(item.category, count + 1);
      }
    }
  }

  // Pass 3: Fill any remaining slots by highest priority regardless of category
  if (selected.length < problemCount) {
    for (const item of candidates) {
      if (selected.length >= problemCount) break;
      if (selectedIds.has(item.problemId)) continue;
      selected.push({ problemId: item.problemId, reason: item.reason });
      selectedIds.add(item.problemId);
    }
  }

  return selected;
}

/**
 * 7. Checks whether a user has been inactive for at least thresholdDays.
 *
 * @param lastActivityDate ISO date string of last user activity
 * @param thresholdDays Minimum inactivity duration in days
 * @param currentDate Optional reference date (defaults to current date)
 * @returns true if inactivity duration >= thresholdDays
 */
export function isInactive(
  lastActivityDate: string | undefined,
  thresholdDays: number,
  currentDate?: Date
): boolean {
  if (!lastActivityDate) return false;
  const lastActiveDay = toStartOfDay(lastActivityDate);
  if (!lastActiveDay) return false;

  const today = startOfDay(currentDate ? new Date(currentDate) : new Date());
  const elapsedDays = differenceInDays(today, lastActiveDay);
  return elapsedDays >= thresholdDays;
}

/**
 * 8. Generates a daily practice session mixing review and new roadmap problems.
 * - Review problems: selected from due/overdue, limited by config.maxOverduePerSession
 * - New problems: chosen from currentPosition onward in roadmap order
 * - Total session problems capped at config.maxProblemsPerSession
 * - Each item includes an explanatory rationale string
 *
 * @param progress Record of user problem progresses
 * @param config Daily practice configuration settings
 * @param currentPosition Current sequential roadmap position (1-150)
 * @param currentDate Optional reference date (defaults to current date)
 * @returns Array of SessionProblem entries ready for practice
 */
export function generateDailySession(
  progress: Record<string, ProblemProgress>,
  config: DailyPracticeConfig,
  currentPosition: number,
  currentDate?: Date
): SessionProblem[] {
  const today = currentDate ? new Date(currentDate) : new Date();
  const maxTotal = config.maxProblemsPerSession > 0 ? config.maxProblemsPerSession : 5;
  const maxOverdue =
    config.maxOverduePerSession !== undefined ? config.maxOverduePerSession : 3;

  // 1. Gather all due / overdue review candidates
  const { dueToday, overdue } = getDueProblems(progress, today);
  const reviewCandidateIds = Array.from(new Set([...overdue, ...dueToday]));

  // Sort reviews by priority descending
  reviewCandidateIds.sort(
    (a, b) => getReviewPriority(progress[b], today) - getReviewPriority(progress[a], today)
  );

  // 2. Identify new problems from currentPosition onward
  const isProblemSolved = (id: string) => {
    const p = progress[id];
    return Boolean(p?.hasSolvedIndependently || p?.hasSolvedWithHints);
  };

  const sortedRoadmap = [...NEETCODE_PROBLEMS].sort((a, b) => a.order - b.order);

  // Candidate new problems: starting at currentPosition onward, then wrapping before if needed
  const newCandidateProblems = sortedRoadmap
    .filter((p) => !isProblemSolved(p.id) && p.order >= currentPosition)
    .concat(sortedRoadmap.filter((p) => !isProblemSolved(p.id) && p.order < currentPosition));

  // 3. Determine problem quota distribution based on percentages and caps
  const reviewPercentage = config.reviewPercentage ?? 20;
  const targetReviewCount = Math.round((maxTotal * reviewPercentage) / 100);

  let reviewCount = Math.min(targetReviewCount, maxOverdue, reviewCandidateIds.length);
  let newCount = Math.min(maxTotal - reviewCount, newCandidateProblems.length);

  // Fill spare slots if new problems are exhausted
  const remainingSlots = maxTotal - (reviewCount + newCount);
  if (remainingSlots > 0 && reviewCandidateIds.length > reviewCount) {
    const additionalReviews = Math.min(
      remainingSlots,
      maxOverdue - reviewCount,
      reviewCandidateIds.length - reviewCount
    );
    if (additionalReviews > 0) {
      reviewCount += additionalReviews;
    }
  }

  // Expand new problems if no reviews are due
  if (reviewCount === 0) {
    newCount = Math.min(maxTotal, newCandidateProblems.length);
  } else if (reviewCount + newCount < maxTotal && newCandidateProblems.length > newCount) {
    newCount = Math.min(maxTotal - reviewCount, newCandidateProblems.length);
  }

  const sessionProblems: SessionProblem[] = [];

  // 4. Add review problems
  for (let i = 0; i < reviewCount; i++) {
    const id = reviewCandidateIds[i];
    const p = progress[id];
    let reason = 'Review due today';

    if (p?.nextReviewDate) {
      if (isReviewOverdue(p.nextReviewDate, today)) {
        const reviewDay = toStartOfDay(p.nextReviewDate);
        const days = reviewDay
          ? Math.max(0, differenceInDays(startOfDay(today), reviewDay))
          : 0;
        reason = `Overdue for review by ${days} ${days === 1 ? 'day' : 'days'}`;
      } else {
        reason = 'Scheduled review due today';
      }
    } else if (p?.needsReview) {
      reason = 'Flagged for review';
    }

    sessionProblems.push({
      problemId: id,
      type: 'review',
      reason,
      completed: false,
    });
  }

  // 5. Add new roadmap problems
  for (let i = 0; i < newCount; i++) {
    const problem = newCandidateProblems[i];
    const reason = `Next problem in roadmap (#${problem.order} - ${problem.category})`;

    sessionProblems.push({
      problemId: problem.id,
      type: 'new',
      reason,
      completed: false,
    });
  }

  return sessionProblems;
}

/**
 * 9. Evaluates diagnostic reactivation results and provides next-step recommendations.
 * - If average recall < 2.5, recommends further review before new problems.
 * - Computes nextPosition as the earliest unfinished problem in the roadmap.
 *
 * @param progress Record of user problem progresses
 * @param reactivationResults Diagnostic problem recall results
 * @returns Recommendation object with shouldReviewMore flag, nextPosition, and message
 */
export function getRecommendationAfterReactivation(
  progress: Record<string, ProblemProgress>,
  reactivationResults: { problemId: string; recallRating: RecallRating }[]
): { shouldReviewMore: boolean; nextPosition: number; message: string } {
  // 1. Calculate average recall rating
  let averageRecall = 0;
  if (reactivationResults && reactivationResults.length > 0) {
    const totalRecall = reactivationResults.reduce((acc, curr) => acc + curr.recallRating, 0);
    averageRecall = totalRecall / reactivationResults.length;
  }

  const shouldReviewMore =
    reactivationResults && reactivationResults.length > 0 ? averageRecall < 2.5 : false;

  // 2. Determine earliest unfinished problem's order number
  const sorted = [...NEETCODE_PROBLEMS].sort((a, b) => a.order - b.order);
  let nextPosition = 1;

  const firstUnfinished = sorted.find((p) => {
    const prog = progress[p.id];
    const isFinished = Boolean(prog?.hasSolvedIndependently || prog?.hasSolvedWithHints);
    return !isFinished;
  });

  if (firstUnfinished) {
    nextPosition = firstUnfinished.order;
  } else if (sorted.length > 0) {
    nextPosition = sorted[sorted.length - 1].order + 1;
  }

  // 3. Construct human-readable message
  let message = '';
  if (!reactivationResults || reactivationResults.length === 0) {
    message = `Ready to continue practice at roadmap position #${nextPosition}.`;
  } else if (shouldReviewMore) {
    message = `Average recall was ${averageRecall.toFixed(
      1
    )} / 4.0. We recommend reviewing key patterns before advancing to new problems at roadmap position #${nextPosition}.`;
  } else {
    message = `Great recall score of ${averageRecall.toFixed(
      1
    )} / 4.0! Your foundation is sharp and ready to continue new problems starting at roadmap position #${nextPosition}.`;
  }

  return {
    shouldReviewMore,
    nextPosition,
    message,
  };
}

/**
 * 10. Maps a numeric recall rating (1-4) to its human-readable label.
 *
 * @param rating RecallRating (1, 2, 3, or 4)
 * @returns Human description: 'Forgotten' | 'Weak' | 'Good' | 'Strong'
 */
export function getRecallDescription(rating: RecallRating): string {
  switch (rating) {
    case 1:
      return 'Forgotten';
    case 2:
      return 'Weak';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

/**
 * 11. Formats a spaced repetition interval description string.
 *
 * @param rating RecallRating
 * @param config Spaced repetition configuration
 * @returns Description such as 'Review in 14 days'
 */
export function getIntervalDescription(
  rating: RecallRating,
  config: SpacedRepetitionConfig
): string {
  const intervals = config?.intervals ?? DEFAULT_SPACED_REPETITION_CONFIG.intervals;
  const days =
    intervals[rating] ?? DEFAULT_SPACED_REPETITION_CONFIG.intervals[rating] ?? 1;

  return days === 1 ? 'Review in 1 day' : `Review in ${days} days`;
}
