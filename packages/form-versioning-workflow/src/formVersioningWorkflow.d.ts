export declare const formVersionStatuses: Readonly<Record<string, string>>;
export declare const formVersionActions: Readonly<Record<string, string>>;
export declare const formVersionWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getFormVersionState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionFormVersionState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function summarizeFormSchema(schema: unknown): { sectionCount: number; questionCount: number };
