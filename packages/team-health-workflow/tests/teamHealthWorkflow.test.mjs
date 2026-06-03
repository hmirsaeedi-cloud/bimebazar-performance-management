import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTeamHealthScore,
  getTeamHealthState,
  teamHealthActions,
  teamHealthStatuses,
  transitionTeamHealthState,
} from "../src/teamHealthWorkflow.mjs";

describe("teamHealthWorkflow", () => {
  test("represents every state with status, owner, and nextAction", () => {
    for (const status of Object.values(teamHealthStatuses)) {
      const state = getTeamHealthState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves score through submit approve and activate", () => {
    const submitted = transitionTeamHealthState(teamHealthStatuses.DRAFT, teamHealthActions.SUBMIT);
    const approved = transitionTeamHealthState(submitted.status, teamHealthActions.APPROVE);
    const active = transitionTeamHealthState(approved.status, teamHealthActions.ACTIVATE);
    assert.equal(active.status, teamHealthStatuses.ACTIVE);
    assert.equal(active.nextAction, null);
  });

  test("returns submitted score to manager ownership", () => {
    const returned = transitionTeamHealthState(teamHealthStatuses.SUBMITTED, teamHealthActions.RETURN);
    assert.equal(returned.status, teamHealthStatuses.RETURNED);
    assert.equal(returned.owner, "MANAGER");
  });

  test("keeps visibility override explicit", () => {
    const changed = transitionTeamHealthState(teamHealthStatuses.ACTIVE, teamHealthActions.OVERRIDE_VISIBILITY);
    assert.equal(changed.status, teamHealthStatuses.VISIBILITY_CHANGED);
  });

  test("calculates weighted health score and band", () => {
    const result = calculateTeamHealthScore({
      evaluationCompletionRate: 0.9,
      averagePerformanceScore: 4,
      feedbackParticipationRate: 0.7,
      pipRiskRate: 0.1,
      overdueTaskRate: 0.2,
    });
    assert.equal(result.score, 82);
    assert.equal(result.band, "healthy");
    assert.equal(result.contributions.averagePerformanceScore, 20);
  });
});
