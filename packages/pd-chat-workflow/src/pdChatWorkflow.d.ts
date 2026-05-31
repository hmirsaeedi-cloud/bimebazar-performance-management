export declare const pdChatStatuses: Readonly<{
  DRAFT: "draft";
  ACTIVE: "active";
  SUBMITTED: "submitted";
  MANAGER_REVIEWED: "manager_reviewed";
  RETURNED: "returned";
  VISIBILITY_APPROVED: "visibility_approved";
  ARCHIVED: "archived";
}>;

export declare const pdChatActions: Readonly<{
  CREATE: "create";
  UPDATE: "update";
  SUBMIT: "submit";
  APPROVE: "approve";
  RETURN: "return";
  OVERRIDE_VISIBILITY: "override_visibility";
  ARCHIVE: "archive";
}>;

export declare function getPdChatState(status: string): { status: string; owner: string; nextAction: string | null };

export declare function transitionPdChatState(status: string, action: string): { status: string; owner: string; nextAction: string | null };

export declare function normalizeChatMessage(input: {
  id: string;
  authorId: string;
  authorRole: string;
  body: unknown;
  createdAt: string;
  editedAt?: string | null;
  visibility?: string;
}): {
  id: string;
  authorId: string;
  authorRole: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  visibility: string;
};

export declare function appendChatMessage(messages: unknown[], message: Parameters<typeof normalizeChatMessage>[0]): ReturnType<typeof normalizeChatMessage>[];
