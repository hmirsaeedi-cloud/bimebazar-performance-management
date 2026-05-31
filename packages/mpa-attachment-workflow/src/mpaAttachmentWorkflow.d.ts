export const mpaAttachmentStatuses: Readonly<{
  MATCHED: "matched";
  ATTACHED: "attached";
  MISSING_MPA: "missing_mpa";
  DETACHED: "detached";
}>;

export const mpaAttachmentActions: Readonly<{
  AUTO_ATTACH: "auto_attach";
  MARK_MISSING: "mark_missing";
  DETACH: "detach";
  OVERRIDE_ATTACH: "override_attach";
}>;

export type MpaAttachmentStatus = (typeof mpaAttachmentStatuses)[keyof typeof mpaAttachmentStatuses];
export type MpaAttachmentAction = (typeof mpaAttachmentActions)[keyof typeof mpaAttachmentActions];

export function getMpaAttachmentState(status: MpaAttachmentStatus): {
  status: MpaAttachmentStatus;
  owner: string;
  nextAction: MpaAttachmentAction | null;
};

export function transitionMpaAttachmentState(status: MpaAttachmentStatus, action: MpaAttachmentAction): {
  status: MpaAttachmentStatus;
  owner: string;
  nextAction: MpaAttachmentAction | null;
};
