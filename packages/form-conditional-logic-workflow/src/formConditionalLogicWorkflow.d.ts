export declare const conditionalLogicStatuses: Readonly<{
  DRAFT: "draft";
  SUBMITTED: "submitted";
  APPROVED: "approved";
  ACTIVE: "active";
  RETURNED: "returned";
  VISIBILITY_CHANGED: "visibility_changed";
  ARCHIVED: "archived";
}>;

export declare const conditionalLogicActions: Readonly<{
  CREATE: "create";
  UPDATE: "update";
  SUBMIT: "submit";
  APPROVE: "approve";
  ACTIVATE: "activate";
  RETURN: "return";
  OVERRIDE_VISIBILITY: "override_visibility";
  ARCHIVE: "archive";
}>;

export declare function getConditionalLogicState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function transitionConditionalLogicState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function evaluateConditionalRules(
  rules: Array<Record<string, unknown> & {
    id: string;
    sourceQuestionId: string;
    operator: string;
    value?: unknown;
    targets?: Array<{ questionId: string; effect: "show" | "hide" | "require" | "optional" }>;
  }>,
  answers?: Record<string, unknown>,
): {
  visibleQuestionIds: string[];
  hiddenQuestionIds: string[];
  requiredQuestionIds: string[];
  matchedRuleIds: string[];
};
