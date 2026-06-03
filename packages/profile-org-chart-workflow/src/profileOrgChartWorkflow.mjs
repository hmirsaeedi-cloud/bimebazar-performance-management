export const profileOrgChartStatuses = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ACTIVE: "active",
  RETURNED: "returned",
  VISIBILITY_CHANGED: "visibility_changed",
  ARCHIVED: "archived",
});

export const profileOrgChartActions = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  REFRESH_SNAPSHOT: "refresh_snapshot",
  SUBMIT: "submit",
  APPROVE: "approve",
  ACTIVATE: "activate",
  RETURN: "return",
  OVERRIDE_VISIBILITY: "override_visibility",
  ARCHIVE: "archive",
});

export const profileOrgChartWorkflow = Object.freeze({
  [profileOrgChartStatuses.DRAFT]: {
    status: profileOrgChartStatuses.DRAFT,
    owner: "HR_ADMIN",
    nextAction: profileOrgChartActions.SUBMIT,
    transitions: {
      [profileOrgChartActions.UPDATE]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.REFRESH_SNAPSHOT]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.SUBMIT]: profileOrgChartStatuses.SUBMITTED,
      [profileOrgChartActions.OVERRIDE_VISIBILITY]: profileOrgChartStatuses.VISIBILITY_CHANGED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.SUBMITTED]: {
    status: profileOrgChartStatuses.SUBMITTED,
    owner: "HRBP",
    nextAction: profileOrgChartActions.APPROVE,
    transitions: {
      [profileOrgChartActions.APPROVE]: profileOrgChartStatuses.APPROVED,
      [profileOrgChartActions.RETURN]: profileOrgChartStatuses.RETURNED,
      [profileOrgChartActions.OVERRIDE_VISIBILITY]: profileOrgChartStatuses.VISIBILITY_CHANGED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.APPROVED]: {
    status: profileOrgChartStatuses.APPROVED,
    owner: "HR_ADMIN",
    nextAction: profileOrgChartActions.ACTIVATE,
    transitions: {
      [profileOrgChartActions.ACTIVATE]: profileOrgChartStatuses.ACTIVE,
      [profileOrgChartActions.RETURN]: profileOrgChartStatuses.RETURNED,
      [profileOrgChartActions.OVERRIDE_VISIBILITY]: profileOrgChartStatuses.VISIBILITY_CHANGED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.ACTIVE]: {
    status: profileOrgChartStatuses.ACTIVE,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {
      [profileOrgChartActions.REFRESH_SNAPSHOT]: profileOrgChartStatuses.ACTIVE,
      [profileOrgChartActions.OVERRIDE_VISIBILITY]: profileOrgChartStatuses.VISIBILITY_CHANGED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.RETURNED]: {
    status: profileOrgChartStatuses.RETURNED,
    owner: "HR_ADMIN",
    nextAction: profileOrgChartActions.UPDATE,
    transitions: {
      [profileOrgChartActions.UPDATE]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.REFRESH_SNAPSHOT]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.SUBMIT]: profileOrgChartStatuses.SUBMITTED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.VISIBILITY_CHANGED]: {
    status: profileOrgChartStatuses.VISIBILITY_CHANGED,
    owner: "HR_ADMIN",
    nextAction: profileOrgChartActions.UPDATE,
    transitions: {
      [profileOrgChartActions.UPDATE]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.REFRESH_SNAPSHOT]: profileOrgChartStatuses.DRAFT,
      [profileOrgChartActions.SUBMIT]: profileOrgChartStatuses.SUBMITTED,
      [profileOrgChartActions.ARCHIVE]: profileOrgChartStatuses.ARCHIVED,
    },
  },
  [profileOrgChartStatuses.ARCHIVED]: {
    status: profileOrgChartStatuses.ARCHIVED,
    owner: "SYSTEM",
    nextAction: null,
    transitions: {},
  },
});

export function getProfileOrgChartState(status) {
  const state = profileOrgChartWorkflow[status];
  if (!state) throw new Error(`Unknown org chart status: ${status}`);
  return { status: state.status, owner: state.owner, nextAction: state.nextAction };
}

export function transitionProfileOrgChartState(status, action) {
  const state = profileOrgChartWorkflow[status];
  if (!state) throw new Error(`Unknown org chart status: ${status}`);
  const nextStatus = state.transitions[action];
  if (!nextStatus) throw new Error(`Action ${action} is not allowed from ${status}`);
  return getProfileOrgChartState(nextStatus);
}

export function buildOrgChartSnapshot(profiles, rootProfileId, maxDepth = 3) {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const childrenByManager = new Map();
  for (const profile of profiles) {
    if (!profile.manager_id) continue;
    const children = childrenByManager.get(profile.manager_id) ?? [];
    children.push(profile);
    childrenByManager.set(profile.manager_id, children);
  }

  const root = byId.get(rootProfileId);
  if (!root) throw new Error("Root profile was not found");

  const nodes = [];
  const edges = [];
  const seen = new Set();
  const visit = (profile, depth) => {
    if (!profile || seen.has(profile.id) || depth > maxDepth) return;
    seen.add(profile.id);
    nodes.push(toNode(profile, depth));
    for (const child of childrenByManager.get(profile.id) ?? []) {
      edges.push({ from: profile.id, to: child.id, relationship: "manager" });
      visit(child, depth + 1);
    }
  };

  if (root.manager_id && byId.has(root.manager_id)) {
    const manager = byId.get(root.manager_id);
    nodes.push(toNode(manager, -1));
    edges.push({ from: manager.id, to: root.id, relationship: "manager" });
  }
  visit(root, 0);

  return {
    rootProfileId,
    generatedAt: new Date().toISOString(),
    maxDepth,
    nodes,
    edges,
    directReportCount: (childrenByManager.get(rootProfileId) ?? []).length,
  };
}

function toNode(profile, depth) {
  return {
    id: profile.id,
    employeeId: profile.employee_id,
    name: profile.full_name_english || profile.display_name || profile.email,
    persianName: profile.full_name_persian || null,
    title: profile.position_title || "Not assigned",
    level: profile.level || null,
    managerId: profile.manager_id || null,
    status: profile.account_status,
    depth,
  };
}
