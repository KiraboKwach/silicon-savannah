// Display-only projection. Never mutate stored context or runtime credentials.
export function redactText(value, max = Infinity) {
  if (typeof value !== "string") return "";
  return value
    .replace(
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,
      "[private key redacted]",
    )
    .replace(/\b(?:sk-|art_v2_|gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(
      /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bAIza[A-Za-z0-9_-]{30,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted]",
    )
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_.=-]+/gi, "[authorization redacted]")
    .replace(
      /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\s*["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi,
      "[credential redacted]",
    )
    .replace(/https?:\/\/[^\s<>"']+/gi, "[link]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(
      /\b[A-Z]:[\\/][^\r\n<>"']*|\\\\[^\s<>"']+|\/(?:Users|home)\/[^\r\n<>"']*/gi,
      "[local path]",
    )
    .slice(0, max);
}
export function displayData(value, hidden = new Set(), key = "") {
  if (
    /^(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|authorization|cookie|set-cookie)$/i.test(
      key,
    )
  )
    return "[redacted]";
  if (typeof value === "string") {
    // Links are explicitly configured navigation, not free-text observations.
    if (key === "codexUrl") return /^codex:\/\/threads\/[a-zA-Z0-9%-]+$/.test(value) ? value : "";
    if (key === "url") {
      try {
        const u = new URL(value);
        if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return "";
        // Public links must not carry query credentials or fragment data.
        u.search = "";
        u.hash = "";
        return u.href;
      } catch {
        return "";
      }
    }
    return redactText(value);
  }
  if (Array.isArray(value))
    return value
      .filter((v) => !(typeof v === "string" && hidden.has(v)))
      .map((v) => displayData(v, hidden, key))
      .filter((v) => v !== undefined);
  if (!value || typeof value !== "object") return value;
  if ([value.id, value.projectId, value.sourceProjectId].some((id) => hidden.has(id)))
    return undefined;
  return Object.fromEntries(
    Object.entries(value)
      .map(([k, v]) => [k, displayData(v, hidden, k)])
      .filter(([, v]) => v !== undefined),
  );
}
export function projectCatalog(projects, memory) {
  const saved = new Map(memory.map((p) => [p.id, p]));
  return projects.map((p) => ({
    id: p.id,
    name: redactText(p.name),
    hidden: !!saved.get(p.id)?.hidden,
    revision: saved.get(p.id)?.revision,
  }));
}
export function forwardedRequest(headers) {
  return (
    Object.keys(headers).some(
      (k) => k === "forwarded" || k.startsWith("x-forwarded-") || k === "via",
    ) || headers["sec-fetch-site"] === "cross-site"
  );
}
