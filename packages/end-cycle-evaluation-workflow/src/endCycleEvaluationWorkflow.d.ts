export const endCycleStatuses: Readonly<Record<string, string>>;
export const endCycleActions: Readonly<Record<string, string>>;
export function getEndCycleState(status: string): { status: string; owner: string; nextAction: string | null };
export function transitionEndCycleState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export function normalizeScaleAnswer(answer: unknown): { value: number | null; selected: boolean };
export function validateRequiredScaleAnswer(answer: unknown): boolean;
export function calculateWeightedScore(schema: unknown, answers: Record<string, unknown>, options?: { reveal?: boolean }): {
  engineVersion: string;
  mode: string;
  visible: boolean;
  totalScore: number | null;
  weightTotal: number;
  sections: Array<{
    sectionId: string;
    sectionTitle: string;
    weight: number;
    contribution: number | null;
    questions: Array<{ questionId: string; value: number; selected: boolean; weight: number; normalizedScore: number | null }>;
  }>;
};
