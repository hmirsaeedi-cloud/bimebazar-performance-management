export declare const pulseSurveyStatuses: Readonly<Record<string, string>>;
export declare const pulseSurveyActions: Readonly<Record<string, string>>;
export declare function getPulseSurveyState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionPulseSurveyState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function assertPulseSurveyHasEligibleRecipients(employeeIds: string[]): true;
export declare function lockPulseSurveyFormVersion(input: { formTemplateVersionId?: string | null }): {
  formTemplateVersionId: string;
  lockedFormTemplateVersionId: string;
};
export declare function evaluateAnonymityGuard(input: { responseCount: number; minResponses: number }): {
  responseCount: number;
  minResponses: number;
  canRelease: boolean;
  missingResponses: number;
};
export declare function aggregatePulseAnswers(responses: Array<{ answers?: Record<string, unknown> }>): Record<string, number>;
