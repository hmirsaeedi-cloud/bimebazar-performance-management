export const downwardStatuses: Readonly<{
  ASSIGNED: "assigned";
  MANAGER_DRAFT: "manager_draft";
  MANAGER_SUBMITTED: "manager_submitted";
  NEXT_LEVEL_REVIEW: "next_level_review";
  HRBP_REVIEW: "hrbp_review";
  RETURNED_TO_MANAGER: "returned_to_manager";
  APPROVED: "approved";
  COMPLETED: "completed";
}>;

export const downwardActions: Readonly<{
  START: "start";
  UPDATE_DRAFT: "update_draft";
  SUBMIT: "submit";
  NEXT_LEVEL_APPROVE: "next_level_approve";
  HRBP_APPROVE: "hrbp_approve";
  RETURN: "return";
  COMPLETE: "complete";
  OVERRIDE_VISIBILITY: "override_visibility";
}>;

export type DownwardStatus = (typeof downwardStatuses)[keyof typeof downwardStatuses];
export type DownwardAction = (typeof downwardActions)[keyof typeof downwardActions];

export function getDownwardState(status: DownwardStatus): {
  status: DownwardStatus;
  owner: string;
  nextAction: DownwardAction | null;
};

export function transitionDownwardState(status: DownwardStatus, action: DownwardAction): {
  status: DownwardStatus;
  owner: string;
  nextAction: DownwardAction | null;
};
