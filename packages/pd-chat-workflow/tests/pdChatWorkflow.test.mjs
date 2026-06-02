import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  appendChatMessage,
  getPdChatAttachmentState,
  getPdChatState,
  pdChatAttachmentActions,
  pdChatAttachmentStatuses,
  pdChatActions,
  pdChatStatuses,
  transitionPdChatAttachmentState,
  transitionPdChatState,
} from "../src/pdChatWorkflow.mjs";

describe("pdChatWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(pdChatStatuses)) {
      const state = getPdChatState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves chat from employee draft through manager review", () => {
    const active = transitionPdChatState(pdChatStatuses.DRAFT, pdChatActions.UPDATE);
    const submitted = transitionPdChatState(active.status, pdChatActions.SUBMIT);
    const reviewed = transitionPdChatState(submitted.status, pdChatActions.APPROVE);
    const visible = transitionPdChatState(reviewed.status, pdChatActions.OVERRIDE_VISIBILITY);
    assert.equal(visible.status, pdChatStatuses.VISIBILITY_APPROVED);
    assert.equal(visible.owner, "EMPLOYEE_MANAGER");
  });

  test("returns submitted chat to employee ownership", () => {
    const returned = transitionPdChatState(pdChatStatuses.SUBMITTED, pdChatActions.RETURN);
    assert.equal(returned.status, pdChatStatuses.RETURNED);
    assert.equal(returned.owner, "EMPLOYEE");
  });

  test("rejects manager approval before submit", () => {
    assert.throws(() => transitionPdChatState(pdChatStatuses.ACTIVE, pdChatActions.APPROVE), /not allowed/);
  });

  test("appends normalized chat messages", () => {
    const messages = appendChatMessage([], {
      id: "m1",
      authorId: "u1",
      authorRole: "EMPLOYEE",
      body: "  Growth goal discussed. ",
      createdAt: "2026-05-31T00:00:00.000Z",
    });
    assert.equal(messages[0].body, "Growth goal discussed.");
    assert.equal(messages[0].visibility, "employee_manager");
  });

  test("represents PD Chat attachment states with status owner and nextAction", () => {
    for (const status of Object.values(pdChatAttachmentStatuses)) {
      const state = getPdChatAttachmentState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("auto-attaches a matched PD Chat to an evaluation", () => {
    const state = transitionPdChatAttachmentState(pdChatAttachmentStatuses.MATCHED, pdChatAttachmentActions.AUTO_ATTACH);
    assert.equal(state.status, pdChatAttachmentStatuses.ATTACHED);
    assert.equal(state.owner, "SYSTEM");
    assert.equal(state.nextAction, null);
  });

  test("routes missing PD Chat attachments to manager override", () => {
    const state = transitionPdChatAttachmentState(pdChatAttachmentStatuses.MATCHED, pdChatAttachmentActions.MARK_MISSING);
    assert.equal(state.status, pdChatAttachmentStatuses.MISSING_CHAT);
    assert.equal(state.owner, "MANAGER");
    assert.equal(state.nextAction, pdChatAttachmentActions.OVERRIDE_ATTACH);
  });
});
