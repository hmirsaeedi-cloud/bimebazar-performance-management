import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildAdvancedAnalytics,
  buildTrendSeries,
  compareCohorts,
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

  test("builds month trend series from scored evaluation and flag records", () => {
    const trends = buildTrendSeries([
      { date: "2026-01-15", score: 80 },
      { date: "2026-01-20", score: 90, flagType: "promotion" },
      { date: "2026-02-10", score: 60, flagType: "pip" },
    ]);
    assert.deepEqual(trends, [
      { period: "2026-01", count: 2, averageScore: 85, pipFlags: 0, promotionFlags: 1 },
      { period: "2026-02", count: 1, averageScore: 60, pipFlags: 1, promotionFlags: 0 },
    ]);
  });

  test("compares analytics cohorts with completion and score summaries", () => {
    const cohorts = compareCohorts([
      { kind: "evaluation", employeeId: "1", businessUnit: "Sales", status: "completed", score: 88 },
      { kind: "evaluation", employeeId: "2", businessUnit: "Sales", status: "submitted", score: 74 },
      { kind: "evaluation", employeeId: "3", businessUnit: "Ops", status: "completed", score: 91 },
      { employeeId: "1", businessUnit: "Sales", flagType: "promotion" },
    ]);
    assert.equal(cohorts[0].cohort, "Sales");
    assert.equal(cohorts[0].completionRate, 50);
    assert.equal(cohorts[0].averageScore, 81);
    assert.equal(cohorts[0].promotionFlags, 1);
  });

  test("builds advanced analytics summary with cohort and trend signals", () => {
    const analytics = buildAdvancedAnalytics([
      { kind: "evaluation", date: "2026-01-15", employeeId: "1", businessUnit: "Sales", status: "completed", score: 70 },
      { kind: "evaluation", date: "2026-02-15", employeeId: "1", businessUnit: "Sales", status: "completed", score: 83 },
      { kind: "evaluation", date: "2026-02-18", employeeId: "2", businessUnit: "Ops", status: "submitted", score: 65, flagType: "pip" },
    ]);
    assert.equal(analytics.summary.trendPeriods, 2);
    assert.equal(analytics.summary.cohortCount, 2);
    assert.equal(analytics.summary.scoreDelta, 4);
    assert.equal(analytics.summary.highestCompletionCohort.cohort, "Sales");
  });
});
