export declare const hrisIntegrationStatuses: Readonly<Record<string, string>>;
export declare const hrisIntegrationActions: Readonly<Record<string, string>>;
export declare function getHrisIntegrationState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};
export declare function transitionHrisIntegrationState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
};
export declare function buildHrisSyncPreview(records?: Array<Record<string, unknown>>): {
  totalRecords: number;
  validRecords: number;
  missingEmail: number;
  missingExternalId: number;
  sample: Array<Record<string, unknown>>;
};
