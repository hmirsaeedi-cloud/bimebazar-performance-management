export const selfAssessmentStatuses: Readonly<{
  ASSIGNED: "assigned";
  IN_PROGRESS: "in_progress";
  SUBMITTED: "submitted";
  RETURNED: "returned";
  MANAGER_APPROVED: "manager_approved";
  COMPLETED: "completed";
}>;

export const selfAssessmentActions: Readonly<{
  START: "start";
  UPDATE_DRAFT: "update_draft";
  SUBMIT: "submit";
  RETURN: "return";
  MANAGER_APPROVE: "manager_approve";
  COMPLETE: "complete";
  OVERRIDE_VISIBILITY: "override_visibility";
}>;

export type SelfAssessmentStatus = (typeof selfAssessmentStatuses)[keyof typeof selfAssessmentStatuses];
export type SelfAssessmentAction = (typeof selfAssessmentActions)[keyof typeof selfAssessmentActions];

export function getSelfAssessmentState(status: SelfAssessmentStatus): {
  status: SelfAssessmentStatus;
  owner: string;
  nextAction: SelfAssessmentAction | null;
};

export function transitionSelfAssessmentState(status: SelfAssessmentStatus, action: SelfAssessmentAction): {
  status: SelfAssessmentStatus;
  owner: string;
  nextAction: SelfAssessmentAction | null;
};
