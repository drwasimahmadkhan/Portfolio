(function () {
  const isFileProtocol = window.location.protocol === 'file:';

  window.isPortfolioFileProtocol = function () {
    return isFileProtocol;
  };

  window.getPortfolioServerMessage = function () {
    return 'Calendar and booking need a web server. Run start-server.bat, then open http://localhost:8080';
  };

  if (!isFileProtocol) return;

  document.addEventListener('DOMContentLoaded', function () {
    const banner = document.createElement('div');
    banner.className = 'server-required-banner';
    banner.innerHTML = `
      <strong>Local server required.</strong>
      You opened this page as a file, so booking and calendar cannot work.
      Double-click <code>start-server.bat</code>, then open
      <a href="http://localhost:8080">http://localhost:8080</a>.
    `;
    document.body.prepend(banner);
  });
})();
