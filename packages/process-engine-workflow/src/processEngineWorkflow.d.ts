export const processStatuses: Readonly<{
  DRAFT: "draft";
  CONFIGURED: "configured";
  SCHEDULED: "scheduled";
  ACTIVE: "active";
  PAUSED: "paused";
  COMPLETED: "completed";
  CANCELLED: "cancelled";
}>;

export const processActions: Readonly<{
  UPDATE_CONFIG: "update_config";
  CONFIGURE: "configure";
  SCHEDULE: "schedule";
  START: "start";
  PAUSE: "pause";
  RESUME: "resume";
  COMPLETE: "complete";
  CANCEL: "cancel";
}>;

export type ProcessStatus = (typeof processStatuses)[keyof typeof processStatuses];
export type ProcessAction = (typeof processActions)[keyof typeof processActions];

export interface ProcessState {
  status: ProcessStatus;
  owner: "HR_ADMIN" | "HRBP" | "SYSTEM";
  nextAction: ProcessAction | null;
}

export function getProcessState(status: ProcessStatus): ProcessState;
export function transitionProcessState(status: ProcessStatus, action: ProcessAction): ProcessState;
