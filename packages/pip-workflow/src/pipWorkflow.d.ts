export declare const pipStatuses: Readonly<Record<string, string>>;
export declare const pipActions: Readonly<Record<string, string>>;
export declare const pipWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  employeeVisible: boolean;
  transitions: Record<string, string>;
}>>;
export declare function getPipState(status: string): { status: string; owner: string; nextAction: string | null; employeeVisible: boolean };
export declare function transitionPipState(status: string, action: string): { status: string; owner: string; nextAction: string | null; employeeVisible: boolean };
export declare function normalizePipPlan(input: Record<string, unknown>): {
  performanceConcern: string;
  successCriteria: string;
  supportPlan: string;
};
