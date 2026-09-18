"use client";
import { memo } from "react";
import { useReducedMotion } from "framer-motion";
import type { Agent } from "@/lib/simulation";
import { observedPose } from "@/lib/character-behaviour";
import { AgentAvatar } from "./AgentAvatar";
type MicroState = "idle" | "focus" | "scan" | "fidget" | "tired" | "rest";

type BuilderCharacterProps = {
  inspection?: "acknowledge" | "inspect" | "standby";
  jog?: boolean;
  distanceDriven?: boolean;
  sleeping?: boolean;
  preparing?: boolean;
  buildMass?: number;
  agent: Agent;
  appearanceId?: string;
  signal?: string;
  active?: boolean;
  social?: boolean;
  seated?: boolean;
  speaking?: boolean;
  noticing?: boolean;
  attention?: boolean;
  investigating?: boolean;
  jolly?: boolean;
  state?: MicroState;
  fidget?: boolean;
};

export default memo(function BuilderCharacter({
  agent,
  appearanceId,
  signal,
  active = true,
  seated = false,
  preparing = false,
  social = false,
  speaking = false,
  noticing = false,
  attention = false,
  investigating = false,
  jolly = false,
  state = "idle",
  fidget = false,
  inspection,
  jog = false,
  distanceDriven = false,
}: BuilderCharacterProps) {
  const reduced = useReducedMotion();
  const pose = preparing ? "waiting" : observedPose(agent.status, signal);
  const available = ["idle", "completed", "waiting", "blocked"].includes(agent.status);
  const behaviour =
    inspection ||
    (preparing
      ? "acknowledge"
      : available && noticing
        ? "notice"
        : available && speaking
          ? "speaking"
          : available && social
            ? "listening"
            : available && fidget
              ? "equipment"
              : available && state === "scan"
                ? "look"
                : available && investigating
                  ? "inspect"
                  : attention
                    ? "attention"
                    : "quiet");
  return (
    <AgentAvatar
      agentId={appearanceId ?? agent.id}
      label={agent.name}
      decorative
      animate={active && !reduced}
      moving={agent.status === "moving"}
      seated={seated && agent.status !== "moving"}
      offline={agent.status === "offline" || agent.status === "unknown"}
      pose={pose}
      behaviour={behaviour}
      jog={jog || jolly}
      distanceDriven={distanceDriven}
    />
  );
});
