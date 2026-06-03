export declare const reportStatuses: Readonly<{
  DRAFT: "draft";
  GENERATED: "generated";
  SUBMITTED: "submitted";
  REVIEWED: "reviewed";
  RETURNED: "returned";
  VISIBILITY_APPROVED: "visibility_approved";
  EXPORTED: "exported";
  ARCHIVED: "archived";
}>;

export declare const reportActions: Readonly<{
  CREATE: "create";
  GENERATE: "generate";
  SUBMIT: "submit";
  APPROVE: "approve";
  RETURN: "return";
  OVERRIDE_VISIBILITY: "override_visibility";
  EXPORT: "export";
  ARCHIVE: "archive";
}>;

export declare function getReportState(status: string): { status: string; owner: string; nextAction: string | null };

export declare function transitionReportState(status: string, action: string): { status: string; owner: string; nextAction: string | null };

export declare function summarizeReportMetrics(input: {
  activeEmployees?: number;
  totalEvaluations?: number;
  completedEvaluations?: number;
  pipFlags?: number;
  promotionFlags?: number;
}): {
  activeEmployees: number;
  totalEvaluations: number;
  completedEvaluations: number;
  completionRate: number;
  pipFlags: number;
  promotionFlags: number;
  riskRate: number;
  promotionRate: number;
};

export declare function buildTrendSeries(
  records: Array<{ date?: string; count?: number; score?: number; flagType?: string }>,
  options?: { interval?: "month" | "quarter" },
): Array<{ period: string; count: number; averageScore: number | null; pipFlags: number; promotionFlags: number }>;

export declare function compareCohorts(
  records: Array<Record<string, unknown>>,
  cohortKey?: string,
): Array<{
  cohort: string;
  employees: number;
  evaluations: number;
  completionRate: number;
  averageScore: number | null;
  pipFlags: number;
  promotionFlags: number;
}>;

export declare function buildAdvancedAnalytics(
  records: Array<Record<string, unknown>>,
  options?: { interval?: "month" | "quarter"; cohortKey?: string },
): {
  interval: string;
  cohortKey: string;
  trends: ReturnType<typeof buildTrendSeries>;
  cohorts: ReturnType<typeof compareCohorts>;
  summary: Record<string, unknown>;
};
