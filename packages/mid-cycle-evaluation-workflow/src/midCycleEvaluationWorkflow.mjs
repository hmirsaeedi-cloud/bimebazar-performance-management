export const midCycleStatuses = Object.freeze({
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  MANAGER_APPROVED: "manager_approved",
  HRBP_APPROVED: "hrbp_approved",
  RETURNED: "returned",
  VISIBILITY_APPROVED: "visibility_approved",
  COMPLETED: "completed",
});

export const midCycleActions = Object.freeze({
  UPDATE_DRAFT: "update_draft",
  SUBMIT: "submit",
  MANAGER_APPROVE: "manager_approve",
  HRBP_APPROVE: "hrbp_approve",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  COMPLETE: "complete",
});

export const midCycleWorkflow = Object.freeze({
  [midCycleStatuses.DRAFT]: {
    status: midCycleStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: midCycleActions.UPDATE_DRAFT,
    transitions: {
      [midCycleActions.UPDATE_DRAFT]: midCycleStatuses.IN_PROGRESS,
      [midCycleActions.SUBMIT]: midCycleStatuses.SUBMITTED,
    },
  },
  [midCycleStatuses.IN_PROGRESS]: {
    status: midCycleStatuses.IN_PROGRESS,
    owner: "MANAGER",
    nextAction: midCycleActions.SUBMIT,
    transitions: {
      [midCycleActions.UPDATE_DRAFT]: midCycleStatuses.IN_PROGRESS,
      [midCycleActions.SUBMIT]: midCycleStatuses.SUBMITTED,
    },
  },
  [midCycleStatuses.SUBMITTED]: {
    status: midCycleStatuses.SUBMITTED,
    owner: "MANAGER",
    nextAction: midCycleActions.MANAGER_APPROVE,
    transitions: {
      [midCycleActions.MANAGER_APPROVE]: midCycleStatuses.MANAGER_APPROVED,
      [midCycleActions.RETURN]: midCycleStatuses.RETURNED,
    },
  },
  [midCycleStatuses.MANAGER_APPROVED]: {
    status: midCycleStatuses.MANAGER_APPROVED,
    owner: "HRBP",
    nextAction: midCycleActions.HRBP_APPROVE,
    transitions: {
      [midCycleActions.HRBP_APPROVE]: midCycleStatuses.HRBP_APPROVED,
      [midCycleActions.RETURN]: midCycleStatuses.RETURNED,
    },
  },
  [midCycleStatuses.HRBP_APPROVED]: {
    status: midCycleStatuses.HRBP_APPROVED,
    owner: "HRBP",
    nextAction: midCycleActions.OVERRIDE_VISIBILITY,
    transitions: {
      [midCycleActions.OVERRIDE_VISIBILITY]: midCycleStatuses.VISIBILITY_APPROVED,
      [midCycleActions.COMPLETE]: midCycleStatuses.COMPLETED,
      [midCycleActions.RETURN]: midCycleStatuses.RETURNED,
    },
  },
  [midCycleStatuses.RETURNED]: {
    status: midCycleStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: midCycleActions.UPDATE_DRAFT,
    transitions: {
      [midCycleActions.UPDATE_DRAFT]: midCycleStatuses.IN_PROGRESS,
      [midCycleActions.SUBMIT]: midCycleStatuses.SUBMITTED,
    },
  },
  [midCycleStatuses.VISIBILITY_APPROVED]: {
    status: midCycleStatuses.VISIBILITY_APPROVED,
    owner: "HRBP",
    nextAction: midCycleActions.COMPLETE,
    transitions: {
      [midCycleActions.COMPLETE]: midCycleStatuses.COMPLETED,
    },
  },
  [midCycleStatuses.COMPLETED]: {
    status: midCycleStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getMidCycleState(status) {
  const state = midCycleWorkflow[status];
  if (!state) throw new Error(`Unknown mid-cycle evaluation status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionMidCycleState(status, action) {
  const state = midCycleWorkflow[status];
  if (!state) throw new Error(`Unknown mid-cycle evaluation status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getMidCycleState(nextStatus);
}

export function normalizeScaleAnswer(answer) {
  if (typeof answer === "number") return { value: answer, selected: true };
  if (answer && typeof answer === "object" && "value" in answer) {
    return { value: Number(answer.value), selected: answer.selected === true };
  }
  return { value: null, selected: false };
}

export function validateRequiredScaleAnswer(answer) {
  const normalized = normalizeScaleAnswer(answer);
  if (normalized.value === 0) return normalized.selected === true;
  return normalized.value !== null && Number.isFinite(normalized.value);
}

export function calculateWeightedScore(schema, answers, options = {}) {
  const reveal = options.reveal === true;
  const sections = [];
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const section of schema.sections ?? []) {
    let sectionWeightedTotal = 0;
    let sectionWeightTotal = 0;
    const questions = [];
    for (const question of section.questions ?? []) {
      if (question.type !== "scale") continue;
      if (question.required && !validateRequiredScaleAnswer(answers[question.id])) {
        throw new Error(`Required scale question is missing: ${question.id}`);
      }
      const normalized = normalizeScaleAnswer(answers[question.id]);
      if (!Number.isFinite(normalized.value)) continue;
      const min = Number(question.min ?? 0);
      const max = Number(question.max ?? 5);
      const score = max === min ? 0 : ((normalized.value - min) / (max - min)) * 100;
      const weight = Number(question.weight ?? 0);
      sectionWeightedTotal += score * weight;
      sectionWeightTotal += weight;
      questions.push({
        questionId: question.id,
        value: normalized.value,
        selected: normalized.selected,
        weight,
        normalizedScore: reveal ? Number(score.toFixed(2)) : null,
      });
    }
    sections.push({
      sectionId: section.id,
      sectionTitle: section.title,
      weight: sectionWeightTotal,
      contribution: reveal ? Number((sectionWeightedTotal / 100).toFixed(2)) : null,
      questions,
    });
    weightedTotal += sectionWeightedTotal;
    weightTotal += sectionWeightTotal;
  }

  return {
    engineVersion: "weighted-v1",
    mode: reveal ? "submitted" : "hidden_preview",
    visible: reveal,
    totalScore: reveal && weightTotal > 0 ? Number((weightedTotal / weightTotal).toFixed(2)) : null,
    weightTotal,
    sections,
  };
}
