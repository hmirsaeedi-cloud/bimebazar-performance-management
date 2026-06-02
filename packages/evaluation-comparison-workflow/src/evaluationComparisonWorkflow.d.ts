export declare const comparisonStatuses: Readonly<Record<string, string>>;
export declare const comparisonActions: Readonly<Record<string, string>>;
export declare const comparisonWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getComparisonState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionComparisonState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function buildSideBySideRows(schema?: Record<string, unknown>, selfAnswers?: Record<string, unknown>, managerAnswers?: Record<string, unknown>): Array<Record<string, unknown>>;
export declare function summarizeComparison(rows?: Array<Record<string, unknown>>): {
  questionCount: number;
  alignedCount: number;
  differentCount: number;
  alignmentRate: number;
};
