import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrgChartSnapshot,
  getProfileOrgChartState,
  profileOrgChartActions,
  profileOrgChartStatuses,
  transitionProfileOrgChartState,
} from "../src/profileOrgChartWorkflow.mjs";

describe("profileOrgChartWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(profileOrgChartStatuses)) {
      const state = getProfileOrgChartState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves org chart through submit approve and activate", () => {
    const submitted = transitionProfileOrgChartState(profileOrgChartStatuses.DRAFT, profileOrgChartActions.SUBMIT);
    const approved = transitionProfileOrgChartState(submitted.status, profileOrgChartActions.APPROVE);
    const active = transitionProfileOrgChartState(approved.status, profileOrgChartActions.ACTIVATE);
    assert.equal(active.status, profileOrgChartStatuses.ACTIVE);
    assert.equal(active.nextAction, null);
  });

  test("keeps refresh as an audited action without changing active status", () => {
    const refreshed = transitionProfileOrgChartState(profileOrgChartStatuses.ACTIVE, profileOrgChartActions.REFRESH_SNAPSHOT);
    assert.equal(refreshed.status, profileOrgChartStatuses.ACTIVE);
    assert.equal(refreshed.owner, "SYSTEM");
  });

  test("records visibility override as explicit state", () => {
    const changed = transitionProfileOrgChartState(profileOrgChartStatuses.ACTIVE, profileOrgChartActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, profileOrgChartStatuses.VISIBILITY_CHANGED);
    assert.equal(changed.nextAction, profileOrgChartActions.UPDATE);
  });

  test("builds manager and direct report snapshot", () => {
    const snapshot = buildOrgChartSnapshot(
      [
        { id: "m1", employee_id: "BB-1", full_name_english: "Manager", manager_id: null, position_title: "Head", account_status: "active" },
        { id: "e1", employee_id: "BB-2", full_name_english: "Employee", manager_id: "m1", position_title: "Specialist", account_status: "active" },
        { id: "e2", employee_id: "BB-3", full_name_english: "Report", manager_id: "e1", position_title: "Analyst", account_status: "active" },
      ],
      "e1",
      2,
    );
    assert.equal(snapshot.nodes.length, 3);
    assert.equal(snapshot.directReportCount, 1);
    assert.deepEqual(snapshot.edges.map((edge) => edge.to).sort(), ["e1", "e2"]);
  });
});
