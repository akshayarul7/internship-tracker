import { NEETCODE_PROBLEMS, NEETCODE_CATEGORIES } from '@/data/neetcode150';
import {
  calculateNextReviewDate,
  isReviewDue,
  isReviewOverdue,
  getDueProblems,
  getReviewPriority,
  getReactivationProblems,
  isInactive,
  generateDailySession,
  getRecommendationAfterReactivation,
  getRecallDescription,
  getIntervalDescription,
} from '@/lib/neetcode/scheduling';
import type { ProblemProgress, SpacedRepetitionConfig, DailyPracticeConfig, RecallRating } from '@/types/neetcode';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing NeetCode 150 Metadata ---');

// 1. Exactly 18 categories in order
assert(NEETCODE_CATEGORIES.length === 18, 'There are exactly 18 categories');
assert(NEETCODE_CATEGORIES[0] === 'Arrays & Hashing', 'Category 1 is Arrays & Hashing');
assert(NEETCODE_CATEGORIES[17] === 'Bit Manipulation', 'Category 18 is Bit Manipulation');

// 2. Exactly 150 problems
assert(NEETCODE_PROBLEMS.length === 150, 'There are exactly 150 problems');

// 3. Orders 1 to 150 sequential
const orders = NEETCODE_PROBLEMS.map(p => p.order);
const expectedOrders = Array.from({ length: 150 }, (_, i) => i + 1);
assert(JSON.stringify(orders) === JSON.stringify(expectedOrders), 'Problems are ordered 1 to 150 sequentially');

// 4. Stable IDs and valid URLs
const idSet = new Set<string>();
for (const p of NEETCODE_PROBLEMS) {
  assert(!idSet.has(p.id), `Unique problem ID: ${p.id}`);
  idSet.add(p.id);
  assert(p.leetcodeUrl.startsWith('https://leetcode.com/problems/'), `Valid LeetCode URL for ${p.id}`);
  assert(['Easy', 'Medium', 'Hard'].includes(p.difficulty), `Valid difficulty for ${p.id}: ${p.difficulty}`);
  assert(NEETCODE_CATEGORIES.includes(p.category as any), `Valid category for ${p.id}: ${p.category}`);
}

console.log('\n--- Testing Spaced Repetition Scheduling ---');

const testConfig: SpacedRepetitionConfig = {
  intervals: { 4: 30, 3: 14, 2: 3, 1: 1 },
};

const baseDate = new Date('2026-10-01T12:00:00Z');

// Next review calculation
const next4 = calculateNextReviewDate(4, testConfig, baseDate);
assert(next4.startsWith('2026-10-31'), 'Rating 4 (Strong) adds 30 days');

const next3 = calculateNextReviewDate(3, testConfig, baseDate);
assert(next3.startsWith('2026-10-15'), 'Rating 3 (Good) adds 14 days');

const next2 = calculateNextReviewDate(2, testConfig, baseDate);
assert(next2.startsWith('2026-10-04'), 'Rating 2 (Weak) adds 3 days');

const next1 = calculateNextReviewDate(1, testConfig, baseDate);
assert(next1.startsWith('2026-10-02'), 'Rating 1 (Forgotten) adds 1 day');

// Due / Overdue logic
const today = new Date('2026-10-10T12:00:00Z');
assert(isReviewDue('2026-10-10T08:00:00Z', today), 'Problem scheduled for today is due');
assert(isReviewDue('2026-10-05T08:00:00Z', today), 'Problem scheduled in the past is due');
assert(!isReviewDue('2026-10-12T08:00:00Z', today), 'Problem scheduled in the future is not due');

assert(isReviewOverdue('2026-10-09T08:00:00Z', today), 'Problem scheduled yesterday is overdue');
assert(!isReviewOverdue('2026-10-10T08:00:00Z', today), 'Problem scheduled today is NOT overdue');

// getDueProblems test
const mockProgress: Record<string, ProblemProgress> = {
  'two-sum': {
    problemId: 'two-sum',
    hasAttempted: true,
    hasSolvedIndependently: true,
    hasSolvedWithHints: false,
    hasSolutionViewed: false,
    needsReview: false,
    understandsPattern: true,
    nextReviewDate: '2026-10-05T00:00:00Z', // overdue
    attempts: [],
    reviews: [],
  },
  'valid-anagram': {
    problemId: 'valid-anagram',
    hasAttempted: true,
    hasSolvedIndependently: true,
    hasSolvedWithHints: false,
    hasSolutionViewed: false,
    needsReview: false,
    understandsPattern: true,
    nextReviewDate: '2026-10-10T12:00:00Z', // due today
    attempts: [],
    reviews: [],
  },
  'group-anagrams': {
    problemId: 'group-anagrams',
    hasAttempted: true,
    hasSolvedIndependently: false,
    hasSolvedWithHints: true,
    hasSolutionViewed: false,
    needsReview: false,
    understandsPattern: true,
    nextReviewDate: '2026-10-20T00:00:00Z', // future
    attempts: [],
    reviews: [],
  },
};

const dueResult = getDueProblems(mockProgress, today);
assert(dueResult.overdue.includes('two-sum'), 'two-sum is in overdue queue');
assert(dueResult.dueToday.includes('valid-anagram'), 'valid-anagram is in dueToday queue');
assert(!dueResult.dueToday.includes('group-anagrams') && !dueResult.overdue.includes('group-anagrams'), 'group-anagrams is not due');

console.log('\n--- Testing Inactivity & Reactivation ---');

const recentDate = '2026-10-08T00:00:00Z'; // 2 days ago
const oldDate = '2026-09-10T00:00:00Z';    // 30 days ago
assert(!isInactive(recentDate, 14, today), '2 days of absence does not trigger reactivation');
assert(isInactive(oldDate, 14, today), '30 days of absence triggers reactivation');

// Reactivation problem selection diversity
const reactivationProgress: Record<string, ProblemProgress> = {};
for (let i = 0; i < 40; i++) {
  const p = NEETCODE_PROBLEMS[i];
  reactivationProgress[p.id] = {
    problemId: p.id,
    hasAttempted: true,
    hasSolvedIndependently: i % 2 === 0,
    hasSolvedWithHints: i % 2 !== 0,
    hasSolutionViewed: false,
    needsReview: i % 5 === 0,
    understandsPattern: i % 3 === 0,
    lastRecallRating: ((i % 4) + 1) as RecallRating,
    lastAttemptDate: '2026-08-01T00:00:00Z',
    nextReviewDate: '2026-08-15T00:00:00Z',
    attempts: [],
    reviews: [],
  };
}

const reactivationSelection = getReactivationProblems(reactivationProgress, 8, today);
assert(reactivationSelection.length === 8, 'Selects requested 8 diagnostic problems');
assert(reactivationSelection.every(s => s.reason.length > 0), 'Every diagnostic problem has an explanation reason');

// Diversity check: problems come from multiple categories
const selectedCategories = new Set(
  reactivationSelection.map(s => NEETCODE_PROBLEMS.find(p => p.id === s.problemId)?.category)
);
assert(selectedCategories.size >= 3, `Diverse categories selected: ${selectedCategories.size} categories`);

// Reactivation recommendation
const goodResults = reactivationSelection.map(s => ({ problemId: s.problemId, recallRating: 4 as RecallRating }));
const recGood = getRecommendationAfterReactivation(reactivationProgress, goodResults);
assert(!recGood.shouldReviewMore, 'High recall results recommend continuing new problems');
assert(recGood.nextPosition === 41, `Next position is earliest unsolved problem: ${recGood.nextPosition}`);

const weakResults = reactivationSelection.map(s => ({ problemId: s.problemId, recallRating: 1 as RecallRating }));
const recWeak = getRecommendationAfterReactivation(reactivationProgress, weakResults);
assert(recWeak.shouldReviewMore, 'Weak recall results recommend reviewing more');

console.log('\n--- Testing Daily Practice Session Allocation ---');

const dailyConfig: DailyPracticeConfig = {
  reviewPercentage: 20,
  newPercentage: 80,
  maxProblemsPerSession: 5,
  maxOverduePerSession: 3,
};

const session = generateDailySession(reactivationProgress, dailyConfig, 41, today);
assert(session.length <= dailyConfig.maxProblemsPerSession, `Session problem count within limit: ${session.length}`);
const reviewProblemsInSession = session.filter(s => s.type === 'review');
const newProblemsInSession = session.filter(s => s.type === 'new');
assert(reviewProblemsInSession.length <= dailyConfig.maxOverduePerSession, 'Overdue review count is capped');
assert(newProblemsInSession.length > 0, 'New problems included in daily session');
assert(newProblemsInSession[0].problemId === NEETCODE_PROBLEMS[40].id, `First new problem matches currentPosition #41 (${NEETCODE_PROBLEMS[40].id})`);

console.log('\n🎉 ALL 18 VERIFICATION CHECKS PASSED!\n');
