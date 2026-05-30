export const profileStatuses: Readonly<{
  INVITED: "invited";
  ACTIVE: "active";
  LOCKED: "locked";
  DEACTIVATED: "deactivated";
}>;

export const profileActions: Readonly<{
  CREATE_PROFILE: "create_profile";
  ACTIVATE_PROFILE: "activate_profile";
  UPDATE_PROFILE: "update_profile";
  LOCK_PROFILE: "lock_profile";
  DEACTIVATE_PROFILE: "deactivate_profile";
  REACTIVATE_PROFILE: "reactivate_profile";
}>;

export type ProfileStatus = (typeof profileStatuses)[keyof typeof profileStatuses];
export type ProfileAction = (typeof profileActions)[keyof typeof profileActions];

export interface ProfileState {
  status: ProfileStatus;
  owner: string;
  nextAction: ProfileAction | null;
}

export function getProfileState(status: ProfileStatus): ProfileState;
export function transitionProfileState(status: ProfileStatus, action: ProfileAction): ProfileState;
