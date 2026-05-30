export const rbacStatuses: Readonly<{
  DRAFT: "draft";
  ACTIVE: "active";
  REVOKED: "revoked";
}>;

export const rbacActions: Readonly<{
  CREATE_ASSIGNMENT: "create_assignment";
  ACTIVATE_ASSIGNMENT: "activate_assignment";
  UPDATE_ASSIGNMENT: "update_assignment";
  REVOKE_ASSIGNMENT: "revoke_assignment";
  REACTIVATE_ASSIGNMENT: "reactivate_assignment";
}>;

export type RbacStatus = (typeof rbacStatuses)[keyof typeof rbacStatuses];
export type RbacAction = (typeof rbacActions)[keyof typeof rbacActions];

export interface RbacState {
  status: RbacStatus;
  owner: string;
  nextAction: RbacAction | null;
}

export function getRbacState(status: RbacStatus): RbacState;
export function transitionRbacState(status: RbacStatus, action: RbacAction): RbacState;
