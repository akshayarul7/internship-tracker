import { useNeetcodeStore } from '@/store/useNeetcodeStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('--- Testing NeetCode Zustand Store ---');

// Reset store state
useNeetcodeStore.getState().resetAllProgress();
const state0 = useNeetcodeStore.getState();
assert(Object.keys(state0.progress).length === 0, 'Clean store has empty progress');
assert(state0.currentPosition === 1, 'Current position starts at 1');

// 1. Record Attempt: Solved with Hints (should NOT inflate independent solves)
useNeetcodeStore.getState().recordAttempt(
  'contains-duplicate',
  'solved_with_hints',
  3,
  'Used hash set approach',
  15
);

const state1 = useNeetcodeStore.getState();
const p1 = state1.progress['contains-duplicate'];
assert(p1 !== undefined, 'Progress recorded for contains-duplicate');
assert(p1.hasAttempted === true, 'hasAttempted is true');
assert(p1.hasSolvedWithHints === true, 'hasSolvedWithHints is true');
assert(p1.hasSolvedIndependently === false, 'hasSolvedIndependently is false (not inflated)');
assert(p1.attempts.length === 1, '1 attempt in history');
assert(p1.attempts[0].outcome === 'solved_with_hints', 'Attempt outcome recorded');
assert(p1.lastRecallRating === 3, 'Recall rating is 3');
assert(p1.nextReviewDate !== undefined, 'Next review date scheduled');
assert(state1.currentPosition === 2, 'Roadmap position advanced to 2');

// 2. Compatible State: Solved independently later
useNeetcodeStore.getState().recordAttempt(
  'contains-duplicate',
  'solved_independently',
  4,
  'Solved without hints on second try',
  10
);

const state2 = useNeetcodeStore.getState();
const p2 = state2.progress['contains-duplicate'];
assert(p2.hasSolvedIndependently === true, 'Now marked as solved independently');
assert(p2.hasSolvedWithHints === true, 'Prior solvedWithHints flag preserved');
assert(p2.attempts.length === 2, '2 attempts recorded in history');
assert(p2.lastRecallRating === 4, 'Recall updated to 4');

// 3. Mark for review later: Problem needs review despite being solved independently
useNeetcodeStore.getState().toggleNeedsReview('contains-duplicate');
const state3 = useNeetcodeStore.getState();
const p3 = state3.progress['contains-duplicate'];
assert(p3.needsReview === true, 'Problem marked as needsReview');
assert(p3.hasSolvedIndependently === true, 'Prior independent solve is NOT erased by review status');

// 4. Update personal notes & complexity
useNeetcodeStore.getState().updateProblemNotes('contains-duplicate', {
  keyApproach: 'Hash set for O(1) lookups',
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  understandsPattern: true,
});

const state4 = useNeetcodeStore.getState();
const p4 = state4.progress['contains-duplicate'];
assert(p4.keyApproach === 'Hash set for O(1) lookups', 'Key approach saved');
assert(p4.timeComplexity === 'O(n)', 'Time complexity saved');
assert(p4.understandsPattern === true, 'understandsPattern saved');

// 5. Record Review
useNeetcodeStore.getState().recordReview('contains-duplicate', 3, 'Reviewed pattern smoothly');
const state5 = useNeetcodeStore.getState();
const p5 = state5.progress['contains-duplicate'];
assert(p5.reviews.length === 1, 'Review record created in history');
assert(p5.needsReview === false, 'needsReview cleared after good recall (>=3)');
assert(p5.lastReviewDate !== undefined, 'lastReviewDate updated');

// 6. Practice Session Lifecycle
useNeetcodeStore.getState().startSession('daily', [
  { problemId: 'valid-anagram', type: 'new', completed: false },
  { problemId: 'two-sum', type: 'new', completed: false },
]);

const state6 = useNeetcodeStore.getState();
assert(state6.activeSession !== null, 'Active session started');
assert(state6.activeSession?.problems.length === 2, '2 problems in active session');
assert(state6.activeSession?.currentIndex === 0, 'Current index starts at 0');

// Complete first problem in session
useNeetcodeStore.getState().completeSessionProblem('valid-anagram');
useNeetcodeStore.getState().advanceSession();

const state7 = useNeetcodeStore.getState();
assert(state7.activeSession?.problems[0].completed === true, 'Problem 1 marked completed');
assert(state7.activeSession?.currentIndex === 1, 'Current index advanced to 1');

// End session
useNeetcodeStore.getState().endSession();
const state8 = useNeetcodeStore.getState();
assert(state8.activeSession === null, 'Active session cleared after ending');
assert(state8.sessionHistory.length === 1, 'Session logged in sessionHistory');
assert(state8.sessionHistory[0].problemsCompleted === 1, 'Logged 1 problem completed');

// Cleanup
useNeetcodeStore.getState().resetAllProgress();

console.log('\n🎉 ALL STORE VERIFICATION CHECKS PASSED!\n');
