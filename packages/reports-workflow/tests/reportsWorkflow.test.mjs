import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getReportState,
  reportActions,
  reportStatuses,
  summarizeReportMetrics,
  transitionReportState,
} from "../src/reportsWorkflow.mjs";

describe("reportsWorkflow", () => {
  test("represents every report state with status, owner, and nextAction", () => {
    for (const status of Object.values(reportStatuses)) {
      const state = getReportState(status);
      assert.equal(state.status, status);
      assert.ok(state.owner);
      assert.ok("nextAction" in state);
    }
  });

  test("moves HRBP report through generation review visibility and export", () => {
    const generated = transitionReportState(reportStatuses.DRAFT, reportActions.GENERATE);
    const submitted = transitionReportState(generated.status, reportActions.SUBMIT);
    const reviewed = transitionReportState(submitted.status, reportActions.APPROVE);
    const visible = transitionReportState(reviewed.status, reportActions.OVERRIDE_VISIBILITY);
    const exported = transitionReportState(visible.status, reportActions.EXPORT);
    assert.equal(exported.status, reportStatuses.EXPORTED);
    assert.equal(exported.owner, "HRBP_HR_ADMIN");
  });

  test("returns submitted reports to HRBP ownership", () => {
    const returned = transitionReportState(reportStatuses.SUBMITTED, reportActions.RETURN);
    assert.equal(returned.status, reportStatuses.RETURNED);
    assert.equal(returned.owner, "HRBP");
  });

  test("summarizes rates from aggregate counts", () => {
    const summary = summarizeReportMetrics({
      activeEmployees: 50,
      totalEvaluations: 20,
      completedEvaluations: 15,
      pipFlags: 2,
      promotionFlags: 4,
    });
    assert.equal(summary.completionRate, 75);
    assert.equal(summary.riskRate, 10);
    assert.equal(summary.promotionRate, 20);
  });
});
