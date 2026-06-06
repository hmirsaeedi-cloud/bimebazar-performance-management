(function () {
  const navVersion = "nav-submenu-2";
  document.querySelectorAll('.sidebar a[href^="/"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.includes("v=nav-submenu-")) return;
    const separator = href.includes("?") ? "&" : "?";
    link.setAttribute("href", `${href}${separator}v=${navVersion}`);
  });
})();
