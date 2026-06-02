export declare const promotionStatuses: Readonly<Record<string, string>>;
export declare const promotionActions: Readonly<Record<string, string>>;
export declare const promotionWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getPromotionState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionPromotionState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function normalizePromotionPayload(input: Record<string, unknown>): {
  currentLevel: string;
  proposedLevel: string;
  rationale: string;
};
