export const mpaStatuses: Readonly<{
  DRAFT: "draft";
  SUBMITTED: "submitted";
  RETURNED: "returned";
  EMPLOYEE_APPROVED: "employee_approved";
  MANAGER_APPROVED: "manager_approved";
  ACTIVE: "active";
  ARCHIVED: "archived";
}>;

export const mpaActions: Readonly<{
  UPDATE_DRAFT: "update_draft";
  SUBMIT: "submit";
  RETURN: "return";
  EMPLOYEE_APPROVE: "employee_approve";
  MANAGER_APPROVE: "manager_approve";
  HRBP_ACTIVATE: "hrbp_activate";
  ARCHIVE: "archive";
}>;

export type MpaStatus = (typeof mpaStatuses)[keyof typeof mpaStatuses];
export type MpaAction = (typeof mpaActions)[keyof typeof mpaActions];

export interface MpaState {
  status: MpaStatus;
  owner: "EMPLOYEE" | "MANAGER" | "HRBP" | "SYSTEM";
  nextAction: MpaAction | null;
}

export function getMpaState(status: MpaStatus): MpaState;
export function transitionMpaState(status: MpaStatus, action: MpaAction): MpaState;
