const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const origin = "http://127.0.0.1:4320";
let window;
app.setName("Silicon Savannah");
app.setPath("userData", path.join(app.getPath("appData"), "Silicon Savannah Community"));
app.setAppUserModelId("SiliconSavannah.Community");
const primary = app.requestSingleInstanceLock();
if (!primary) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app.whenReady().then(async () => {
    try {
      await ensureServer();
      window = new BrowserWindow({
        title: "Silicon Savannah",
        width: 1440,
        height: 940,
        minWidth: 900,
        minHeight: 650,
        backgroundColor: "#13291f",
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        openExternal(url);
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (new URL(url).origin !== origin) {
          event.preventDefault();
          openExternal(url);
        }
      });
      window.webContents.on("page-title-updated", (event) => {
        event.preventDefault();
        window.setTitle("Silicon Savannah");
      });
      await window.loadURL(origin);
      fs.writeFileSync(
        path.join(__dirname, "launch-status.json"),
        JSON.stringify({
          at: new Date().toISOString(),
          loaded: true,
          url: window.webContents.getURL(),
        }),
      );
    } catch (error) {
      dialog.showErrorBox("Silicon Savannah could not start", error.message);
      app.quit();
    }
  });
  app.on("window-all-closed", () => app.quit());
}
function openExternal(url) {
  try {
    const protocol = new URL(url).protocol;
    if (["https:", "http:", "codex:"].includes(protocol)) shell.openExternal(url);
  } catch {}
}
function health() {
  return new Promise((resolve) => {
    const req = http.get(origin + "/api/health", (res) => {
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => {
        try {
          resolve(
            res.statusCode === 200 &&
              JSON.parse(text).app === "silicon-savannah" &&
              JSON.parse(text).edition === "community",
          );
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}
async function ensureServer() {
  if (await health()) return;
  const node = process.env.SAVANNAH_NODE || "node";
  const log = fs.openSync(path.join(__dirname, "server.log"), "a");
  const child = spawn(node, [path.join(root, "scripts", "live-server.mjs")], {
    cwd: root,
    windowsHide: true,
    detached: true,
    stdio: ["ignore", log, log],
  });
  let failure;
  child.on("error", (error) => {
    failure = error;
  });
  child.unref();
  fs.closeSync(log);
  for (let i = 0; i < 40; i++) {
    if (failure) throw failure;
    if (await health()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("The local dashboard did not become ready. See desktop/server.log for details.");
}
