"use client";

import { memo, useId, useEffect, useRef, type CSSProperties } from "react";
import "./BuilderCharacter.css";
import { resolveTrait } from "./builder-appearance";
import { PersonaHeadwear } from "./PersonaDetails";
import { observeCharacter } from "./character-visibility";
import { CharacterGarment } from "./CharacterGarment";

/** Geometry only: the parent continues to own world coordinates and agent data. */
export const AGENT_GEOMETRY = {
  width: 200,
  height: 360,
  anchorX: 100,
  anchorY: 344,
} as const;

export type AgentAppearance = {
  skin: string;
  outfit: string;
  accent: string;
  trousers: string;
  hair: "crop" | "curls" | "bun" | "braids" | "cap" | "spike" | "pompadour" | "none";
  textile: "plain" | "woven" | "geometric";
  accessory: "tablet" | "notebook" | "radio" | "none";
  shoulderScale: number;
};

export type AgentAvatarProps = {
  /** Keep the existing business ID. Never generate a new agent ID here. */
  agentId: string;
  label: string;
  width?: number;
  appearance?: Partial<AgentAppearance>;
  selected?: boolean;
  /** Map actual application state explicitly; idle does not mean offline. */
  offline?: boolean;
  moving?: boolean;
  animate?: boolean;
  /** Pause decorative animations for offscreen agents. */
  visible?: boolean;
  /** Use true when the existing interactive wrapper already names the agent. */
  decorative?: boolean;
  className?: string;
  behaviour?: string;
  jog?: boolean;
  distanceDriven?: boolean;
  seated?: boolean;
  pose?: string;
};

function hashId(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function hex(value: string | undefined, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function mix(a: string, b: string, amount: number): string {
  const result = [1, 3, 5].map((offset) => {
    const x = parseInt(a.slice(offset, offset + 2), 16);
    const y = parseInt(b.slice(offset, offset + 2), 16);
    return Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${result.join("")}`;
}

/** Existing stable identities only. No random presets or task-dependent appearance. */
export function appearanceForAgent(agentId: string): AgentAppearance {
  const trait = resolveTrait(agentId);
  return {
    skin: trait.skin,
    outfit: trait.torso,
    accent: trait.accent,
    trousers: trait.hip,
    hair:
      trait.hairStyle === "bun"
        ? "bun"
        : trait.hairStyle === "wave"
          ? "curls"
          : trait.hairStyle === "hood"
            ? "braids"
            : trait.hairStyle === "spike"
              ? "spike"
              : trait.hairStyle === "pompadour"
                ? "pompadour"
                : trait.hairStyle === "none"
                  ? "none"
                  : "crop",
    textile: "plain",
    accessory: "tablet",
    shoulderScale: trait.bodyScaleX,
  };
}

export const AgentAvatar = memo(function AgentAvatar({
  agentId,
  label,
  appearance,
  selected = false,
  offline = false,
  moving = false,
  animate = true,
  visible = true,
  decorative = false,
  className = "",
  behaviour = "quiet",
  jog = false,
  distanceDriven = false,
  seated = false,
  pose = "idle",
}: AgentAvatarProps) {
  // This ID is ONLY for SVG definitions/accessibility. Use agentId as list key.
  const instanceId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => (svgRef.current ? observeCharacter(svgRef.current) : undefined), []);
  const uid = `savannah-${instanceId}`;
  const id = (part: string) => `${uid}-${part}`;
  const paint = (part: string) => `url(#${id(part)})`;
  const fallback = appearanceForAgent(agentId);
  const trait = resolveTrait(agentId);
  const config = { ...fallback, ...appearance };
  const skin = hex(config.skin, fallback.skin);
  const outfit = hex(config.outfit, fallback.outfit);
  const accent = hex(config.accent, fallback.accent);
  const trousers = hex(config.trousers, fallback.trousers);
  const bodyScale = Number.isFinite(config.shoulderScale)
    ? Math.max(0.9, Math.min(1.12, config.shoulderScale))
    : 1;
  const darkSkin = mix(skin, "#211E1A", 0.35);
  const lightSkin = mix(skin, "#EECBA0", 0.25);
  const seam = mix(outfit, "#152720", 0.3);

  const delay = -(hashId(agentId) % 7000) / 1000;
  const style = { "--agent-phase": `${delay}s` } as CSSProperties;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      className={`savannah-agent ${className}`.trim()}
      width="100%"
      height="100%"
      viewBox="0 0 200 360"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : id("title")}
      data-agent-id={agentId}
      data-motion={animate && visible && !offline ? (moving ? "walking" : "idle") : "still"}
      data-pose={pose}
      data-behaviour={behaviour}
      data-jog={jog}
      data-distance-gait={distanceDriven}
      data-garment={trait.motif}
      data-seated={seated}
      data-signature={trait.persona}
      data-offline={offline ? "true" : "false"}
      focusable="false"
      style={style}
    >
      {!decorative && <title id={id("title")}>{label}</title>}
      <defs>
        {["far", "near"].map((side) => (
          <g key={side}>
            <clipPath id={id(side + "-thigh-clip")}>
              <rect x="0" y="0" width="200" height="261" />
            </clipPath>
            <clipPath id={id(side + "-calf-clip")}>
              <rect x="0" y="260" width="200" height="100" />
            </clipPath>
          </g>
        ))}
        <linearGradient id={id("skin")} x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0" stopColor={lightSkin} />
          <stop offset="0.52" stopColor={skin} />
          <stop offset="1" stopColor={darkSkin} />
        </linearGradient>
        <linearGradient id={id("cloth")} x1="0" y1="0" x2="0.9" y2="0.85">
          <stop offset="0" stopColor={mix(outfit, "#F6E2B8", 0.22)} />
          <stop offset="0.47" stopColor={outfit} />
          <stop offset="1" stopColor={mix(outfit, "#172B29", 0.3)} />
        </linearGradient>
        <linearGradient id={id("pants")} x1="0" y1="0" x2="1" y2="0.1">
          <stop stopColor={mix(trousers, "#C3BCA1", 0.16)} />
          <stop offset="0.5" stopColor={trousers} />
          <stop offset="1" stopColor={mix(trousers, "#101D1C", 0.34)} />
        </linearGradient>
        <linearGradient id={id("face")} x1="0.12" y1="0.2" x2="0.94" y2="0.65">
          <stop stopColor={lightSkin} />
          <stop offset="0.6" stopColor={skin} />
          <stop offset="1" stopColor={darkSkin} />
        </linearGradient>
        <linearGradient id={id("screen")} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#BCD8D3" />
          <stop offset="1" stopColor="#6B9EA0" />
        </linearGradient>
        <radialGradient id={id("ground")}>
          <stop stopColor="#10211B" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#10211B" stopOpacity="0.13" />
          <stop offset="1" stopColor="#10211B" stopOpacity="0" />
        </radialGradient>
        <pattern id={id("weave")} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 0H12V12H0Z" fill={outfit} />
          <path d="M3 0V12M0 8H12" stroke={accent} strokeWidth="2.1" opacity="0.62" />
          <path d="M8 0V12M0 3H12" stroke="#FFF1C7" strokeWidth="0.7" opacity="0.56" />
        </pattern>
      </defs>

      {/* Static ground: do not animate the parent or its feet for breathing. */}
      <ellipse cx="103" cy="345" rx="54" ry="10" fill={paint("ground")} />
      {selected && (
        <ellipse
          cx="102"
          cy="344"
          rx="48"
          ry="9"
          fill="none"
          stroke={accent}
          strokeWidth="1.7"
          opacity="0.85"
        />
      )}
      <ellipse cx="78" cy="341" rx="20" ry="3.3" fill="#10211B" opacity="0.19" />
      <ellipse cx="123" cy="342" rx="18" ry="3" fill="#10211B" opacity="0.22" />

      <g className="savannah-agent__figure">
        <g transform={`translate(100 0) scale(${bodyScale} 1) translate(-100 0)`}>
          {/* Legs use anatomical silhouettes, separate knee/calf volumes and seams. */}
          <g data-part="far-leg" transform={seated ? "translate(-2 0)" : undefined}>
            <g clipPath={paint("far-thigh-clip")}>
              <path
                d={
                  seated
                    ? "M81 219Q94 216 105 227L82 255Q79 261 82 273L94 323Q87 330 75 324L61 272Q58 260 63 251Z"
                    : "M81 189Q93 184 107 196L103 235Q100 248 97 264L94 323Q87 330 75 324L77 263Q77 249 79 239Z"
                }
                fill={paint(trait.motif === "runner" ? "skin" : "pants")}
              />
              <path
                d="M86 204Q84 234 86 250L82 315"
                fill="none"
                stroke="#D5CEB1"
                strokeWidth="1.1"
                opacity="0.13"
              />
              <path
                d="M80 258Q86 253 96 258M79 263L91 265"
                fill="none"
                stroke="#112323"
                strokeWidth="1.3"
                opacity="0.28"
              />
              <path
                d="M75 321L93 322L95 333Q87 341 64 342Q56 342 59 336L73 329Z"
                fill={trait.shoe}
              />
              <path d="M60 337Q77 340 94 332L94 337Q79 345 62 343Q57 342 60 337" fill="#CECCB7" />
              <path
                d="M73 330L84 333M76 327L87 330"
                stroke="#B6B9AA"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </g>
            <g className="far-calf" style={{ transformOrigin: "86px 260px" }}>
              <g clipPath={paint("far-calf-clip")}>
                <path
                  d={
                    seated
                      ? "M81 219Q94 216 105 227L82 255Q79 261 82 273L94 323Q87 330 75 324L61 272Q58 260 63 251Z"
                      : "M81 189Q93 184 107 196L103 235Q100 248 97 264L94 323Q87 330 75 324L77 263Q77 249 79 239Z"
                  }
                  fill={paint(trait.motif === "runner" ? "skin" : "pants")}
                />
                <path
                  d="M86 204Q84 234 86 250L82 315"
                  fill="none"
                  stroke="#D5CEB1"
                  strokeWidth="1.1"
                  opacity="0.13"
                />
                <path
                  d="M80 258Q86 253 96 258M79 263L91 265"
                  fill="none"
                  stroke="#112323"
                  strokeWidth="1.3"
                  opacity="0.28"
                />
                <path
                  d="M75 321L93 322L95 333Q87 341 64 342Q56 342 59 336L73 329Z"
                  fill={trait.shoe}
                />
                <path d="M60 337Q77 340 94 332L94 337Q79 345 62 343Q57 342 60 337" fill="#CECCB7" />
                <path
                  d="M73 330L84 333M76 327L87 330"
                  stroke="#B6B9AA"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>
          <g data-part="near-leg">
            <g clipPath={paint("near-thigh-clip")}>
              <path
                d={
                  seated
                    ? "M102 223Q118 217 130 225L109 257Q108 263 112 275L127 326Q120 332 108 327L88 280Q80 264 86 254L94 243Z"
                    : "M102 193Q118 187 130 195L128 234Q126 251 123 264L127 326Q120 332 108 327L105 271Q101 254 100 244L94 213Z"
                }
                fill={paint(trait.motif === "runner" ? "skin" : "pants")}
              />
              <path
                d="M119 209L117 251Q112 269 117 316"
                fill="none"
                stroke="#D7CDB4"
                strokeWidth="1.3"
                opacity="0.15"
              />
              <path
                d="M107 262L120 260M108 267L119 271"
                stroke="#112323"
                strokeWidth="1.4"
                opacity="0.3"
              />
              <path
                d="M109 324L126 324L129 332Q144 335 142 341Q140 344 129 344L109 343Q103 341 107 334Z"
                fill={trait.shoe}
              />
              <path d="M106 339Q126 342 142 338L142 342Q135 348 108 344Z" fill="#D9D5C0" />
              <path
                d="M116 332L127 333M116 329L125 330"
                stroke="#CAD0C2"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
            <g className="near-calf" style={{ transformOrigin: "115px 260px" }}>
              <g clipPath={paint("near-calf-clip")}>
                <path
                  d={
                    seated
                      ? "M102 223Q118 217 130 225L109 257Q108 263 112 275L127 326Q120 332 108 327L88 280Q80 264 86 254L94 243Z"
                      : "M102 193Q118 187 130 195L128 234Q126 251 123 264L127 326Q120 332 108 327L105 271Q101 254 100 244L94 213Z"
                  }
                  fill={paint(trait.motif === "runner" ? "skin" : "pants")}
                />
                <path
                  d="M119 209L117 251Q112 269 117 316"
                  fill="none"
                  stroke="#D7CDB4"
                  strokeWidth="1.3"
                  opacity="0.15"
                />
                <path
                  d="M107 262L120 260M108 267L119 271"
                  stroke="#112323"
                  strokeWidth="1.4"
                  opacity="0.3"
                />
                <path
                  d="M109 324L126 324L129 332Q144 335 142 341Q140 344 129 344L109 343Q103 341 107 334Z"
                  fill={trait.shoe}
                />
                <path d="M106 339Q126 342 142 338L142 342Q135 348 108 344Z" fill="#D9D5C0" />
                <path
                  d="M116 332L127 333M116 329L125 330"
                  stroke="#CAD0C2"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>
          <g transform={seated ? "translate(0 30)" : undefined}>
            <path
              d="M79 178Q104 170 129 181L131 202Q113 211 104 205Q91 205 77 199Z"
              fill={paint("pants")}
            />
            <path
              d="M84 189Q101 197 125 190"
              fill="none"
              stroke="#D9C9A6"
              strokeWidth="1.5"
              opacity="0.2"
            />

            {/* Relaxed far arm: deltoid, elbow, tapered forearm and an actual palm. */}
            <g data-part="far-arm">
              <path
                d="M66 121Q79 120 79 135L73 158Q74 170 77 182L78 205L67 208L63 181Q60 165 61 154Z"
                fill={paint("skin")}
              />
              <path
                d="M66 140Q63 158 68 174"
                fill="none"
                stroke={lightSkin}
                strokeWidth="2"
                opacity="0.45"
              />
              <path
                d="M67 204Q73 201 78 205L80 216Q80 223 76 225Q71 229 67 223L64 213Z"
                fill={paint("skin")}
              />
              <path
                d="M75 209L77 217M68 217L70 224M72 217L73 224"
                fill="none"
                stroke={darkSkin}
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path d="M66 200L78 198L78 204L67 207Z" fill="#2C3531" />
              <rect x="68" y="199" width="7" height="5" rx="1.4" fill="#849C92" />
            </g>

            {/* Chest alone breathes. The hips, legs and ground remain fixed. */}
            <g className="savannah-agent__chest" data-part="torso">
              <path d="M89 77L87 96Q103 107 118 96L114 73Z" fill={paint("skin")} />
              <path d="M91 81Q103 90 114 80L116 88Q104 99 89 87Z" fill={darkSkin} opacity="0.45" />
              <path
                d="M87 92Q73 92 65 105L56 128Q63 138 76 138L80 126L80 170L77 193Q103 201 132 192L128 128L138 137Q148 135 154 127L143 105Q136 95 119 92L112 99L98 101Z"
                fill={paint(trait.motif === "runner" ? "skin" : "cloth")}
              />
              <path
                d="M66 105Q74 98 86 97"
                fill="none"
                stroke="#F8EBC8"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.34"
              />
              <path
                d="M79 126Q85 146 81 163L78 190Q93 185 95 168L91 128Z"
                fill={seam}
                opacity="0.18"
              />
              <path
                d="M126 125L129 173L131 191Q120 188 115 175L118 132Z"
                fill={seam}
                opacity="0.31"
              />
              <path
                d="M59 128Q67 133 76 133M138 132L151 125"
                fill="none"
                stroke={seam}
                strokeWidth="1.3"
                opacity="0.52"
              />
              <CharacterGarment
                motif={trait.motif}
                cloth={paint("cloth")}
                accent={accent}
                trim={trait.trim}
                weave={paint("weave")}
              />
            </g>

            <g className="savannah-agent__device-arm">
              <g
                transform={`rotate(${({ a0: 4, a1: 12, a2: -6, a3: 8, a4: -8, a5: 5, a6: -3, a7: 10, a8: -5, a9: 3 } as Record<string, number>)[agentId] ?? 0} 143 135)`}
              >
                {/* Near arm bends through the elbow toward a hand-held work object. */}
                <g data-part="near-arm">
                  <path
                    d="M138 132L150 130Q157 149 153 161L139 184Q134 190 128 184L123 181L137 156Q141 150 136 141Z"
                    fill={paint("skin")}
                  />
                  <path
                    d="M148 139Q153 151 147 162L137 177"
                    fill="none"
                    stroke={lightSkin}
                    strokeWidth="1.6"
                    opacity="0.42"
                  />
                  <path
                    d="M137 157Q143 163 150 161"
                    fill="none"
                    stroke={darkSkin}
                    strokeWidth="1"
                    opacity="0.48"
                  />
                </g>

                {/* Props are behind the gripping hand, not floating beside it. */}
                <g transform="rotate(13 123 189)" data-part="accessory">
                  {config.accessory === "tablet" && (
                    <g>
                      <rect
                        x="103"
                        y="174"
                        width="39"
                        height="30"
                        rx="4"
                        fill="#20302F"
                        opacity="0.22"
                        transform="translate(1 2)"
                      />
                      <rect
                        x="101"
                        y="172"
                        width="40"
                        height="30"
                        rx="3.8"
                        fill="#334947"
                        stroke="#AABCB0"
                        strokeWidth="1.2"
                      />
                      <rect
                        x="105"
                        y="176"
                        width="31"
                        height="21"
                        rx="1.4"
                        fill={paint("screen")}
                      />
                      <path
                        d="M109 191V185M115 191V180M121 191V183"
                        stroke="#345F65"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M126 181H132M126 185H132M126 189H130"
                        stroke="#426E72"
                        strokeWidth="1"
                        opacity="0.65"
                      />
                      <path d="M105 176H122L111 197H105Z" fill="#F1FFEA" opacity="0.17" />
                      <circle cx="138.2" cy="187" r="0.8" fill="#A8BEB3" />
                    </g>
                  )}
                  {config.accessory === "notebook" && (
                    <g>
                      <rect
                        x="106"
                        y="172"
                        width="30"
                        height="34"
                        rx="2.5"
                        fill={accent}
                        stroke="#4B5146"
                        strokeWidth="1"
                      />
                      <path
                        d="M111 173V205M130 172V206"
                        stroke="#394D43"
                        strokeWidth="1.8"
                        opacity="0.5"
                      />
                      <path
                        d="M116 183H125M116 187H125"
                        stroke="#FFF0CF"
                        strokeWidth="1.5"
                        opacity="0.65"
                      />
                    </g>
                  )}
                  {config.accessory === "radio" && (
                    <g>
                      <path
                        d="M115 170V160"
                        stroke="#27352F"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <rect
                        x="111"
                        y="169"
                        width="23"
                        height="33"
                        rx="3.5"
                        fill="#35463B"
                        stroke="#99A58C"
                        strokeWidth="1.2"
                      />
                      <rect x="115" y="174" width="15" height="8" rx="1" fill={paint("screen")} />
                      <path
                        d="M116 187H129M116 191H129M116 195H125"
                        stroke="#142B25"
                        strokeWidth="1.6"
                      />
                    </g>
                  )}
                </g>
                <path
                  d="M130 177Q133 180 133 185L128 194Q126 197 121 195L116 191Q114 188 117 185L122 180Q124 177 126 179L126 184L130 179Z"
                  fill={paint("skin")}
                />
                <path
                  d="M119 187L125 191M122 184L128 189"
                  fill="none"
                  stroke={darkSkin}
                  strokeWidth="0.85"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>
        </g>

        {/* Head: cheek/jaw planes, separated facial features, open attentive eyes. */}
        <g className="savannah-agent__attention">
          <g
            data-part="head"
            transform={`translate(103 ${seated ? 106 : 76}) scale(${trait.headScaleX} ${trait.headScaleY}) translate(-103 -76)`}
          >
            {config.hair === "bun" && (
              <path d="M93 39Q80 36 84 25Q89 16 100 21Q110 24 107 37Z" fill="#272820" />
            )}
            {config.hair === "braids" && (
              <path
                d="M84 45Q75 55 81 88L92 91L92 46Z M118 44Q132 52 130 88L117 91Z"
                fill="#28291F"
              />
            )}
            <ellipse cx="82" cy="57" rx="5.2" ry="7.7" fill={paint("skin")} />
            <ellipse cx="125" cy="56" rx="4.5" ry="7" fill={darkSkin} />
            <path
              d="M85 39Q98 30 115 38Q124 42 124 54L121 66Q116 77 105 80Q93 79 86 70L81 56Q79 45 85 39Z"
              fill={paint("face")}
            />
            <path
              d="M117 44Q125 49 118 67L107 77Q117 75 121 66L124 53Z"
              fill={darkSkin}
              opacity="0.24"
            />
            <path d="M87 62Q91 58 98 62L95 68Q89 67 87 62Z" fill={lightSkin} opacity="0.35" />
            <path
              d="M85 56L82 54L83 61"
              fill="none"
              stroke={darkSkin}
              strokeWidth="1"
              strokeLinecap="round"
            />

            <g className="savannah-agent__eyes">
              <path
                d="M88 54Q92 51 97 54Q93 57 88 54Z M108 53Q113 50 118 53Q114 56 108 53Z"
                fill="#DAD2B4"
              />
              <ellipse cx="93" cy="54" rx="1.65" ry="1.75" fill="#262820" />
              <ellipse cx="113" cy="53" rx="1.75" ry="1.85" fill="#262820" />
              <circle cx="93.5" cy="53.4" r="0.45" fill="#F4ECD3" />
              <circle cx="113.5" cy="52.4" r="0.45" fill="#F4ECD3" />
              <path
                d="M88 53Q93 51 97 54M108 52Q113 50 118 53"
                fill="none"
                stroke="#342E22"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </g>
            <path
              d="M87 48Q92 46 97 48M108 47Q114 45 119 48"
              fill="none"
              stroke="#352D21"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M103 53L101 62Q104 65 108 62"
              fill="none"
              stroke={darkSkin}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M104 54L104 60"
              stroke={lightSkin}
              strokeWidth="1.1"
              opacity="0.7"
              strokeLinecap="round"
            />
            <path
              d="M97 69Q105 73 113 67"
              fill="none"
              stroke={mix(skin, "#422C25", 0.6)}
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <path
              d="M101 74Q106 75 110 72"
              fill="none"
              stroke={lightSkin}
              strokeWidth="0.9"
              opacity="0.45"
            />

            {config.hair === "spike" && (
              <path
                d="M81 51L80 36L87 31L89 25L96 29L102 24L110 30L120 32L125 49L119 45L115 39L87 43Z"
                fill={trait.hairTone}
              />
            )}
            {config.hair === "pompadour" && (
              <path
                d="M82 50Q72 35 86 28Q99 17 115 29Q129 31 125 49L117 42Q98 47 89 39L85 53Z"
                fill={trait.hairTone}
              />
            )}
            {(config.hair === "crop" || config.hair === "bun") && (
              <g>
                <path
                  d="M81 50Q76 34 90 31Q103 25 117 34Q127 37 125 50L120 47L118 40Q102 38 86 44L85 53Z"
                  fill={trait.hairTone || "#2D2B22"}
                />
                <path
                  d="M86 38Q99 30 115 36"
                  fill="none"
                  stroke="#747058"
                  strokeWidth="1.4"
                  opacity="0.38"
                />
              </g>
            )}
            {config.hair === "curls" && (
              <g fill="#2C2B23">
                <path d="M81 48Q74 35 87 31Q100 23 116 31Q130 35 125 49L119 45Q107 43 88 46L84 54Z" />
                <path d="M83 34Q83 26 91 28Q94 22 101 27Q106 22 113 28Q122 24 125 34" />
                <path
                  d="M87 34Q100 28 115 34"
                  fill="none"
                  stroke="#6A6750"
                  strokeWidth="2"
                  opacity="0.36"
                  strokeDasharray="1.5 4"
                  strokeLinecap="round"
                />
              </g>
            )}
            {config.hair === "braids" && (
              <g>
                <path
                  d="M80 49Q76 29 99 29Q123 27 125 45L120 48Q108 38 96 39L86 49Z"
                  fill="#2C2B23"
                />
                <path
                  d="M83 45Q84 31 95 31M90 43Q92 31 101 31M100 38Q103 30 109 33M112 40Q115 34 119 40M82 61L85 85M124 60L123 85"
                  fill="none"
                  stroke="#69634B"
                  strokeWidth="1.2"
                  opacity="0.45"
                />
                <path d="M83 80L86 80M122 80H125" stroke={accent} strokeWidth="2.5" />
              </g>
            )}
            {config.hair === "cap" && (
              <g>
                <path d="M80 45Q83 28 102 28Q121 28 125 43L116 49L84 49Z" fill={accent} />
                <path
                  d="M83 43Q104 39 124 44L134 49Q124 54 109 48L85 49Z"
                  fill={mix(accent, "#272D28", 0.3)}
                />
                <path
                  d="M101 30Q113 33 117 41"
                  fill="none"
                  stroke="#F9E9CA"
                  strokeWidth="1.1"
                  opacity="0.28"
                />
              </g>
            )}
            <g transform="translate(33 15) scale(2)">
              <PersonaHeadwear motif={trait.motif} accent={accent} />
            </g>
            {trait.glasses && (
              <g fill="none" stroke={trait.trim} strokeWidth="1.3">
                <rect x="86" y="50" width="14" height="9" rx="3" />
                <rect x="107" y="49" width="14" height="9" rx="3" />
                <path d="M100 53h7" />
              </g>
            )}
          </g>
        </g>
      </g>
    </svg>
  );
});
