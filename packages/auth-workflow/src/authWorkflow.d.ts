export const accountStatuses: Readonly<{
  INVITED: "invited";
  ACTIVE: "active";
  LOCKED: "locked";
  DEACTIVATED: "deactivated";
}>;

export const authActions: Readonly<{
  CREATE_ACCOUNT: "create_account";
  ACCEPT_INVITE: "accept_invite";
  LOGIN: "login";
  FAILED_LOGIN: "failed_login";
  LOCK_ACCOUNT: "lock_account";
  LOGOUT: "logout";
  DEACTIVATE_ACCOUNT: "deactivate_account";
}>;

export type AccountStatus = (typeof accountStatuses)[keyof typeof accountStatuses];
export type AuthAction = (typeof authActions)[keyof typeof authActions];

export interface AuthState {
  status: AccountStatus;
  owner: string;
  nextAction: AuthAction | null;
}

export function getAuthState(status: AccountStatus): AuthState;
export function transitionAuthState(status: AccountStatus, action: AuthAction): AuthState;
