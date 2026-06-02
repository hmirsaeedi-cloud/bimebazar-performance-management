export const comparisonStatuses = Object.freeze({
  DRAFT: "draft",
  IN_REVIEW: "in_review",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  RETURNED: "returned",
  VISIBILITY_APPROVED: "visibility_approved",
  COMPLETED: "completed",
});

export const comparisonActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  COMPLETE: "complete",
});

export const comparisonWorkflow = Object.freeze({
  [comparisonStatuses.DRAFT]: {
    status: comparisonStatuses.DRAFT,
    owner: "MANAGER",
    nextAction: comparisonActions.UPDATE,
    transitions: {
      [comparisonActions.UPDATE]: comparisonStatuses.IN_REVIEW,
      [comparisonActions.SUBMIT]: comparisonStatuses.SUBMITTED,
      [comparisonActions.OVERRIDE_VISIBILITY]: comparisonStatuses.DRAFT,
    },
  },
  [comparisonStatuses.IN_REVIEW]: {
    status: comparisonStatuses.IN_REVIEW,
    owner: "MANAGER",
    nextAction: comparisonActions.SUBMIT,
    transitions: {
      [comparisonActions.UPDATE]: comparisonStatuses.IN_REVIEW,
      [comparisonActions.SUBMIT]: comparisonStatuses.SUBMITTED,
      [comparisonActions.OVERRIDE_VISIBILITY]: comparisonStatuses.IN_REVIEW,
    },
  },
  [comparisonStatuses.SUBMITTED]: {
    status: comparisonStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: comparisonActions.APPROVE,
    transitions: {
      [comparisonActions.APPROVE]: comparisonStatuses.APPROVED,
      [comparisonActions.RETURN]: comparisonStatuses.RETURNED,
      [comparisonActions.OVERRIDE_VISIBILITY]: comparisonStatuses.SUBMITTED,
    },
  },
  [comparisonStatuses.APPROVED]: {
    status: comparisonStatuses.APPROVED,
    owner: "HRBP",
    nextAction: comparisonActions.OVERRIDE_VISIBILITY,
    transitions: {
      [comparisonActions.RETURN]: comparisonStatuses.RETURNED,
      [comparisonActions.OVERRIDE_VISIBILITY]: comparisonStatuses.VISIBILITY_APPROVED,
      [comparisonActions.COMPLETE]: comparisonStatuses.COMPLETED,
    },
  },
  [comparisonStatuses.RETURNED]: {
    status: comparisonStatuses.RETURNED,
    owner: "MANAGER",
    nextAction: comparisonActions.UPDATE,
    transitions: {
      [comparisonActions.UPDATE]: comparisonStatuses.IN_REVIEW,
      [comparisonActions.SUBMIT]: comparisonStatuses.SUBMITTED,
      [comparisonActions.OVERRIDE_VISIBILITY]: comparisonStatuses.RETURNED,
    },
  },
  [comparisonStatuses.VISIBILITY_APPROVED]: {
    status: comparisonStatuses.VISIBILITY_APPROVED,
    owner: "HRBP",
    nextAction: comparisonActions.COMPLETE,
    transitions: {
      [comparisonActions.COMPLETE]: comparisonStatuses.COMPLETED,
    },
  },
  [comparisonStatuses.COMPLETED]: {
    status: comparisonStatuses.COMPLETED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getComparisonState(status) {
  const state = comparisonWorkflow[status];
  if (!state) throw new Error(`Unknown evaluation comparison status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionComparisonState(status, action) {
  const state = comparisonWorkflow[status];
  if (!state) throw new Error(`Unknown evaluation comparison status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getComparisonState(nextStatus);
}

export function buildSideBySideRows(schema = {}, selfAnswers = {}, managerAnswers = {}) {
  const rows = [];
  for (const section of schema.sections ?? []) {
    for (const question of section.questions ?? []) {
      const selfAnswer = selfAnswers[question.id] ?? null;
      const managerAnswer = managerAnswers[question.id] ?? null;
      rows.push({
        sectionId: section.id,
        sectionTitle: section.title,
        questionId: question.id,
        questionLabel: question.label ?? question.title ?? question.id,
        questionType: question.type,
        weight: question.weight ?? 0,
        selfAnswer,
        managerAnswer,
        different: JSON.stringify(selfAnswer) !== JSON.stringify(managerAnswer),
      });
    }
  }
  return rows;
}

export function summarizeComparison(rows = []) {
  const differentCount = rows.filter((row) => row.different).length;
  return {
    questionCount: rows.length,
    alignedCount: rows.length - differentCount,
    differentCount,
    alignmentRate: rows.length > 0 ? Number((((rows.length - differentCount) / rows.length) * 100).toFixed(2)) : 0,
  };
}
