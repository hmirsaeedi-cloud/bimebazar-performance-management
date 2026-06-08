(function () {
  const navVersion = "main-sidebar-related-blocks-1";
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
    { label: "Overview", href: "/index.html", section: "overview" },
    { label: "People", href: "/temp-profiles.html", section: "people" },
    { label: "Evaluations", href: "/temp-end-cycle-evaluation.html", section: "evaluations" },
    { label: "Processes", href: "/temp-process-engine.html", section: "processes" },
    { label: "Forms", href: "/temp-form-builder.html", section: "forms" },
    { label: "Growth", href: "/temp-goals.html", section: "growth" },
    { label: "Dashboards", href: "/temp-dashboard.html", section: "dashboards" },
    { label: "Reports", href: "/temp-advanced-analytics.html", section: "reports" },
    { label: "Admin", href: "/temp-rbac.html", section: "admin" },
  ];

  const relatedLinksBySection = {
    people: [
      ["Employees", "/temp-profiles.html"],
      ["Bulk import", "/temp-bulk-import.html"],
      ["Export report", "/temp-employee-export.html"],
      ["Org chart", "/temp-profile-org-chart.html"],
    ],
    evaluations: [
      ["End-cycle review", "/temp-end-cycle-evaluation.html"],
      ["Mid-cycle review", "/temp-mid-cycle-evaluation.html"],
      ["Side-by-side", "/temp-side-by-side-evaluation.html"],
      ["Performance flags", "/temp-performance-band-flags.html"],
    ],
    processes: [
      ["Process setup", "/temp-process-engine.html"],
      ["Form instances", "/temp-process-form-instances.html"],
      ["Self-assessment", "/temp-self-assessment.html"],
      ["Downward routing", "/temp-downward-routing.html"],
      ["Pulse surveys", "/temp-pulse-surveys.html"],
    ],
    forms: [
      ["Form builder", "/temp-form-builder.html"],
      ["Form versioning", "/temp-form-versioning.html"],
      ["Conditional logic", "/temp-conditional-logic.html"],
    ],
    growth: [
      ["Goals", "/temp-goals.html"],
      ["MPA", "/temp-mpa.html"],
      ["PIP", "/temp-pip.html"],
      ["Promotion", "/temp-promotion.html"],
      ["PD Chat", "/temp-pd-chat.html"],
    ],
    dashboards: [
      ["Role dashboards", "/temp-dashboard.html"],
      ["Notifications", "/temp-notifications.html"],
      ["Preferences", "/temp-notification-preferences.html"],
      ["Email notifications", "/temp-email-notifications.html"],
    ],
    reports: [
      ["HRBP reports", "/temp-hrbp-reports.html"],
      ["Advanced analytics", "/temp-advanced-analytics.html"],
      ["Team health", "/temp-team-health.html"],
    ],
    admin: [
      ["RBAC", "/temp-rbac.html"],
      ["Audit log", "/temp-audit-log.html"],
      ["Calendar", "/temp-calendar.html"],
      ["RTL and language", "/temp-rtl.html"],
      ["HRIS", "/temp-hris-integration.html"],
    ],
  };

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
      <span class="brand-mark brand-logo"><img src="/assets/bb-logo.svg" alt="" /></span>
      <span>
        <strong>BimeBazar</strong>
        <small>Performance</small>
      </span>
    </a>
    <nav class="nav-list" aria-label="Workspace sections">
      ${navGroups
        .map(
          ({ label, href, section }) => `
            <div class="nav-group">
              <a class="nav-item${section === activeSection ? " is-active" : ""}" href="${versioned(href)}">${label}</a>
            </div>
          `
        )
        .join("")}
    </nav>
    <div class="sidebar-footer"></div>
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
    header.querySelector(":scope > nav")?.remove();
    const titleBlock = header.querySelector("div");
    if (titleBlock && !titleBlock.querySelector(".eyebrow")) {
      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = activeSection;
      titleBlock.insertBefore(eyebrow, titleBlock.firstChild);
    }
    const relatedLinks = relatedLinksBySection[activeSection] || [];
    if (relatedLinks.length && !standaloneMain.querySelector(".related-shortcuts")) {
      const related = document.createElement("section");
      related.className = "related-shortcuts";
      related.innerHTML = `
        <div>
          <h2>Related pages</h2>
          <p>Jump to other pages in this module.</p>
        </div>
        <div class="related-shortcuts-grid">
          ${relatedLinks
            .map(([label, href]) => `<a class="${path === href.slice(1) ? "is-active" : ""}" href="${versioned(href)}">${label}</a>`)
            .join("")}
        </div>
      `;
      header.insertAdjacentElement("afterend", related);
    }
  }

  const getCurrentProfile = () => {
    const profiles = window.BimeBazarDemoData?.profiles || [];
    const userId = localStorage.getItem("bb_demo_user_id") || "demo-hr-admin";
    return profiles.find((profile) => profile.id === userId) || profiles[0] || {
      display_name: "Hossein Mirsaeedi",
      role_code: "HR_ADMIN",
    };
  };
  const profile = getCurrentProfile();
  sidebar.querySelector(".sidebar-footer").innerHTML = `
    <div class="sidebar-user">
      <div class="sidebar-user-copy">
        <span>Signed in as</span>
        <strong>${profile.display_name || profile.full_name_english || profile.email || "Demo User"}</strong>
        <small>${profile.role_code || profile.primary_role || "Demo"}</small>
      </div>
      <button class="sidebar-logout-button" type="button" aria-label="Log out" title="Log out">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 17l5-5-5-5M20 12H9" />
          <path d="M11 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
        </svg>
      </button>
    </div>
  `;
  sidebar.querySelector(".sidebar-logout-button").addEventListener("click", () => {
    localStorage.removeItem("bb_access_token");
    localStorage.removeItem("bb_refresh_token");
    localStorage.removeItem("bb_demo_user_id");
    localStorage.removeItem("bb_demo_role");
    window.location.href = versioned("/temp-login.html");
  });
})();
