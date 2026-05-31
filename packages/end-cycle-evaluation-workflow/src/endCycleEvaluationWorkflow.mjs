export const endCycleStatuses = Object.freeze({
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  NL_APPROVED: "nl_approved",
  HEAD_APPROVED: "head_approved",
  HRBP_APPROVED: "hrbp_approved",
  RETURNED: "returned",
  APPROVED: "approved",
  VISIBILITY_APPROVED: "visibility_approved",
  COMPLETED: "completed",
});

export const endCycleActions = Object.freeze({
  UPDATE_DRAFT: "update_draft",
  SUBMIT: "submit",
  RETURN: "return",
  APPROVE: "approve",
  NEXT_LEVEL_APPROVE: "next_level_approve",
  HEAD_APPROVE: "head_approve",
  HRBP_APPROVE: "hrbp_approve",
  OVERRIDE_VISIBILITY: "override_visibility",
  COMPLETE: "complete",
});

export const endCycleWorkflow = Object.freeze({
  [endCycleStatuses.DRAFT]: {
    status: endCycleStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: endCycleActions.UPDATE_DRAFT,
    transitions: {
      [endCycleActions.UPDATE_DRAFT]: endCycleStatuses.IN_PROGRESS,
      [endCycleActions.SUBMIT]: endCycleStatuses.SUBMITTED,
    },
  },
  [endCycleStatuses.IN_PROGRESS]: {
    status: endCycleStatuses.IN_PROGRESS,
    owner: "MANAGER",
    nextAction: endCycleActions.SUBMIT,
    transitions: {
      [endCycleActions.UPDATE_DRAFT]: endCycleStatuses.IN_PROGRESS,
      [endCycleActions.SUBMIT]: endCycleStatuses.SUBMITTED,
    },
  },
  [endCycleStatuses.SUBMITTED]: {
    status: endCycleStatuses.SUBMITTED,
    owner: "NEXT_LEVEL_MANAGER",
    nextAction: endCycleActions.NEXT_LEVEL_APPROVE,
    transitions: {
      [endCycleActions.RETURN]: endCycleStatuses.RETURNED,
      [endCycleActions.NEXT_LEVEL_APPROVE]: endCycleStatuses.NL_APPROVED,
      [endCycleActions.APPROVE]: endCycleStatuses.NL_APPROVED,
    },
  },
  [endCycleStatuses.NL_APPROVED]: {
    status: endCycleStatuses.NL_APPROVED,
    owner: "HEAD",
    nextAction: endCycleActions.HEAD_APPROVE,
    transitions: {
      [endCycleActions.RETURN]: endCycleStatuses.RETURNED,
      [endCycleActions.HEAD_APPROVE]: endCycleStatuses.HEAD_APPROVED,
    },
  },
  [endCycleStatuses.HEAD_APPROVED]: {
    status: endCycleStatuses.HEAD_APPROVED,
    owner: "HRBP",
    nextAction: endCycleActions.HRBP_APPROVE,
    transitions: {
      [endCycleActions.RETURN]: endCycleStatuses.RETURNED,
      [endCycleActions.HRBP_APPROVE]: endCycleStatuses.HRBP_APPROVED,
    },
  },
  [endCycleStatuses.HRBP_APPROVED]: {
    status: endCycleStatuses.HRBP_APPROVED,
    owner: "HRBP",
    nextAction: endCycleActions.OVERRIDE_VISIBILITY,
    transitions: {
      [endCycleActions.RETURN]: endCycleStatuses.RETURNED,
      [endCycleActions.OVERRIDE_VISIBILITY]: endCycleStatuses.VISIBILITY_APPROVED,
      [endCycleActions.COMPLETE]: endCycleStatuses.COMPLETED,
    },
  },
  [endCycleStatuses.RETURNED]: {
    status: endCycleStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: endCycleActions.SUBMIT,
    transitions: {
      [endCycleActions.UPDATE_DRAFT]: endCycleStatuses.IN_PROGRESS,
      [endCycleActions.SUBMIT]: endCycleStatuses.SUBMITTED,
    },
  },
  [endCycleStatuses.APPROVED]: {
    status: endCycleStatuses.APPROVED,
    owner: "HRBP",
    nextAction: endCycleActions.OVERRIDE_VISIBILITY,
    transitions: {
      [endCycleActions.RETURN]: endCycleStatuses.RETURNED,
      [endCycleActions.OVERRIDE_VISIBILITY]: endCycleStatuses.VISIBILITY_APPROVED,
      [endCycleActions.COMPLETE]: endCycleStatuses.COMPLETED,
    },
  },
  [endCycleStatuses.VISIBILITY_APPROVED]: {
    status: endCycleStatuses.VISIBILITY_APPROVED,
    owner: "HRBP",
    nextAction: endCycleActions.COMPLETE,
    transitions: {
      [endCycleActions.COMPLETE]: endCycleStatuses.COMPLETED,
    },
  },
  [endCycleStatuses.COMPLETED]: {
    status: endCycleStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getEndCycleState(status) {
  const state = endCycleWorkflow[status];
  if (!state) throw new Error(`Unknown end-cycle evaluation status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionEndCycleState(status, action) {
  const state = endCycleWorkflow[status];
  if (!state) throw new Error(`Unknown end-cycle evaluation status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getEndCycleState(nextStatus);
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
  const mode = reveal ? "submitted" : "hidden_preview";
  const sections = [];
  let weightedTotal = 0;
  let weightTotal = 0;
  const missingRequired = [];

  for (const section of schema.sections ?? []) {
    let sectionWeightedTotal = 0;
    let sectionWeightTotal = 0;
    const questions = [];
    for (const question of section.questions ?? []) {
      if (question.type !== "scale") continue;
      const normalized = normalizeScaleAnswer(answers[question.id]);
      if (question.required && !validateRequiredScaleAnswer(answers[question.id])) {
        missingRequired.push(question.id);
        continue;
      }
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
    if (missingRequired.length > 0) {
      throw new Error(`Required scale question is missing: ${missingRequired[0]}`);
    }
    const contribution = sectionWeightTotal > 0 ? sectionWeightedTotal / 100 : 0;
    sections.push({
      sectionId: section.id,
      sectionTitle: section.title,
      weight: sectionWeightTotal,
      contribution: reveal ? Number(contribution.toFixed(2)) : null,
      questions,
    });
    weightedTotal += sectionWeightedTotal;
    weightTotal += sectionWeightTotal;
  }

  return {
    engineVersion: "weighted-v1",
    mode,
    visible: reveal,
    totalScore: reveal && weightTotal > 0 ? Number((weightedTotal / weightTotal).toFixed(2)) : null,
    weightTotal,
    sections,
  };
}
