/* Collapse accidental double slashes in the path (e.g. Cloudflare / trailing-slash rules). */
(function () {
  if (window.location.pathname.indexOf("//") !== -1) {
    var clean = window.location.pathname.replace(/\/{2,}/g, "/");
    window.location.replace(clean + window.location.search + window.location.hash);
  }
})();
