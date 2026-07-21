const fs = require("fs");
const http = require("http");
const path = require("path");
const next = require("next");

const root = __dirname;
const hostname = "127.0.0.1";
const port = 3001;
const logPath = path.join(root, "stflow-server.log");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, line, "utf8");
}

function isPortAvailable() {
  return new Promise((resolve) => {
    const probe = http
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        probe.close(() => resolve(true));
      })
      .listen(port, hostname);
  });
}

async function main() {
  log("Starting STFlow hidden server");

  const available = await isPortAvailable();
  if (!available) {
    log(`Port ${port} is already in use; leaving existing server running`);
    return;
  }

  const app = next({
    dev: false,
    dir: root,
    hostname,
    port
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((request, response) => handle(request, response));

  server.listen(port, hostname, () => {
    log(`STFlow ready at http://${hostname}:${port}`);
  });

  setInterval(() => {
    log("STFlow hidden server heartbeat");
  }, 1000 * 60 * 30);
}

main().catch((error) => {
  log(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
