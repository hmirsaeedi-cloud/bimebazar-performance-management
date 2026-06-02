import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getPromotionState,
  normalizePromotionPayload,
  promotionActions,
  promotionStatuses,
  transitionPromotionState,
} from "../src/promotionWorkflow.mjs";

describe("promotionWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(promotionStatuses)) {
      const state = getPromotionState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves promotion through manager HRBP and final approval", () => {
    const submitted = transitionPromotionState(promotionStatuses.DRAFT, promotionActions.SUBMIT);
    const managerApproved = transitionPromotionState(submitted.status, promotionActions.MANAGER_APPROVE);
    const hrbpApproved = transitionPromotionState(managerApproved.status, promotionActions.HRBP_APPROVE);
    const approved = transitionPromotionState(hrbpApproved.status, promotionActions.APPROVE);
    assert.equal(approved.status, promotionStatuses.APPROVED);
    assert.equal(approved.owner, "SYSTEM");
  });

  test("returns submitted promotions to manager ownership", () => {
    const returned = transitionPromotionState(promotionStatuses.SUBMITTED, promotionActions.RETURN);
    assert.equal(returned.status, promotionStatuses.RETURNED);
    assert.equal(returned.owner, "MANAGER");
  });

  test("normalizes promotion payload text", () => {
    const payload = normalizePromotionPayload({ currentLevel: " L2 ", proposedLevel: " L3 ", rationale: " ready " });
    assert.equal(payload.currentLevel, "L2");
    assert.equal(payload.proposedLevel, "L3");
    assert.equal(payload.rationale, "ready");
  });
});
