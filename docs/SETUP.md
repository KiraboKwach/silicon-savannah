# Setup

## Sample workspace

Use Node.js 24+. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4320.

The first screen uses sample data only. It does not read your Codex history. The local server creates a separate `data/coordination.sqlite` for the optional task simulation. That folder is ignored by Git. Stop the server with Ctrl+C.

## Connect your projects (optional)

1. Copy `projects.example.json` to `projects.local.json`.
2. Replace the placeholder with a real local Codex task ID, display name and optional public links. Multiple links appear as a product campus. Keep the file local; it is ignored by Git.
3. Enable the local integration before starting the server:

   **PowerShell**
   ```powershell
   $env:SAVANNAH_LIVE='1'
   npm start
   ```
   **macOS/Linux shell**
   ```sh
   SAVANNAH_LIVE=1 npm start
   ```
4. Choose **Local workspace** from the sample view.

Only configured tasks are read by default. Set `SAVANNAH_DISCOVER=1` as well to include other eligible local tasks automatically. `CODEX_HOME` can override the default `~/.codex` directory. Discovery and read-only reviews currently depend on Codex's local database schema; an unavailable source is shown as disconnected.

The local workspace can show task titles, summaries and file references. Switch back to **Explore demo** before screen sharing. Local storage and configuration never belong in a public commit.

Explicit review buttons can invoke your installed Codex CLI and consume your account's usage. They are disabled unless the local integration is enabled. The demo does not invoke them.

## Desktop window

After the standard install and build:

```sh
npm install --no-save --package-lock=false electron
npm run desktop
```

Node.js must be on PATH (or set `SAVANNAH_NODE` to its full path). The launcher opens the same community app at port 4320. It starts a background server if needed; closing the window leaves that server running. It does not reuse the separate personal edition on port 4318.

Electron is optional and is not bundled into this repository. This is a source launcher, not a signed desktop installer.

## Development

`npm run dev` runs Vite at http://127.0.0.1:5174. For backend features, run `npm start` in a second terminal. `npm run build` typechecks and builds production assets.

`npm test` runs the existing Node test suite serially so renderer fixtures do not compete for development-server resources. Tests create temporary fixture databases; they do not require your project data.

The development-only character lineup is at http://127.0.0.1:5174/?characters.

## Local service boundary

Keep the backend on loopback. It is designed for one local user, not public hosting or multi-user authentication. A public static build may show the sample scene, but local execution and memory require the local service.

`SAVANNAH_DATA_DIR` selects a different coordination data directory. Back up SQLite using its backup tooling while running, or stop the server before copying the database and associated files.

## Privacy and publishing

The live server is a single-user localhost service, not an authenticated public service. Do not expose it through a tunnel, reverse proxy, port forwarding, or shared host. Host/Origin checks and rejection of forwarding headers are precautions, not authentication. Publish only the static `dist` frontend for a public demo; never attach the live API or local data directory.

Display responses mask common credentials, emails and local paths. This is best-effort redaction, not a guarantee that confidential prose is anonymous. Configured public links omit query strings and fragments; use a clean public destination URL. Runtime-scoped context retains the original data needed for work.

Hidden projects retain their saved data. The management catalog includes only identity, visibility and revision so they can be restored; hiding is not an access-control boundary. Before sharing screenshots or recordings, use presentation fixtures and review the exported media for private names, text and browser chrome. Previously published media and Git history are not rewritten by these protections.
