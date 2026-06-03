export const conditionalLogicStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ACTIVE: "active",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const conditionalLogicActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE: "activate",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const conditionalLogicWorkflow = Object.freeze({
  [conditionalLogicStatuses.DRAFT]: {
    status: conditionalLogicStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: conditionalLogicActions.SUBMIT,
    transitions: {
      [conditionalLogicActions.UPDATE]: conditionalLogicStatuses.DRAFT,
      [conditionalLogicActions.SUBMIT]: conditionalLogicStatuses.SUBMITTED,
      [conditionalLogicActions.OVERRIDE_VISIBILITY]: conditionalLogicStatuses.VISIBILITY_CHANGED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.SUBMITTED]: {
    status: conditionalLogicStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: conditionalLogicActions.APPROVE,
    transitions: {
      [conditionalLogicActions.APPROVE]: conditionalLogicStatuses.APPROVED,
      [conditionalLogicActions.RETURN]: conditionalLogicStatuses.RETURNED,
      [conditionalLogicActions.OVERRIDE_VISIBILITY]: conditionalLogicStatuses.VISIBILITY_CHANGED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.APPROVED]: {
    status: conditionalLogicStatuses.APPROVED,
    owner: "HR_ADMIN",
    nextAction: conditionalLogicActions.ACTIVATE,
    transitions: {
      [conditionalLogicActions.ACTIVATE]: conditionalLogicStatuses.ACTIVE,
      [conditionalLogicActions.RETURN]: conditionalLogicStatuses.RETURNED,
      [conditionalLogicActions.OVERRIDE_VISIBILITY]: conditionalLogicStatuses.VISIBILITY_CHANGED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.ACTIVE]: {
    status: conditionalLogicStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [conditionalLogicActions.OVERRIDE_VISIBILITY]: conditionalLogicStatuses.VISIBILITY_CHANGED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.RETURNED]: {
    status: conditionalLogicStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: conditionalLogicActions.UPDATE,
    transitions: {
      [conditionalLogicActions.UPDATE]: conditionalLogicStatuses.DRAFT,
      [conditionalLogicActions.SUBMIT]: conditionalLogicStatuses.SUBMITTED,
      [conditionalLogicActions.OVERRIDE_VISIBILITY]: conditionalLogicStatuses.VISIBILITY_CHANGED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.VISIBILITY_CHANGED]: {
    status: conditionalLogicStatuses.VISIBILITY_CHANGED,
    owner: "HR_ADMIN",
    nextAction: conditionalLogicActions.UPDATE,
    transitions: {
      [conditionalLogicActions.UPDATE]: conditionalLogicStatuses.DRAFT,
      [conditionalLogicActions.SUBMIT]: conditionalLogicStatuses.SUBMITTED,
      [conditionalLogicActions.ARCHIVE]: conditionalLogicStatuses.ARCHIVED,
    },
  },
  [conditionalLogicStatuses.ARCHIVED]: {
    status: conditionalLogicStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getConditionalLogicState(status) {
  const state = conditionalLogicWorkflow[status];
  if (!state) throw new Error(`Unknown conditional logic status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionConditionalLogicState(status, action) {
  const state = conditionalLogicWorkflow[status];
  if (!state) throw new Error(`Unknown conditional logic status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getConditionalLogicState(nextStatus);
}

export function evaluateConditionalRules(rules, answers = {}) {
  const visibleQuestionIds = new Set();
  const hiddenQuestionIds = new Set();
  const requiredQuestionIds = new Set();
  const matchedRuleIds = [];

  for (const rule of Array.isArray(rules) ? rules : []) {
    const sourceValue = answers[rule.sourceQuestionId];
    const matched = compareAnswer(sourceValue, rule.operator, rule.value);
    if (!matched) continue;
    matchedRuleIds.push(rule.id);
    for (const target of rule.targets ?? []) {
      if (target.effect === "show") {
        visibleQuestionIds.add(target.questionId);
        hiddenQuestionIds.delete(target.questionId);
      }
      if (target.effect === "hide") {
        hiddenQuestionIds.add(target.questionId);
        visibleQuestionIds.delete(target.questionId);
        requiredQuestionIds.delete(target.questionId);
      }
      if (target.effect === "require") requiredQuestionIds.add(target.questionId);
      if (target.effect === "optional") requiredQuestionIds.delete(target.questionId);
    }
  }

  return {
    visibleQuestionIds: [...visibleQuestionIds],
    hiddenQuestionIds: [...hiddenQuestionIds],
    requiredQuestionIds: [...requiredQuestionIds],
    matchedRuleIds,
  };
}

function compareAnswer(answer, operator, expected) {
  if (operator === "is_empty") return answer === undefined || answer === null || answer === "";
  if (operator === "is_not_empty") return !(answer === undefined || answer === null || answer === "");
  if (operator === "equals") return answer === expected;
  if (operator === "not_equals") return answer !== expected;
  if (operator === "contains") {
    if (Array.isArray(answer)) return answer.includes(expected);
    return String(answer ?? "").includes(String(expected ?? ""));
  }
  if (operator === "not_contains") {
    if (Array.isArray(answer)) return !answer.includes(expected);
    return !String(answer ?? "").includes(String(expected ?? ""));
  }
  if (operator === "gt") return Number(answer) > Number(expected);
  if (operator === "gte") return Number(answer) >= Number(expected);
  if (operator === "lt") return Number(answer) < Number(expected);
  if (operator === "lte") return Number(answer) <= Number(expected);
  throw new Error(`Unsupported conditional operator: ${operator}`);
}
