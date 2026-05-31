export async function notifyUserCreated(input: { userId: string; temporaryPassword: string }) {
  // In S1 this is a hook. S5/S6 notification work can replace it with in-app and email delivery.
  console.info("notification.user_created", {
    userId: input.userId,
    temporaryPasswordIssued: input.temporaryPassword.length > 0,
  });
}

export async function notifyManagerRoleChanged(input: {
  userId: string;
  status: "active" | "revoked";
  directReportCount: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.manager_role_changed", input);
}

export async function notifyCalendarPreferenceChanged(input: {
  userId: string;
  preferredCalendar: "jalali" | "gregorian";
  preferredLocale: "fa-IR" | "en-US";
  status: string;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.calendar_preference_changed", input);
}

export async function notifyLanguagePreferenceChanged(input: {
  userId: string;
  preferredLanguage: "fa" | "en";
  textDirection: "rtl" | "ltr";
  status: string;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.language_preference_changed", input);
}

export async function notifyFormTemplateChanged(input: {
  templateId: string;
  status: "draft" | "published" | "archived";
  action: "created" | "updated" | "published" | "returned" | "archived";
  questionCount?: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.form_template_changed", input);
}

export async function notifyEmployeeImportCompleted(input: {
  importRunId: string;
  status: string;
  totalRows: number;
  createdCount: number;
  errorCount: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.employee_import_completed", input);
}

export async function notifyProcessChanged(input: {
  processId: string;
  status: string;
  action: "created" | "updated" | "configured" | "scheduled" | "started" | "paused" | "resumed" | "completed" | "cancelled";
  participantCount?: number;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.process_changed", input);
}

export async function notifyEmployeeExportReady(input: {
  exportReportId: string;
  status: string;
  rowCount: number;
  fileName?: string | null;
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.employee_export_ready", input);
}

export async function notifyMpaChanged(input: {
  mpaId: string;
  employeeId: string;
  cycleId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "employee_approved" | "manager_approved" | "activated" | "archived" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.mpa_changed", input);
}

export async function notifySelfAssessmentChanged(input: {
  selfAssessmentId: string;
  processId: string;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "approved" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.self_assessment_changed", input);
}

export async function notifyDownwardEvaluationChanged(input: {
  downwardEvaluationId: string;
  processId: string;
  employeeId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "created" | "updated" | "submitted" | "returned" | "next_level_approved" | "hrbp_approved" | "completed" | "visibility_changed";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.downward_evaluation_changed", input);
}

export async function notifyMpaAttachmentChanged(input: {
  attachmentId: string;
  mpaId?: string | null;
  processId?: string | null;
  employeeId: string;
  evaluationType: "downward_evaluation" | "self_assessment";
  evaluationId: string;
  status: string;
  owner: string;
  nextAction: string | null;
  action: "attached" | "missing_mpa" | "detached" | "override_attached";
}) {
  // S5 notifications can replace this hook with in-app and email delivery.
  console.info("notification.mpa_attachment_changed", input);
}
