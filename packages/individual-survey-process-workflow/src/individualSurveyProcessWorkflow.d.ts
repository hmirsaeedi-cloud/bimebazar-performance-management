export declare const individualSurveyStatuses: Readonly<Record<string, string>>;
export declare const individualSurveyActions: Readonly<Record<string, string>>;
export declare const individualSurveyWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getIndividualSurveyState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionIndividualSurveyState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function assertSurveyHasEligibleRecipients(employeeIds: string[]): true;
export declare function lockSurveyFormVersion(input: { formTemplateVersionId?: string | null }): {
  formTemplateVersionId: string;
  lockedFormTemplateVersionId: string;
};
