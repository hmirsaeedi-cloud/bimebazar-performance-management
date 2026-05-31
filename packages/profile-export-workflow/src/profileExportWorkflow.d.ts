export const profileExportStatuses: Readonly<{
  REQUESTED: "requested";
  GENERATING: "generating";
  READY: "ready";
  FAILED: "failed";
  CANCELLED: "cancelled";
}>;

export const profileExportActions: Readonly<{
  GENERATE: "generate";
  MARK_READY: "mark_ready";
  MARK_FAILED: "mark_failed";
  CANCEL: "cancel";
}>;

export type ProfileExportStatus = (typeof profileExportStatuses)[keyof typeof profileExportStatuses];
export type ProfileExportAction = (typeof profileExportActions)[keyof typeof profileExportActions];

export interface ProfileExportState {
  status: ProfileExportStatus;
  owner: "HR_ADMIN" | "SYSTEM";
  nextAction: ProfileExportAction | null;
}

export function getProfileExportState(status: ProfileExportStatus): ProfileExportState;
export function transitionProfileExportState(status: ProfileExportStatus, action: ProfileExportAction): ProfileExportState;
