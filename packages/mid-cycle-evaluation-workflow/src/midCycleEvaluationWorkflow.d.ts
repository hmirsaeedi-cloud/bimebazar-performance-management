export declare const midCycleStatuses: Readonly<Record<string, string>>;
export declare const midCycleActions: Readonly<Record<string, string>>;
export declare function getMidCycleState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionMidCycleState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function normalizeScaleAnswer(answer: unknown): { value: number | null; selected: boolean };
export declare function validateRequiredScaleAnswer(answer: unknown): boolean;
export declare function calculateWeightedScore(schema: { sections?: Array<{ id: string; title: string; questions?: Array<Record<string, unknown>> }> }, answers: Record<string, unknown>, options?: { reveal?: boolean }): {
  engineVersion: string;
  mode: string;
  visible: boolean;
  totalScore: number | null;
  weightTotal: number;
  sections: unknown[];
};
