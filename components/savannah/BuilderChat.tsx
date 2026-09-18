import { useEffect, useState } from "react";
export default function BuilderChat({
  text,
  message,
  reaction = false,
  observed = false,
  suggestion = false,
  lean = "center",
}: {
  lean?: "left" | "center" | "right";
  observed?: boolean;
  suggestion?: boolean;
  text?: string;
  message?: string;
  reaction?: boolean;
}) {
  const content = message || text;
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), suggestion ? 9500 : 3600);
    return () => clearTimeout(timer);
  }, [content, suggestion]);
  if (!visible || !content) return null;
  const label = suggestion
    ? "Suggestion · " + "project context"
    : message
      ? "Shared message"
      : observed
        ? "Work update"
        : reaction
          ? "Status reaction"
          : "Ambient chat";
  const isRecorded = Boolean(message);
  return (
    <span
      className={`builder-conversation builder-agent-chat ${suggestion ? "conversation-suggestion" : ""} ${isRecorded ? "conversation-recorded" : ""} chat-${lean}`}
      title={
        label +
        ": " +
        content +
        " — " +
        (suggestion
          ? "Suggested from recorded project context; no task has been started."
          : message || observed
            ? "Observed project event."
            : "Illustrated response, not an actual agent message.")
      }
    >
      <small>{label}</small>
      <span>{content}</span>
    </span>
  );
}
