(function () {
  const navVersion = "main-sidebar-related-blocks-1";
  const path = window.location.pathname.split("/").pop() || "index.html";
  const versioned = (href) => {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}v=${navVersion}`;
  };
  const getCurrentProfile = () => {
    const profiles = window.BimeBazarDemoData?.profiles || [];
    const userId = localStorage.getItem("bb_demo_user_id") || "demo-hr-admin";
    return profiles.find((profile) => profile.id === userId) || profiles[0] || {
      display_name: "Hossein Mirsaeedi",
      role_code: "HR_ADMIN",
    };
  };
  const renderUserFooter = () => {
    const profile = getCurrentProfile();
    document.querySelectorAll(".sidebar-footer, .side-footer").forEach((footer) => {
      footer.innerHTML = `
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
    });
  };
  const keepSidebarMainOnly = () => {
    document.querySelectorAll(".sidebar .nav-submenu").forEach((submenu) => submenu.remove());
    document.querySelectorAll(".sidebar .shortcut-list").forEach((list) => list.remove());
  };
  keepSidebarMainOnly();
  document.querySelectorAll('.sidebar a[href^="/"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.includes("v=")) return;
    const separator = href.includes("?") ? "&" : "?";
    link.setAttribute("href", `${href}${separator}v=${navVersion}`);
  });
  renderUserFooter();
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-logout-button");
    if (!button) return;
    localStorage.removeItem("bb_access_token");
    localStorage.removeItem("bb_refresh_token");
    localStorage.removeItem("bb_demo_user_id");
    localStorage.removeItem("bb_demo_role");
    window.location.href = `/temp-login.html?v=${navVersion}`;
  });
})();
