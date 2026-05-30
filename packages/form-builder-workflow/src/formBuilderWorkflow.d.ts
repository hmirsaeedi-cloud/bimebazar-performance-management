export const formBuilderStatuses: Readonly<{
  DRAFT: "draft";
  PUBLISHED: "published";
  ARCHIVED: "archived";
}>;

export const formBuilderActions: Readonly<{
  UPDATE_DRAFT: "update_draft";
  PUBLISH: "publish";
  ARCHIVE: "archive";
  RETURN_TO_DRAFT: "return_to_draft";
}>;

export type FormBuilderStatus = (typeof formBuilderStatuses)[keyof typeof formBuilderStatuses];
export type FormBuilderAction = (typeof formBuilderActions)[keyof typeof formBuilderActions];

export interface FormBuilderState {
  status: FormBuilderStatus;
  owner: "HR_ADMIN" | "HRBP" | "SYSTEM";
  nextAction: FormBuilderAction | null;
}

export function getFormBuilderState(status: FormBuilderStatus): FormBuilderState;
export function transitionFormBuilderState(status: FormBuilderStatus, action: FormBuilderAction): FormBuilderState;
