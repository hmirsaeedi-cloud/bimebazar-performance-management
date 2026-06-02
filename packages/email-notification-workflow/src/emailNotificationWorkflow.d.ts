export declare const emailNotificationStatuses: Readonly<Record<string, string>>;
export declare const emailNotificationActions: Readonly<Record<string, string>>;
export declare const emailNotificationWorkflow: Readonly<Record<string, {
  status: string;
  owner: string;
  nextAction: string | null;
  recipientVisible: boolean;
  transitions: Record<string, string>;
}>>;
export declare function getEmailNotificationState(status: string): {
  status: string;
  owner: string;
  nextAction: string | null;
  recipientVisible: boolean;
};
export declare function transitionEmailNotificationState(status: string, action: string): {
  status: string;
  owner: string;
  nextAction: string | null;
  recipientVisible: boolean;
};
export declare function normalizeEmailNotificationPayload(input: Record<string, unknown>): {
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
};
