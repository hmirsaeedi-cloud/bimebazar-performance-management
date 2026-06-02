import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSurveyHasEligibleRecipients,
  getIndividualSurveyState,
  individualSurveyActions,
  individualSurveyStatuses,
  lockSurveyFormVersion,
  transitionIndividualSurveyState,
} from "../src/individualSurveyProcessWorkflow.mjs";

test("individual survey exposes explicit status, owner, and nextAction", () => {
  assert.deepEqual(getIndividualSurveyState(individualSurveyStatuses.DRAFT), {
    status: "draft",
    owner: "HR_ADMIN",
    nextAction: "configure",
  });
});

test("individual survey follows active submit approve complete chain", () => {
  const configured = transitionIndividualSurveyState(individualSurveyStatuses.DRAFT, individualSurveyActions.CONFIGURE);
  const active = transitionIndividualSurveyState(configured.status, individualSurveyActions.START);
  const submitted = transitionIndividualSurveyState(active.status, individualSurveyActions.SUBMIT);
  const approved = transitionIndividualSurveyState(submitted.status, individualSurveyActions.APPROVE);
  const completed = transitionIndividualSurveyState(approved.status, individualSurveyActions.COMPLETE);

  assert.equal(active.owner, "EMPLOYEE");
  assert.equal(submitted.owner, "HRBP");
  assert.equal(completed.status, "completed");
  assert.equal(completed.nextAction, null);
});

test("individual survey rejects zero eligible employees", () => {
  assert.throws(() => assertSurveyHasEligibleRecipients([]), /zero eligible employees/);
  assert.equal(assertSurveyHasEligibleRecipients(["employee-1"]), true);
});

test("individual survey locks selected form version for in-flight work", () => {
  const lock = lockSurveyFormVersion({ formTemplateVersionId: "version-1" });
  assert.deepEqual(lock, {
    formTemplateVersionId: "version-1",
    lockedFormTemplateVersionId: "version-1",
  });
});
