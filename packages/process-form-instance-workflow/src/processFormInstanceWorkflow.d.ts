export declare const formInstanceStatuses: Readonly<Record<string, string>>;
export declare const formInstanceActions: Readonly<Record<string, string>>;
export declare const formInstanceWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getFormInstanceState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionFormInstanceState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function adminMoveFormInstanceState(targetStatus: string): { status: string; owner: string; nextAction: string | null };
export declare function assertLockedFormVersion(process: { lockedFormTemplateVersionId?: string | null; lockedFormSchema?: unknown }): boolean;
