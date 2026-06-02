export declare const notificationPreferenceStatuses: Readonly<Record<string, string>>;
export declare const notificationPreferenceActions: Readonly<Record<string, string>>;
export declare const notificationPreferenceWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  transitions: Record<string, string>;
}>>;
export declare function getNotificationPreferenceState(status: string): { status: string; owner: string; nextAction: string | null };
export declare function transitionNotificationPreferenceState(status: string, action: string): { status: string; owner: string; nextAction: string | null };
export declare function defaultNotificationPreferences(): {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  digestFrequency: string;
  quietHours: Record<string, unknown>;
  visibility: Record<string, boolean>;
};
export declare function normalizeNotificationPreferences(input?: Record<string, unknown>): {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  digestFrequency: string;
  quietHours: Record<string, unknown>;
  visibility: Record<string, boolean>;
};
