export declare const auditExportStatuses: Readonly<Record<string, string>>;
export declare const auditExportActions: Readonly<Record<string, string>>;
export declare function getAuditExportState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionAuditExportState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function auditEventFingerprint(event: Record<string, unknown>): string;
export declare function verifyAuditHashChain(events: Array<{ prev_event_hash?: string | null; event_hash?: string | null }>): boolean;
