export declare const profileOrgChartStatuses: Readonly<{
  DRAFT: "draft";
  SUBMITTED: "submitted";
  APPROVED: "approved";
  ACTIVE: "active";
  RETURNED: "returned";
  VISIBILITY_CHANGED: "visibility_changed";
  ARCHIVED: "archived";
}>;

export declare const profileOrgChartActions: Readonly<{
  CREATE: "create";
  UPDATE: "update";
  REFRESH_SNAPSHOT: "refresh_snapshot";
  SUBMIT: "submit";
  APPROVE: "approve";
  ACTIVATE: "activate";
  RETURN: "return";
  OVERRIDE_VISIBILITY: "override_visibility";
  ARCHIVE: "archive";
}>;

export declare function getProfileOrgChartState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function transitionProfileOrgChartState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function buildOrgChartSnapshot(
  profiles: Array<Record<string, unknown> & { id: string; manager_id?: string | null }>,
  rootProfileId: string,
  maxDepth?: number,
): {
  rootProfileId: string;
  generatedAt: string;
  maxDepth: number;
  nodes: Array<Record<string, unknown>>;
  edges: Array<{ from: string; to: string; relationship: "manager" }>;
  directReportCount: number;
};
