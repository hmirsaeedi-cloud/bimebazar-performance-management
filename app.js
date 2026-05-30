const features = [
  ["Login & authentication", "Auth", "P1", 10, 3, 17, "S1"],
  ["Employee profile CRUD (manual)", "Profiles", "P1", 10, 4, 16, "S1"],
  ["Role-based access control (5 roles)", "RBAC", "P1", 10, 5, 15, "S1"],
  ["Auto manager role assignment", "RBAC", "P1", 9, 3, 15, "S1"],
  ["Jalali calendar throughout", "Core", "P1", 10, 6, 14, "S1"],
  ["Form builder - all question types", "Forms", "P1", 10, 6, 14, "S2"],
  ["MPA employee approval workflow", "MPA", "P1", 9, 4, 14, "S3"],
  ["Bulk employee import via Excel", "Profiles", "P1", 9, 5, 13, "S2"],
  ["Process engine - create & configure", "Process", "P1", 10, 7, 13, "S2"],
  ["Upward process (self-assessment)", "Process", "P1", 9, 5, 13, "S3"],
  ["MPA creation (rich text editor)", "MPA", "P1", 9, 5, 13, "S3"],
  ["End-cycle evaluation form", "Evaluation", "P1", 10, 7, 13, "S4"],
  ["Audit log (immutable)", "Compliance", "P1", 9, 5, 13, "S5"],
  ["Form templates (self-assessment, etc.)", "Forms", "P1", 8, 4, 12, "S2"],
  ["Downward process routing chain", "Process", "P1", 10, 8, 12, "S3"],
  ["MPA auto-attach to evaluation", "MPA", "P1", 8, 4, 12, "S3"],
  ["Evaluation scoring engine (weighted)", "Evaluation", "P1", 9, 6, 12, "S4"],
  ["Evaluation workflow chain (NL -> Head -> HRBP)", "Evaluation", "P1", 10, 8, 12, "S4"],
  ["PD Chat logging (employee & manager)", "PD Chat", "P1", 8, 4, 12, "S4"],
  ["In-app notifications system", "Notif.", "P1", 9, 6, 12, "S5"],
  ["RTL + bilingual support (Persian/English)", "Core", "P1", 9, 7, 11, "S1"],
  ["Employee export report", "Profiles", "P1", 7, 3, 11, "S2"],
  ["Mid-cycle evaluation", "Evaluation", "P1", 8, 5, 11, "S4"],
  ["Dashboard (all 4 role views)", "Dashboard", "P1", 9, 7, 11, "S5"],
  ["Feedback request (basic)", "Feedback", "P2", 8, 5, 11, "S5"],
  ["Promotion trigger & workflow", "Promotion", "P2", 8, 5, 11, "S6"],
  ["PIP trigger & workflow", "PIP", "P2", 8, 6, 10, "S6"],
  ["Process detail - form instance table", "Process", "P2", 7, 4, 10, "S5"],
  ["Email notifications", "Notif.", "P2", 7, 4, 10, "S6"],
  ["MPA history & versioning", "MPA", "P2", 7, 4, 10, "S6"],
  ["Performance band auto-flag (PIP/Promo)", "Evaluation", "P3", 7, 4, 10, "S7"],
  ["Form versioning on edit", "Forms", "P2", 7, 5, 9, "S6"],
  ["Feedback anonymity & min-response guard", "Feedback", "P3", 7, 5, 9, "S7"],
  ["PD Chat auto-attach to evaluations", "PD Chat", "P3", 6, 3, 9, "S7"],
  ["Individual process (surveys)", "Process", "P2", 6, 4, 8, "S6"],
  ["HRBP aggregated reports & analytics", "Reports", "P3", 7, 6, 8, "S7"],
  ["Admin form movement with audit reason", "Process", "P3", 6, 4, 8, "S8"],
  ["Self-assessment vs. manager side-by-side", "Evaluation", "P4", 7, 6, 8, "S9"],
  ["Notification preference settings", "Notif.", "P3", 5, 3, 7, "S8"],
  ["OKR / goal cascading", "Goals", "P4", 8, 9, 7, "S9"],
  ["HRIS API integration", "Core", "P4", 8, 9, 7, "S10"],
  ["Team Health Score", "Dashboard", "P4", 7, 8, 6, "S10"],
  ["Recurring PD Chat scheduler", "PD Chat", "P4", 6, 6, 6, "S10"],
  ["Anonymized pulse surveys", "Process", "P4", 6, 6, 6, "S10"],
  ["Conditional form logic", "Forms", "P4", 6, 7, 5, "S9"],
  ["Real-time feedback / Kudos feed", "Feedback", "P4", 6, 7, 5, "S10"],
  ["Advanced analytics (trends, cohorts)", "Reports", "P4", 7, 9, 5, "S10"],
  ["Visual org chart on profile", "Profiles", "P4", 5, 6, 4, "S9"],
].map(([name, module, priority, impact, effort, score, sprint], index) => ({
  id: index + 1,
  name,
  module,
  priority,
  impact,
  effort,
  score,
  sprint,
}));

const phases = [
  { name: "Phase 1", sprints: "S1-S3", summary: "Auth, profiles, RBAC, calendar, forms, MPA foundations" },
  { name: "Phase 2", sprints: "S4-S5", summary: "Evaluation engine, workflow chain, audit log, dashboards" },
  { name: "Phase 3", sprints: "S6", summary: "PIP, promotion, email, versioning, individual process" },
  { name: "Phase 4", sprints: "S7-S8", summary: "Auto-flags, analytics, anonymity, admin movement" },
  { name: "Phase 5", sprints: "S9-S10", summary: "OKRs, HRIS, conditional logic, health score, trends" },
];

const priorityLabels = {
  P1: "Critical",
  P2: "High value",
  P3: "Moderate",
  P4: "Future",
};

const moduleColors = {
  Auth: "#0c7c7c",
  Profiles: "#438a5e",
  RBAC: "#7a548d",
  Core: "#3769b1",
  Forms: "#c48922",
  MPA: "#8c6b3f",
  Process: "#c2413a",
  Evaluation: "#315f72",
  Compliance: "#444b53",
  "PD Chat": "#537a3b",
  "Notif.": "#976a20",
  Dashboard: "#206b9f",
  Feedback: "#8f4f72",
  Promotion: "#9a5932",
  PIP: "#b13d3a",
  Reports: "#5e6781",
  Goals: "#28745f",
};

const briefs = {
  Auth: "Create secure session entry points and account recovery primitives before role-specific surfaces come online.",
  Profiles: "Model the employee record as the source of truth for role, org, manager, level, and status changes.",
  RBAC: "Centralize permissions early so every route, process action, and dashboard view inherits the same policy.",
  Core: "Handle localization, Jalali dates, and platform-wide foundations once so later modules do not fork behavior.",
  Forms: "Represent form structure as versioned JSON so process instances can preserve the exact form used at launch.",
  MPA: "Treat MPAs as cycle-scoped agreements with review, approval, revision, history, and evaluation attachment.",
  Process: "Build the state machine first with status, owner, next action, and audit events before investing in UI.",
  Evaluation: "Keep scoring transparent, weighted, and hidden from managers until submit to prevent anchoring bias.",
  Compliance: "Capture immutable activity for sensitive transitions, overrides, visibility gates, and HR interventions.",
  "PD Chat": "Make lightweight conversation records easy to log, filter, and attach to evaluation context.",
  "Notif.": "Route time-sensitive tasks through in-app notifications first, then email and user preferences.",
  Dashboard: "Show role-sensitive tasks, progress, and exceptions as the landing page for each user type.",
  Feedback: "Start with simple requests, then add anonymity thresholds and response guardrails.",
  Promotion: "Connect high performance bands to review workflows with explicit approval visibility.",
  PIP: "Gate visibility carefully: employees should not see PIP details until HRBP activation.",
  Reports: "Aggregate operational health and completion trends without exposing inappropriate individual data.",
  Goals: "Defer cascading OKRs until the core process and evaluation data model is stable.",
};

const state = {
  priority: "All",
  search: "",
};

const roadmap = document.querySelector("#roadmap");
const priorityFilters = document.querySelector("#priorityFilters");
const searchInput = document.querySelector("#searchInput");
const summaryRow = document.querySelector("#summaryRow");
const dialog = document.querySelector("#featureDialog");
const dialogContent = document.querySelector("#dialogContent");
const phaseStrip = document.querySelector("#phaseStrip");

function renderPhases() {
  phaseStrip.innerHTML = phases
    .map(
      (phase) => `
        <article class="phase-tile">
          <strong>${phase.name} <span>${phase.sprints}</span></strong>
          <span>${phase.summary}</span>
        </article>
      `,
    )
    .join("");
}

function renderFilters() {
  const priorities = ["All", "P1", "P2", "P3", "P4"];
  priorityFilters.innerHTML = priorities
    .map((priority) => {
      const label = priority === "All" ? "All priorities" : `${priority} ${priorityLabels[priority]}`;
      return `<button class="chip" data-priority="${priority}" aria-pressed="${state.priority === priority}">${label}</button>`;
    })
    .join("");

  priorityFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.priority = button.dataset.priority;
      render();
    });
  });
}

function getFilteredFeatures() {
  const query = state.search.trim().toLowerCase();
  return features.filter((feature) => {
    const priorityMatch = state.priority === "All" || feature.priority === state.priority;
    const haystack = `${feature.name} ${feature.module} ${feature.priority} ${feature.sprint}`.toLowerCase();
    return priorityMatch && (!query || haystack.includes(query));
  });
}

function renderSummary(filtered) {
  const avgScore = filtered.length
    ? (filtered.reduce((sum, feature) => sum + feature.score, 0) / filtered.length).toFixed(1)
    : "0";
  const p1Count = filtered.filter((feature) => feature.priority === "P1").length;
  const sprintCount = new Set(filtered.map((feature) => feature.sprint)).size;
  const moduleCount = new Set(filtered.map((feature) => feature.module)).size;

  summaryRow.innerHTML = [
    ["Visible features", filtered.length],
    ["P1 in view", p1Count],
    ["Avg score", avgScore],
    ["Modules", moduleCount || sprintCount],
  ]
    .map(([label, value]) => `<div class="summary-card"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function cardDescription(feature) {
  return briefs[feature.module] || "Build this as a scoped module with clear ownership, auditability, and acceptance tests.";
}

function renderRoadmap(filtered) {
  const sprints = [...new Set(features.map((feature) => feature.sprint))];
  const sections = sprints
    .map((sprint) => {
      const sprintFeatures = filtered.filter((feature) => feature.sprint === sprint);
      if (!sprintFeatures.length) return "";
      return `
        <section class="sprint-section">
          <div class="sprint-header">
            <h2>${sprint}</h2>
            <span>${sprintFeatures.length} feature${sprintFeatures.length === 1 ? "" : "s"}</span>
          </div>
          <div class="feature-grid">
            ${sprintFeatures.map(renderCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  roadmap.innerHTML = sections || `<div class="empty-state">No features match the current filters.</div>`;
  roadmap.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("click", () => openFeature(Number(card.dataset.id)));
  });
}

function renderCard(feature) {
  const color = moduleColors[feature.module] || "#0c7c7c";
  return `
    <button class="feature-card" data-id="${feature.id}">
      <span class="card-top">
        <span class="badge ${feature.priority.toLowerCase()}">${feature.priority} ${priorityLabels[feature.priority]}</span>
        <span class="module-dot" style="background:${color}"></span>
        <span class="badge">${feature.module}</span>
      </span>
      <span>
        <h3>${feature.name}</h3>
        <p>${cardDescription(feature)}</p>
      </span>
      <span class="metric-row">
        <span>Impact ${feature.impact}/10</span>
        <span>Effort ${feature.effort}/10</span>
        <span class="score-pill">${feature.score}</span>
      </span>
    </button>
  `;
}

function getAcceptanceCriteria(feature) {
  const criteria = [
    `Role permissions are enforced for every ${feature.module} route and action.`,
    "Every create, update, submit, approve, return, override, and visibility change writes an audit event.",
    "State transitions are represented as explicit status, owner, and nextAction values.",
  ];

  if (feature.module === "Evaluation") {
    criteria.push("Weighted score shows section contribution after submission, while manager sees no computed score before submit.");
    criteria.push("A required scale answer of 0 is valid only when intentionally selected, not as a missing default.");
  }
  if (feature.module === "Process") {
    criteria.push("Processes cannot start when org filters produce zero eligible employees.");
    criteria.push("In-flight processes keep their selected form version even after template edits.");
  }
  if (feature.module === "MPA") {
    criteria.push("Prevent a second active MPA for the same employee and cycle unless the old one is archived.");
  }
  if (feature.module === "PIP") {
    criteria.push("PIP content remains hidden from the employee until HRBP activates visibility.");
  }
  if (feature.module === "Feedback") {
    criteria.push("Deactivated users are excluded from recipient search and anonymous zero-response requests can be extended or closed.");
  }

  return criteria;
}

function scaffoldPrompt(feature) {
  const criteria = getAcceptanceCriteria(feature).map((item) => `- ${item}`).join("\n");
  return `Create an implementation scaffold for "${feature.name}" in the BimeBazar Performance Management platform.

Context:
- Module: ${feature.module}
- Priority: ${feature.priority} (${priorityLabels[feature.priority]})
- Sprint: ${feature.sprint}
- Impact: ${feature.impact}/10
- Effort: ${feature.effort}/10
- Score: ${feature.score}
- Target stack: monorepo with Next.js frontend and Node/Express API

Vibe-code this in steps:
1. Data model and migrations
2. API routes, validation, and RBAC middleware
3. State machine config with status, owner, and nextAction
4. Frontend screens/components
5. Audit log and notifications hooks
6. Tests and seed data

Acceptance criteria:
${criteria}`;
}

function openFeature(id) {
  const feature = features.find((item) => item.id === id);
  if (!feature) return;

  const prompt = scaffoldPrompt(feature);
  const criteria = getAcceptanceCriteria(feature);
  dialogContent.innerHTML = `
    <h2 class="dialog-title">${feature.name}</h2>
    <div class="dialog-meta">
      <span class="badge ${feature.priority.toLowerCase()}">${feature.priority} ${priorityLabels[feature.priority]}</span>
      <span class="badge">${feature.module}</span>
      <span class="badge">${feature.sprint}</span>
      <span class="score-pill">Score ${feature.score}</span>
    </div>
    <section class="dialog-section">
      <h3>Brief</h3>
      <p>${cardDescription(feature)}</p>
    </section>
    <section class="dialog-section">
      <h3>Acceptance Criteria</h3>
      <p>${criteria.join("<br>")}</p>
    </section>
    <section class="dialog-section">
      <h3>How to vibe-code this</h3>
      <textarea class="prompt-box" readonly>${prompt}</textarea>
    </section>
    <button class="copy-button" type="button">Copy scaffold prompt</button>
  `;

  dialogContent.querySelector(".copy-button").addEventListener("click", async (event) => {
    const textarea = dialogContent.querySelector(".prompt-box");
    textarea.select();
    try {
      await navigator.clipboard.writeText(textarea.value);
      event.currentTarget.textContent = "Copied";
    } catch {
      document.execCommand("copy");
      event.currentTarget.textContent = "Copied";
    }
  });

  dialog.showModal();
}

function render() {
  renderFilters();
  const filtered = getFilteredFeatures();
  renderSummary(filtered);
  renderRoadmap(filtered);
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  render();
});

renderPhases();
render();
