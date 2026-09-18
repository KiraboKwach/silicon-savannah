/** Small, scene-scale details; all animation remains in the existing character rig. */
export function PersonaGarment({
  motif,
  accent,
  trim,
  weave,
}: {
  motif?: string;
  accent: string;
  trim: string;
  weave: string;
}) {
  switch (motif) {
    case "boda":
      return (
        <>
          <path d="M28 34v35m14-35v35M23 55h25M23 64h25" stroke="#eef3dc" strokeWidth="3" />
          <path d="M35 34v38" stroke="#404d39" strokeWidth="1.5" />
          <rect x="37" y="42" width="7" height="6" rx="1" fill="#374b42" />
        </>
      );
    case "shuka":
      return (
        <>
          <path d="M23 32 42 35 49 80 25 86Z" fill={weave} />
          <path d="M24 33 43 39 29 81" fill="none" stroke={accent} strokeWidth="2" />
          <path
            d="M25 36q9 9 17 0"
            fill="none"
            stroke="#e5d8bc"
            strokeWidth="3"
            strokeDasharray="2 1"
          />
        </>
      );
    case "runner":
      return (
        <>
          <path d="M25 62h20v13H25Z" fill={trim} />
          <path d="M35 67v8" stroke={accent} />
          <rect x="29" y="45" width="13" height="11" rx="1" fill="#f3edda" />
          <text x="35.5" y="53" fontSize="7" textAnchor="middle" fill="#28382e">
            42
          </text>
          <path d="M28 34v8m14-8v8" stroke={accent} strokeWidth="2" />
        </>
      );
    case "apron":
      return (
        <>
          <path
            d="M28 34 31 44H41L44 34M28 44H43L47 81H24Z"
            fill="#95653f"
            stroke={accent}
            strokeWidth="1.5"
          />
          <rect x="29" y="57" width="12" height="10" rx="1" fill="#69472f" />
          <path d="M32 58v7m5-8v7" stroke={accent} strokeWidth="2" />
        </>
      );
    case "creative":
      return (
        <>
          <path d="M22 38 46 57 25 67 47 69" fill="none" stroke={accent} strokeWidth="5" />
          <path d="m43 38-9 14 14-3-10 15" fill="none" stroke="#4bccb0" strokeWidth="3" />
          <path d="M35 34v40" stroke={trim} strokeWidth="1" />
        </>
      );
    case "farmer":
      return (
        <>
          <path
            d="M28 34v16h14V34M27 49h17v25H26Z"
            fill="#365d50"
            stroke={accent}
            strokeWidth="2"
          />
          <path
            d="M35 62v-9m0 5q-9-1-6-6 6 0 6 6m0-2q2-8 7-5-1 5-7 5"
            stroke="#b9d578"
            fill="none"
            strokeWidth="1.5"
          />
        </>
      );
    case "ranger":
      return (
        <>
          <path d="M35 33v40M24 62h24" stroke={trim} strokeWidth="2" />
          <path d="M25 44h7v9h-7Zm14 0h7v9h-7Z" fill={trim} />
          <path d="M28 33 43 66" stroke="#544630" strokeWidth="3" />
          <path d="m38 38 3-2 3 2-1 5h-4Z" fill={accent} />
        </>
      );
    case "merchant":
      return (
        <>
          <path d="M28 33 35 44 42 33M35 44v39" fill="none" stroke={accent} strokeWidth="2" />
          <path d="M23 70q12-9 24 0" fill="none" stroke={accent} strokeWidth="3" />
          <rect x="39" y="53" width="7" height="9" fill={trim} />
        </>
      );
    case "music":
      return (
        <>
          <path d="M27 33 31 54 35 43 40 55 43 33" fill="#302b41" stroke={accent} />
          <path d="M26 57v17m18-17v21" stroke={accent} strokeWidth="2" />
          <path
            d="M38 56v11q-5 4-5 0t5-2m0-8 5-2v9q-5 4-5 0"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
          />
        </>
      );
    case "coast":
      return (
        <>
          <path d="M33 33v22h6V33M23 90h26" fill="none" stroke={accent} strokeWidth="2" />
          <path d="M26 38v43m18-43v43" stroke={trim} opacity=".6" />
          <path d="m26 89 3-3 3 3 3-3 3 3 3-3 3 3" fill="none" stroke={accent} />
        </>
      );
    default:
      return (
        <>
          <path d="M35 33v42M27 33l8 13 8-13" stroke={accent} fill="none" strokeWidth="2" />
          <rect x="24" y="48" width="7" height="10" rx="1" fill={trim} />
          <path d="M26 51h3m-3 3h3" stroke={accent} />
        </>
      );
  }
}
export function PersonaHeadwear({ motif, accent }: { motif?: string; accent: string }) {
  if (motif === "boda")
    return (
      <g className="boda-helmet">
        <path
          d="M23 20V12Q23-2 35-2Q48-2 48 12v12l-5 5v-13H27v11l-4-4Z"
          fill="#e45435"
          stroke="#642d29"
          strokeWidth="1"
        />
        <path d="M26 9Q35 2 45 9v5H26Z" fill="#c7e4dd" stroke="#344a50" />
        <path d="M25 24q10 10 20 0" stroke="#344a50" fill="none" strokeWidth="2" />
      </g>
    );
  if (motif === "farmer" || motif === "ranger")
    return (
      <g>
        <path
          d="M25 12 28 3H42L46 12Z"
          fill={motif === "farmer" ? "#c6ac69" : "#7c8551"}
          stroke="#504b30"
        />
        <path
          d="M19 13q17 5 33 0"
          fill="none"
          stroke={motif === "farmer" ? "#ddc78b" : "#89925c"}
          strokeWidth="4"
        />
        <path d="M27 9h17" stroke="#554b34" strokeWidth="2" />
      </g>
    );
  if (motif === "apron")
    return (
      <g transform="rotate(-13 35 8)">
        <rect x="25" y="0" width="20" height="11" rx="3" fill="#304653" stroke={accent} />
        <rect x="29" y="3" width="12" height="5" rx="1" fill="#8fb5ad" />
      </g>
    );
  if (motif === "coast")
    return (
      <g>
        <path d="M26 11V4q9-5 18 0v7Z" fill="#f1e5c6" stroke="#c7b686" />
        <path d="m28 7 3-3 3 3 3-3 3 3 2-2" fill="none" stroke={accent} />
      </g>
    );
  if (motif === "runner")
    return <path d="M26 12q9-3 18 0" fill="none" stroke={accent} strokeWidth="3" />;
  if (motif === "creative")
    return <path d="M24 10Q26-2 40 2l5 8h-9l-10 4h-5Z" fill={accent} stroke="#4c3057" />;
  return null;
}
