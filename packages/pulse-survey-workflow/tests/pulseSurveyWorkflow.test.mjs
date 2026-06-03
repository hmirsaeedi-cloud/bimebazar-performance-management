import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  aggregatePulseAnswers,
  assertPulseSurveyHasEligibleRecipients,
  evaluateAnonymityGuard,
  getPulseSurveyState,
  pulseSurveyActions,
  pulseSurveyStatuses,
  transitionPulseSurveyState,
} from "../src/pulseSurveyWorkflow.mjs";

describe("pulseSurveyWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(pulseSurveyStatuses)) {
      const state = getPulseSurveyState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves pulse survey through start submit approve release complete", () => {
    const configured = transitionPulseSurveyState(pulseSurveyStatuses.DRAFT, pulseSurveyActions.CONFIGURE);
    const active = transitionPulseSurveyState(configured.status, pulseSurveyActions.START);
    const review = transitionPulseSurveyState(active.status, pulseSurveyActions.SUBMIT);
    const approved = transitionPulseSurveyState(review.status, pulseSurveyActions.APPROVE);
    const released = transitionPulseSurveyState(approved.status, pulseSurveyActions.RELEASE_RESULTS);
    const completed = transitionPulseSurveyState(released.status, pulseSurveyActions.COMPLETE);
    assert.equal(completed.status, pulseSurveyStatuses.COMPLETED);
  });

  test("returns anonymity review to HR Admin ownership", () => {
    const returned = transitionPulseSurveyState(pulseSurveyStatuses.ANONYMITY_REVIEW, pulseSurveyActions.RETURN);
    assert.equal(returned.status, pulseSurveyStatuses.RETURNED);
    assert.equal(returned.owner, "HR_ADMIN");
  });

  test("keeps visibility override explicit", () => {
    const changed = transitionPulseSurveyState(pulseSurveyStatuses.ACTIVE, pulseSurveyActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, pulseSurveyStatuses.VISIBILITY_CHANGED);
  });

  test("prevents zero eligible employees", () => {
    assert.throws(() => assertPulseSurveyHasEligibleRecipients([]), /zero eligible employees/);
  });

  test("guards aggregate release by minimum response count", () => {
    assert.deepEqual(evaluateAnonymityGuard({ responseCount: 2, minResponses: 3 }), {
      responseCount: 2,
      minResponses: 3,
      canRelease: false,
      missingResponses: 1,
    });
  });

  test("aggregates numeric answers without respondent identity", () => {
    const summary = aggregatePulseAnswers([
      { answers: { energy: 4, clarity: 3, comment: "ok" } },
      { answers: { energy: 2, clarity: 5 } },
    ]);
    assert.deepEqual(summary, { energy: 3, clarity: 4 });
  });
});
