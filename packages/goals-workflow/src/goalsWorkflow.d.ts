export declare const goalStatuses: Readonly<Record<string, string>>;
export declare const goalActions: Readonly<Record<string, string>>;
export declare const goalsWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getGoalState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionGoalState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function calculateGoalProgress(keyResults?: Array<Record<string, unknown>>): number;
export declare function buildCascadePath(parentPath: string[] | undefined, goalId: string): string[];
