export const bulkImportStatuses: Readonly<{
  UPLOADED: "uploaded";
  VALIDATING: "validating";
  VALIDATED: "validated";
  FAILED_VALIDATION: "failed_validation";
  PROCESSING: "processing";
  COMPLETED: "completed";
  COMPLETED_WITH_ERRORS: "completed_with_errors";
  CANCELLED: "cancelled";
}>;

export const bulkImportActions: Readonly<{
  VALIDATE: "validate";
  FIX_ROWS: "fix_rows";
  PROCESS: "process";
  MARK_COMPLETE: "mark_complete";
  MARK_COMPLETE_WITH_ERRORS: "mark_complete_with_errors";
  CANCEL: "cancel";
}>;

export type BulkImportStatus = (typeof bulkImportStatuses)[keyof typeof bulkImportStatuses];
export type BulkImportAction = (typeof bulkImportActions)[keyof typeof bulkImportActions];

export interface BulkImportState {
  status: BulkImportStatus;
  owner: "HR_ADMIN" | "SYSTEM";
  nextAction: BulkImportAction | null;
}

export function getBulkImportState(status: BulkImportStatus): BulkImportState;
export function transitionBulkImportState(status: BulkImportStatus, action: BulkImportAction): BulkImportState;
