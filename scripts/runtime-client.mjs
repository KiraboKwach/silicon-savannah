// Small integration client. Supply an actual runtime callback; none is invented here.
export function runtimeClient({ baseUrl = "http://127.0.0.1:4320", token, projectId, agentId }) {
  async function request(route, body) {
    const response = await fetch(baseUrl + route, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const value = await response.json();
    if (!response.ok) throw Error(value.error);
    return value;
  }
  async function project() {
    return (await request("/api/memory")).projects[0];
  }
  async function command(operation, input, key = crypto.randomUUID()) {
    const p = await project();
    return request("/api/memory/command", {
      projectId,
      operation,
      input,
      revision: p.revision,
      key,
    });
  }
  return {
    project,
    command,
    getAgentContext: (taskId) =>
      request(
        `/api/memory/context?projectId=${encodeURIComponent(projectId)}&agentId=${encodeURIComponent(agentId)}&taskId=${encodeURIComponent(taskId)}`,
      ),
    async run(taskId, execute) {
      if (typeof execute !== "function") throw Error("An actual execution callback is required");
      let p = await project(),
        task = p.tasks.find((t) => t.id === taskId);
      if (task?.status === "not_started") await command("claim", { taskId });
      const started = await command("start", { taskId });
      const result = await execute(started.context);
      return command("result", { ...result, taskId, runId: started.runId });
    },
  };
}
