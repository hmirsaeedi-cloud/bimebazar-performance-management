export const dashboardViews = Object.freeze({
  EMPLOYEE: "employee",
  MANAGER: "manager",
  HRBP: "hrbp",
  HR_ADMIN: "hr_admin",
});

export const dashboardStatuses = Object.freeze({
  DEFAULTED: "defaulted",
  CUSTOMIZED: "customized",
  OVERRIDE_PENDING: "override_pending",
  OVERRIDDEN: "overridden",
});

export const dashboardActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  REQUEST_OVERRIDE: "request_override",
  APPROVE_OVERRIDE: "approve_override",
});

export const dashboardWorkflow = Object.freeze({
  [dashboardStatuses.DEFAULTED]: {
    status: dashboardStatuses.DEFAULTED,
    owner: "USER",
    nextAction: dashboardActions.UPDATE,
    transitions: {
      [dashboardActions.UPDATE]: dashboardStatuses.CUSTOMIZED,
      [dashboardActions.REQUEST_OVERRIDE]: dashboardStatuses.OVERRIDE_PENDING,
    },
  },
  [dashboardStatuses.CUSTOMIZED]: {
    status: dashboardStatuses.CUSTOMIZED,
    owner: "USER",
    nextAction: dashboardActions.UPDATE,
    transitions: {
      [dashboardActions.UPDATE]: dashboardStatuses.CUSTOMIZED,
      [dashboardActions.REQUEST_OVERRIDE]: dashboardStatuses.OVERRIDE_PENDING,
    },
  },
  [dashboardStatuses.OVERRIDE_PENDING]: {
    status: dashboardStatuses.OVERRIDE_PENDING,
    owner: "HR_ADMIN",
    nextAction: dashboardActions.APPROVE_OVERRIDE,
    transitions: {
      [dashboardActions.APPROVE_OVERRIDE]: dashboardStatuses.OVERRIDDEN,
    },
  },
  [dashboardStatuses.OVERRIDDEN]: {
    status: dashboardStatuses.OVERRIDDEN,
    owner: "USER",
    nextAction: dashboardActions.UPDATE,
    transitions: {
      [dashboardActions.UPDATE]: dashboardStatuses.CUSTOMIZED,
    },
  },
});

export function resolveDashboardView(roles = []) {
  if (roles.includes("HR_ADMIN")) return dashboardViews.HR_ADMIN;
  if (roles.includes("HRBP")) return dashboardViews.HRBP;
  if (roles.includes("MANAGER") || roles.includes("NEXT_LEVEL_MANAGER")) return dashboardViews.MANAGER;
  return dashboardViews.EMPLOYEE;
}

export function getDashboardState(status) {
  const state = dashboardWorkflow[status];
  if (!state) throw new Error(`Unknown dashboard status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionDashboardState(status, action) {
  const state = dashboardWorkflow[status];
  if (!state) throw new Error(`Unknown dashboard status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getDashboardState(nextStatus);
}

export function defaultDashboardLayout(view) {
  const shared = ["tasks_due", "notifications", "recent_activity"];
  const byView = {
    [dashboardViews.EMPLOYEE]: ["my_profile", "self_assessments", "pd_chats"],
    [dashboardViews.MANAGER]: ["team_tasks", "mpas", "evaluations"],
    [dashboardViews.HRBP]: ["process_health", "pip_watchlist", "approvals"],
    [dashboardViews.HR_ADMIN]: ["system_health", "audit_integrity", "role_coverage"],
  };
  return [...(byView[view] ?? byView[dashboardViews.EMPLOYEE]), ...shared];
}
