import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  auditEventFingerprint,
  auditExportActions,
  auditExportStatuses,
  getAuditExportState,
  transitionAuditExportState,
  verifyAuditHashChain,
} from "../src/auditLogWorkflow.mjs";

describe("auditLogWorkflow", () => {
  test("represents every export state with status, owner, and nextAction", () => {
    for (const status of Object.values(auditExportStatuses)) {
      const state = getAuditExportState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves requested export through generated and verified", () => {
    const generated = transitionAuditExportState(auditExportStatuses.REQUESTED, auditExportActions.GENERATE);
    const verified = transitionAuditExportState(generated.status, auditExportActions.VERIFY);
    assert.equal(verified.status, auditExportStatuses.VERIFIED);
    assert.equal(verified.owner, "SYSTEM");
  });

  test("rejects verifying before generation", () => {
    assert.throws(() => transitionAuditExportState(auditExportStatuses.REQUESTED, auditExportActions.VERIFY), /not allowed/);
  });

  test("creates stable audit event fingerprints", () => {
    const event = {
      id: "1",
      actor_user_id: "a",
      target_user_id: "t",
      action: "profile.created",
      entity_type: "profile",
      entity_id: "p",
      metadata: { owner: "HR_ADMIN" },
      created_at: "2026-06-01T00:00:00.000Z",
    };
    assert.equal(auditEventFingerprint(event), auditEventFingerprint({ ...event }));
  });

  test("checks hash chain continuity", () => {
    assert.equal(verifyAuditHashChain([{ prev_event_hash: null, event_hash: "a" }, { prev_event_hash: "a", event_hash: "b" }]), true);
    assert.equal(verifyAuditHashChain([{ prev_event_hash: null, event_hash: "a" }, { prev_event_hash: "x", event_hash: "b" }]), false);
  });
});
