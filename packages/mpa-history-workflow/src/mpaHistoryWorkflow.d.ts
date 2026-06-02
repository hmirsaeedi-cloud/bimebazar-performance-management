export declare const mpaHistoryStatuses: Readonly<Record<string, string>>;
export declare const mpaHistoryActions: Readonly<Record<string, string>>;
export declare const mpaHistoryWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getMpaHistoryState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionMpaHistoryState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function summarizeMpaSnapshot(input: Record<string, unknown>): {
  title: string;
  status: string;
  contentPlainText: string;
};
