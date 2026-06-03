export declare const pdChatScheduleStatuses: Readonly<{
  DRAFT: "draft";
  SUBMITTED: "submitted";
  APPROVED: "approved";
  ACTIVE: "active";
  PAUSED: "paused";
  RETURNED: "returned";
  VISIBILITY_CHANGED: "visibility_changed";
  ARCHIVED: "archived";
}>;

export declare const pdChatScheduleActions: Readonly<{
  CREATE: "create";
  UPDATE: "update";
  SUBMIT: "submit";
  APPROVE: "approve";
  ACTIVATE: "activate";
  PAUSE: "pause";
  RESUME: "resume";
  RETURN: "return";
  GENERATE_OCCURRENCE: "generate_occurrence";
  OVERRIDE_VISIBILITY: "override_visibility";
  ARCHIVE: "archive";
}>;

export declare function getPdChatScheduleState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function transitionPdChatScheduleState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};

export declare function buildNextPdChatOccurrences(input: {
  startAt: string | Date;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly";
  count?: number;
}): string[];
