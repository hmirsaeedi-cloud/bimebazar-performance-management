export const managerRoleStatuses: Readonly<{
  NOT_MANAGER: "not_manager";
  ACTIVE_MANAGER: "active_manager";
  REVOKED_MANAGER: "revoked_manager";
}>;

export const managerRoleActions: Readonly<{
  DIRECT_REPORT_ADDED: "direct_report_added";
  DIRECT_REPORT_REMOVED: "direct_report_removed";
  RESYNC_MANAGER_ROLE: "resync_manager_role";
}>;

export type ManagerRoleStatus = (typeof managerRoleStatuses)[keyof typeof managerRoleStatuses];
export type ManagerRoleAction = (typeof managerRoleActions)[keyof typeof managerRoleActions];

export interface ManagerRoleState {
  status: ManagerRoleStatus;
  owner: string;
  nextAction: ManagerRoleAction | null;
}

export function getManagerRoleState(status: ManagerRoleStatus): ManagerRoleState;
export function transitionManagerRoleState(status: ManagerRoleStatus, action: ManagerRoleAction): ManagerRoleState;
