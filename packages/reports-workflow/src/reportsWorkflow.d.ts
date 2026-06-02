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
