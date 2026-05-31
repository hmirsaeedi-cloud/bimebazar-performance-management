export type FormPresetKey =
  | "self_assessment_default"
  | "manager_evaluation_default"
  | "upward_feedback_default"
  | "pulse_survey_default";

export const formTemplatePresets: Record<FormPresetKey, {
  key: FormPresetKey;
  name: string;
  description: string;
  module: "self_assessment" | "manager_evaluation" | "upward_feedback" | "survey";
  schema: Record<string, unknown>;
}> = {
  self_assessment_default: {
    key: "self_assessment_default",
    name: "Self-assessment default",
    description: "Employee self-review covering achievements, strengths, support needs, and goals.",
    module: "self_assessment",
    schema: {
      title: "Self-assessment",
      description: "Employee self-review template for cycle kickoff.",
      sections: [
        {
          id: "reflection",
          title: "Reflection",
          questions: [
            { id: "achievements", type: "long_text", label: "What were your most important achievements?", required: true },
            { id: "strength", type: "single_select", label: "Primary strength this cycle", required: true, options: [
              { id: "execution", label: "Execution", value: "execution" },
              { id: "collaboration", label: "Collaboration", value: "collaboration" },
              { id: "learning", label: "Learning", value: "learning" },
            ] },
            { id: "confidence", type: "scale", label: "Confidence in overall performance", required: true, min: 1, max: 5, weight: 20 },
          ],
        },
        {
          id: "growth",
          title: "Growth",
          questions: [
            { id: "support_needed", type: "multi_select", label: "Where do you need support?", required: false, options: [
              { id: "coaching", label: "Coaching", value: "coaching" },
              { id: "resources", label: "Resources", value: "resources" },
              { id: "priority_clarity", label: "Priority clarity", value: "priority_clarity" },
            ] },
            { id: "support_detail", type: "long_text", label: "Please describe the support you need", visibility: [{ sourceQuestionId: "support_needed", operator: "is_not_empty" }] },
            { id: "next_goal", type: "short_text", label: "One priority goal for the next cycle", required: true },
          ],
        },
      ],
    },
  },
  manager_evaluation_default: {
    key: "manager_evaluation_default",
    name: "Manager evaluation default",
    description: "Manager review template for performance, behavior, and growth recommendations.",
    module: "manager_evaluation",
    schema: {
      title: "Manager evaluation",
      sections: [
        {
          id: "performance",
          title: "Performance",
          questions: [
            { id: "overall_rating", type: "scale", label: "Overall performance rating", required: true, min: 1, max: 5, weight: 40 },
            { id: "impact_notes", type: "rich_text", label: "Impact notes", required: true },
            { id: "ready_for_promotion", type: "boolean", label: "Ready for promotion discussion?", required: true },
          ],
        },
        {
          id: "evidence",
          title: "Evidence",
          questions: [
            { id: "evidence_file", type: "file", label: "Attach supporting evidence", allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"], maxFileSizeMb: 20 },
            { id: "calibration_owner", type: "employee_reference", label: "Calibration discussion owner" },
          ],
        },
      ],
    },
  },
  upward_feedback_default: {
    key: "upward_feedback_default",
    name: "Upward feedback default",
    description: "Employee feedback template for manager effectiveness and support.",
    module: "upward_feedback",
    schema: {
      title: "Upward feedback",
      sections: [
        {
          id: "manager_support",
          title: "Manager support",
          questions: [
            { id: "clarity", type: "scale", label: "My manager gives clear priorities", required: true, min: 1, max: 5 },
            { id: "coaching", type: "scale", label: "My manager coaches me effectively", required: true, min: 1, max: 5 },
            { id: "comment", type: "long_text", label: "What should your manager continue or change?" },
          ],
        },
      ],
    },
  },
  pulse_survey_default: {
    key: "pulse_survey_default",
    name: "Pulse survey default",
    description: "Short engagement survey template for quick organizational sensing.",
    module: "survey",
    schema: {
      title: "Pulse survey",
      sections: [
        {
          id: "pulse",
          title: "Pulse",
          questions: [
            { id: "energy", type: "scale", label: "My energy level this month", required: true, min: 1, max: 5 },
            { id: "blockers", type: "multi_select", label: "Current blockers", options: [
              { id: "workload", label: "Workload", value: "workload" },
              { id: "alignment", label: "Alignment", value: "alignment" },
              { id: "tools", label: "Tools", value: "tools" },
            ] },
            { id: "blocker_detail", type: "long_text", label: "Blocker details", visibility: [{ sourceQuestionId: "blockers", operator: "is_not_empty" }] },
          ],
        },
      ],
    },
  },
};
