export declare const bandFlagStatuses: Readonly<Record<string, string>>;
export declare const bandFlagActions: Readonly<Record<string, string>>;
export declare const bandFlagTypes: Readonly<Record<string, string>>;
export declare const bandFlagWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getBandFlagState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionBandFlagState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function classifyPerformanceBand(score: number, thresholds?: { pipMax?: number; promotionMin?: number }): {
  flagType: string;
  bandLabel: string;
  rationale: string;
};
export declare function assertScoreMayBeFlagged(score: { visible?: boolean; totalScore?: number | null }): true;
