export declare const kudosFeedStatuses: Readonly<Record<string, string>>;
export declare const kudosFeedActions: Readonly<Record<string, string>>;
export declare function getKudosFeedState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionKudosFeedState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function normalizeKudosMessage(value: unknown): string;
export declare function assertKudosRecipientsActive(recipients: string[]): true;
