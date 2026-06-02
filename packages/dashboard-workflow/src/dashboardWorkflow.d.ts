export declare const dashboardViews: Readonly<Record<string, string>>;
export declare const dashboardStatuses: Readonly<Record<string, string>>;
export declare const dashboardActions: Readonly<Record<string, string>>;
export declare const dashboardWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function resolveDashboardView(roles?: string[]): string;
export declare function getDashboardState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionDashboardState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function defaultDashboardLayout(view: string): string[];
