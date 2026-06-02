export declare const feedbackStatuses: Readonly<Record<string, string>>;
export declare const feedbackActions: Readonly<Record<string, string>>;
export declare const feedbackWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getFeedbackState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionFeedbackState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function canResolveAnonymousZeroResponseRequest(input: { isAnonymous?: boolean; responseCount?: number }): boolean;
export declare function canReleaseAnonymousResponses(input: { isAnonymous?: boolean; responseCount?: number; minResponseCount?: number }): boolean;
export declare function getAnonymityGuardState(input: { isAnonymous?: boolean; responseCount?: number; minResponseCount?: number }): {
  anonymityStatus: string;
  responseCount: number;
  minResponseCount: number;
  canRelease: boolean;
  guardReason: string;
};
export declare function normalizeFeedbackQuestion(value: unknown): string;
