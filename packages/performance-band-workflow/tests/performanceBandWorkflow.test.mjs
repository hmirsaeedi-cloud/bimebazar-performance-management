import assert from "node:assert/strict";
import test from "node:test";
import {
  assertScoreMayBeFlagged,
  bandFlagActions,
  bandFlagStatuses,
  classifyPerformanceBand,
  getBandFlagState,
  transitionBandFlagState,
} from "../src/performanceBandWorkflow.mjs";

test("performance band flags expose explicit status, owner, and nextAction", () => {
  assert.deepEqual(getBandFlagState(bandFlagStatuses.DETECTED), {
    status: "detected",
    owner: "HRBP",
    nextAction: "submit",
  });
});

test("performance band flags move through review approval and conversion", () => {
  const review = transitionBandFlagState(bandFlagStatuses.DETECTED, bandFlagActions.SUBMIT);
  const approved = transitionBandFlagState(review.status, bandFlagActions.APPROVE);
  const converted = transitionBandFlagState(approved.status, bandFlagActions.CONVERT);

  assert.equal(review.owner, "HRBP");
  assert.equal(approved.owner, "HR_ADMIN");
  assert.equal(converted.status, "converted");
  assert.equal(converted.nextAction, null);
});

test("performance band classification detects PIP promotion and neutral bands", () => {
  assert.equal(classifyPerformanceBand(42).flagType, "pip");
  assert.equal(classifyPerformanceBand(95).flagType, "promotion");
  assert.equal(classifyPerformanceBand(75).flagType, "none");
});

test("performance band flags run only after weighted score is visible", () => {
  assert.throws(() => assertScoreMayBeFlagged({ visible: false, totalScore: null }), /visible submitted scores/);
  assert.equal(assertScoreMayBeFlagged({ visible: true, totalScore: 90 }), true);
});
