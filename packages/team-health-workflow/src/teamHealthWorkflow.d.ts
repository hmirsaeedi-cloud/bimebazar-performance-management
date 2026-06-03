export declare const teamHealthStatuses: Readonly<Record<string, string>>;
export declare const teamHealthActions: Readonly<Record<string, string>>;
export declare function getTeamHealthState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};
export declare function transitionTeamHealthState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};
export declare function calculateTeamHealthScore(metrics: Record<string, number>): {
  score: number;
  band: "healthy" | "watch" | "risk";
  contributions: Record<string, number>;
};
