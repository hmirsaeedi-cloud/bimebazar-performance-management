(function () {
  const navVersion = "nav-submenu-2";
  const versioned = (href) => {
    if (!href.startsWith("/")) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}v=${navVersion}`;
  };
  const path = window.location.pathname.split("/").pop() || "index.html";
  const standaloneMain = document.body.firstElementChild?.tagName === "MAIN" ? document.body.firstElementChild : null;

  if (!standaloneMain || document.querySelector(".app-shell, body > .layout aside")) {
    return;
  }

  const navGroups = [
    { label: "Overview", href: "/index.html", section: "overview", children: [] },
    {
      label: "People",
      href: "/temp-profiles.html",
      section: "people",
      children: [
        ["Employees", "/temp-profiles.html"],
        ["Bulk import", "/temp-bulk-import.html"],
        ["Export report", "/temp-employee-export.html"],
        ["Org chart", "/temp-profile-org-chart.html"],
      ],
    },
    {
      label: "Evaluations",
      href: "/temp-end-cycle-evaluation.html",
      section: "evaluations",
      children: [
        ["End-cycle review", "/temp-end-cycle-evaluation.html"],
        ["Mid-cycle review", "/temp-mid-cycle-evaluation.html"],
        ["Side-by-side", "/temp-side-by-side-evaluation.html"],
        ["Performance flags", "/temp-performance-band-flags.html"],
      ],
    },
    {
      label: "Processes",
      href: "/temp-process-engine.html",
      section: "processes",
      children: [
        ["Process setup", "/temp-process-engine.html"],
        ["Form instances", "/temp-process-form-instances.html"],
        ["Self-assessment", "/temp-self-assessment.html"],
        ["Downward routing", "/temp-downward-routing.html"],
        ["Pulse surveys", "/temp-pulse-surveys.html"],
      ],
    },
    {
      label: "Forms",
      href: "/temp-form-builder.html",
      section: "forms",
      children: [
        ["Form builder", "/temp-form-builder.html"],
        ["Form versioning", "/temp-form-versioning.html"],
        ["Conditional logic", "/temp-conditional-logic.html"],
      ],
    },
    {
      label: "Growth",
      href: "/temp-goals.html",
      section: "growth",
      children: [
        ["Goals", "/temp-goals.html"],
        ["MPA", "/temp-mpa.html"],
        ["PIP", "/temp-pip.html"],
        ["Promotion", "/temp-promotion.html"],
        ["PD Chat", "/temp-pd-chat.html"],
      ],
    },
    {
      label: "Dashboards",
      href: "/temp-dashboard.html",
      section: "dashboards",
      children: [
        ["Role dashboards", "/temp-dashboard.html"],
        ["Notifications", "/temp-notifications.html"],
        ["Preferences", "/temp-notification-preferences.html"],
        ["Email notifications", "/temp-email-notifications.html"],
      ],
    },
    {
      label: "Reports",
      href: "/temp-advanced-analytics.html",
      section: "reports",
      children: [
        ["HRBP reports", "/temp-hrbp-reports.html"],
        ["Advanced analytics", "/temp-advanced-analytics.html"],
        ["Team health", "/temp-team-health.html"],
      ],
    },
    {
      label: "Admin",
      href: "/temp-rbac.html",
      section: "admin",
      children: [
        ["RBAC", "/temp-rbac.html"],
        ["Audit log", "/temp-audit-log.html"],
        ["Calendar", "/temp-calendar.html"],
        ["RTL and language", "/temp-rtl.html"],
        ["HRIS", "/temp-hris-integration.html"],
      ],
    },
  ];

  const activeSection = (() => {
    if (/profile|employee|bulk-import/.test(path)) return "people";
    if (/evaluation|band|mid-cycle|side-by-side/.test(path)) return "evaluations";
    if (/process|assessment|routing|survey|pulse/.test(path)) return "processes";
    if (/form|conditional/.test(path)) return "forms";
    if (/goal|pip|promotion|mpa|pd-chat/.test(path)) return "growth";
    if (/dashboard|team-health|notification/.test(path)) return "dashboards";
    if (/report|analytics|export/.test(path)) return "reports";
    if (/audit|rbac|calendar|rtl|hris|login/.test(path)) return "admin";
    return "overview";
  })();

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.setAttribute("aria-label", "Primary navigation");
  sidebar.innerHTML = `
    <a class="brand" href="/index.html" aria-label="BimeBazar home">
      <span class="brand-mark">BB</span>
      <span>
        <strong>BimeBazar</strong>
        <small>Performance</small>
      </span>
    </a>
    <nav class="nav-list" aria-label="Workspace sections">
      ${navGroups
        .map(
          ({ label, href, section, children }) => `
            <div class="nav-group">
              <a class="nav-item${section === activeSection ? " is-active" : ""}" href="${versioned(href)}">${label}</a>
              ${
                children.length
                  ? `<div class="nav-submenu">${children
                      .map(([childLabel, childHref]) => `<a class="nav-subitem${path === childHref.slice(1) ? " is-active" : ""}" href="${versioned(childHref)}">${childLabel}</a>`)
                      .join("")}</div>`
                  : ""
              }
            </div>
          `
        )
        .join("")}
    </nav>
    <div class="sidebar-footer">
      <a href="${versioned("/temp-login.html")}">Login</a>
      <a href="${versioned("/temp-dashboard.html")}">Dashboard Detail</a>
      <a href="${versioned("/temp-profiles.html")}">People Detail</a>
    </div>
  `;

  const shell = document.createElement("div");
  shell.className = "app-shell";
  document.body.insertBefore(shell, standaloneMain);
  shell.appendChild(sidebar);
  shell.appendChild(standaloneMain);

  standaloneMain.classList.add("workspace", "detail-workspace");

  const header = standaloneMain.querySelector(":scope > header");
  if (header) {
    header.classList.add("topbar");
    const titleBlock = header.querySelector("div");
    if (titleBlock && !titleBlock.querySelector(".eyebrow")) {
      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = activeSection;
      titleBlock.insertBefore(eyebrow, titleBlock.firstChild);
    }
  }
})();
