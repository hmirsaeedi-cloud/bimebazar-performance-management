const views = {
  overview: {
    title: "Overview",
    panelTitle: "Today's Work",
    panelSubtitle: "Role-based priorities for the current performance cycle.",
    link: "/temp-dashboard.html",
    action: { label: "New Process", href: "/temp-process-engine.html" },
    content: "tasks",
  },
  people: {
    title: "People",
    panelTitle: "Employee Directory",
    panelSubtitle: "Active employees, managers, HRBP ownership, and profile completeness.",
    link: "/temp-profiles.html",
    action: { label: "Add Employee", href: "/temp-profiles.html" },
    content: "people",
  },
  evaluations: {
    title: "Evaluations",
    panelTitle: "Evaluation Queue",
    panelSubtitle: "Mid-cycle, end-cycle, self-assessment, and approval chain work.",
    link: "/temp-end-cycle-evaluation.html",
    action: { label: "New Evaluation", href: "/temp-end-cycle-evaluation.html" },
    content: "evaluations",
  },
  processes: {
    title: "Processes",
    panelTitle: "Cycle Processes",
    panelSubtitle: "Performance cycles, locked form instances, routing, and survey runs.",
    link: "/temp-process-engine.html",
    action: { label: "Configure Process", href: "/temp-process-engine.html" },
    content: "processes",
  },
  growth: {
    title: "Growth",
    panelTitle: "Growth Actions",
    panelSubtitle: "Goals, PD Chats, promotion, PIP, and manager development notes.",
    link: "/temp-goals.html",
    action: { label: "New Goal", href: "/temp-goals.html" },
    content: "growth",
  },
  reports: {
    title: "Reports",
    panelTitle: "Analytics",
    panelSubtitle: "HRBP snapshots, trends, cohorts, team health, and export-ready reports.",
    link: "/temp-advanced-analytics.html",
    action: { label: "New Report", href: "/temp-hrbp-reports.html" },
    content: "reports",
  },
  admin: {
    title: "Admin",
    panelTitle: "Controls",
    panelSubtitle: "Access, language, audit, notifications, integrations, and form governance.",
    link: "/temp-rbac.html",
    action: { label: "Review Audit", href: "/temp-audit-log.html" },
    content: "admin",
  },
};

const taskData = [
  ["Approve end-cycle evaluations", "8 items waiting for HR Admin review", "HR Admin", "High", "/temp-end-cycle-evaluation.html"],
  ["Return incomplete MPA", "2 agreements need manager revision", "HRBP", "Medium", "/temp-mpa.html"],
  ["Publish feedback request", "Anonymous threshold is ready for release", "HRBP", "Ready", "/temp-feedback.html"],
  ["Review PIP visibility", "Employee view is still hidden until activation", "HRBP", "Sensitive", "/temp-pip.html"],
];

const peopleData = [
  ["SA", "Sara Ahmadi", "Product Manager", "Active", "/temp-profiles.html"],
  ["RM", "Reza Moradi", "Sales Lead", "Manager", "/temp-profile-org-chart.html"],
  ["NK", "Niloofar Karimi", "Customer Success", "Review due", "/temp-profiles.html"],
  ["AM", "Ali Mansouri", "Engineering", "New hire", "/temp-bulk-import.html"],
];

const evaluationData = [
  ["Self-assessment", "Employee submitted, manager review pending", "Submitted", "gold", "/temp-self-assessment.html"],
  ["Downward evaluation", "Next-level manager review in progress", "NL review", "", "/temp-downward-routing.html"],
  ["Mid-cycle check", "HRBP approval is ready", "Ready", "green", "/temp-mid-cycle-evaluation.html"],
  ["Side-by-side comparison", "Manager score hidden until submit", "Draft", "", "/temp-side-by-side-evaluation.html"],
];

const processData = [
  ["End-cycle 1405", "96 employees, locked evaluation form v3", "74%", "/temp-process-engine.html"],
  ["Pulse survey", "Anonymous release guard is active", "41%", "/temp-pulse-surveys.html"],
  ["Individual survey", "Targeted survey for support team", "58%", "/temp-individual-surveys.html"],
  ["Form instances", "Admin movement requires audit reason", "63%", "/temp-process-form-instances.html"],
];

const growthData = [
  ["OKR goals", "Cascading key results need HRBP review", "Review", "/temp-goals.html"],
  ["PD Chat scheduler", "Recurring conversations planned", "Active", "/temp-pd-chat-scheduler.html"],
  ["Promotion cases", "3 high-band recommendations", "Ready", "/temp-promotion.html"],
  ["Performance band flags", "PIP and promotion auto-flags generated", "Generated", "/temp-performance-band-flags.html"],
];

const adminData = [
  ["RBAC", "Five roles and manager auto-assignment", "/temp-rbac.html"],
  ["Form builder", "Templates, versioning, and conditional logic", "/temp-form-builder.html"],
  ["Notifications", "Inbox, email, and user preferences", "/temp-notifications.html"],
  ["Localization", "Jalali calendar, Persian, English, and RTL", "/temp-rtl.html"],
  ["HRIS", "External employee sync and preview", "/temp-hris-integration.html"],
  ["Audit log", "Immutable event history and export trail", "/temp-audit-log.html"],
];

const navItems = document.querySelectorAll(".nav-item[data-view]");
const viewTitle = document.querySelector("#viewTitle");
const primaryAction = document.querySelector("#primaryAction");
const mainPanelTitle = document.querySelector("#mainPanelTitle");
const mainPanelSubtitle = document.querySelector("#mainPanelSubtitle");
const mainPanelLink = document.querySelector("#mainPanelLink");
const mainContent = document.querySelector("#mainContent");
const roleSelect = document.querySelector("#roleSelect");

function renderView(viewKey) {
  const view = views[viewKey] || views.overview;
  viewTitle.textContent = view.title;
  mainPanelTitle.textContent = view.panelTitle;
  mainPanelSubtitle.textContent = view.panelSubtitle;
  mainPanelLink.href = view.link;
  primaryAction.href = view.action.href;
  primaryAction.textContent = view.action.label;
  mainContent.innerHTML = renderContent(view.content);
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewKey));
}

function renderContent(type) {
  if (type === "tasks") return renderTasks(taskData);
  if (type === "people") return renderPeople();
  if (type === "evaluations") return renderTasks(evaluationData);
  if (type === "processes") return renderProcesses();
  if (type === "growth") return renderTasks(growthData);
  if (type === "reports") return renderReports();
  if (type === "admin") return renderAdmin();
  return `<div class="empty-state">No view selected.</div>`;
}

function renderTasks(rows) {
  return `
    <div class="task-list">
      ${rows
        .map(([title, subtitle, owner, status, href]) => {
          const tone = status === "High" || status === "Sensitive" ? "red" : status === "Ready" ? "green" : status === "Medium" ? "gold" : "";
          return `
            <article class="task-row">
              <div class="task-title">
                <strong>${title}</strong>
                <span>${subtitle}</span>
              </div>
              <span class="status-pill ${tone}">${status}</span>
              <a class="row-action" href="${href}">${owner}</a>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPeople() {
  return `
    <div class="employee-list">
      ${peopleData
        .map(
          ([initials, name, role, status, href]) => `
            <article class="employee-row">
              <span class="avatar">${initials}</span>
              <div>
                <strong>${name}</strong>
                <span>${role}</span>
              </div>
              <a class="row-action" href="${href}">${status}</a>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderProcesses() {
  return `
    <div class="process-list">
      ${processData
        .map(
          ([title, subtitle, progress, href]) => `
            <article class="process-item">
              <div>
                <strong>${title}</strong>
                <span>${subtitle}</span>
              </div>
              <a class="progress-track" href="${href}" aria-label="${title} ${progress} complete">
                <span style="--progress: ${progress}"></span>
              </a>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderReports() {
  return `
    <div class="report-list">
      ${[
        ["Completion trend", ["30%", "48%", "59%", "74%"], "/temp-hrbp-reports.html"],
        ["Cohort score", ["42%", "58%", "65%", "71%"], "/temp-advanced-analytics.html"],
        ["Team health", ["55%", "61%", "70%", "78%"], "/temp-team-health.html"],
        ["Feedback coverage", ["22%", "34%", "46%", "53%"], "/temp-feedback.html"],
      ]
        .map(
          ([title, values, href]) => `
            <a class="report-card" href="${href}">
              <strong>${title}</strong>
              <div class="mini-bars">
                ${values.map((value) => `<span style="--height: ${value}"></span>`).join("")}
              </div>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAdmin() {
  return `
    <div class="task-list">
      ${adminData
        .map(
          ([title, subtitle, href]) => `
            <article class="task-row">
              <div class="task-title">
                <strong>${title}</strong>
                <span>${subtitle}</span>
              </div>
              <span class="status-pill">Configured</span>
              <a class="row-action" href="${href}">Open</a>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => renderView(item.dataset.view));
});

roleSelect.addEventListener("change", () => {
  const role = roleSelect.value;
  localStorage.setItem("bb_demo_role", role);
  if (role === "employee") renderView("growth");
  if (role === "manager") renderView("evaluations");
  if (role === "hrbp") renderView("reports");
  if (role === "hr_admin") renderView("overview");
});

const storedRole = localStorage.getItem("bb_demo_role");
if (storedRole && [...roleSelect.options].some((option) => option.value === storedRole)) {
  roleSelect.value = storedRole;
  roleSelect.dispatchEvent(new Event("change"));
} else {
  renderView("overview");
}
