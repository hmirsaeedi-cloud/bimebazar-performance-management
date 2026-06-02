export declare const notificationStatuses: Readonly<Record<string, string>>;
export declare const notificationActions: Readonly<Record<string, string>>;
export declare function getNotificationState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionNotificationState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function normalizeNotificationPayload(input: Record<string, unknown>): {
  title: string;
  body: string;
  channel: string;
  priority: string;
  metadata: Record<string, unknown>;
};
