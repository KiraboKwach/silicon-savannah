import type { ReactNode } from "react";
/** Garment construction follows the existing persona mapping, never runtime roles. */
export function CharacterGarment({
  motif,
  cloth,
  accent,
  trim,
  weave,
}: {
  motif?: string;
  cloth: string;
  accent: string;
  trim: string;
  weave: string;
}) {
  let garment: ReactNode;
  switch (motif) {
    case "shuka":
      garment = (
        <>
          <path
            d="M76 94Q93 99 118 91L143 214L80 229L69 181Z"
            fill={weave}
            stroke={trim}
            strokeWidth="2"
          />
          <path d="M76 95Q91 114 118 97L92 215L81 226Z" fill={trim} opacity=".35" />
          <path
            d="M79 101Q93 117 115 103M82 224L138 210"
            stroke={accent}
            strokeWidth="3"
            fill="none"
          />
          <path d="M94 126L83 201M113 117L125 193" stroke={trim} strokeWidth="2" opacity=".5" />
          <path
            d="M87 97Q103 118 120 96"
            fill="none"
            stroke="#eee0b9"
            strokeWidth="6"
            strokeDasharray="2.5 1.5"
          />
          <path
            d="M88 104Q103 124 118 102"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeDasharray="2 2"
          />
        </>
      );
      break;
    case "runner":
      garment = (
        <>
          <path
            d="M84 93L94 101Q105 108 117 93L129 102L126 168L132 205L106 210L102 192L96 210L74 204L81 164L78 104Z"
            fill={cloth}
            stroke={trim}
            strokeWidth="1.5"
          />
          <path
            d="M86 95Q99 117 119 95M80 107L84 133M126 107L123 132"
            fill="none"
            stroke={accent}
            strokeWidth="3"
          />
          <rect x="88" y="133" width="30" height="25" rx="2" fill="#eee7cd" />
          <path
            d="M96 140L94 149H101M99 139V154M107 141Q116 136 113 145L107 153H116"
            stroke={trim}
            strokeWidth="1.5"
            fill="none"
          />
          <path d="M82 166Q102 172 126 166" stroke={trim} strokeWidth="3" />
        </>
      );
      break;
    case "apron":
      garment = (
        <>
          <path d="M83 94L91 119H116L123 94" stroke={accent} strokeWidth="6" fill="none" />
          <path
            d="M88 117H118L138 223Q107 231 74 220Z"
            fill="#946540"
            stroke={accent}
            strokeWidth="2"
          />
          <path d="M90 120L81 214M118 124L132 216" stroke="#d7ad76" strokeWidth="2" opacity=".5" />
          <path d="M91 161H119V188Q105 195 91 187Z" fill="#6d4c34" />
          <path d="M99 163V184M109 163V181" stroke={accent} strokeWidth="3" />
          <path d="M79 218Q105 225 134 220" stroke="#513e2d" fill="none" />
        </>
      );
      break;
    case "coast":
      garment = (
        <>
          <path
            d="M83 94L97 99L116 93L129 107L130 165L140 240L105 243L102 225L97 242L73 237L80 164L77 107Z"
            fill={cloth}
            stroke={trim}
            strokeWidth="1.3"
          />
          <path
            d="M96 99L98 138H108L109 101M78 233Q104 240 135 235"
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
          />
          <path
            d="M88 153L83 222M118 157L128 225"
            fill="none"
            stroke={trim}
            strokeWidth="2"
            opacity=".65"
          />
        </>
      );
      break;
    case "creative":
      garment = (
        <>
          <path
            d="M83 92L102 106L119 92L143 104L157 144L138 152L127 128L134 199L104 205L101 126L94 204L74 194L80 129L71 151L53 143L64 107Z"
            fill={cloth}
            stroke={trim}
            strokeWidth="1.5"
          />
          <path d="M83 93L99 106L94 122L75 102M119 93L105 106L114 121L134 102" fill={accent} />
          <path d="M103 119V199M77 189L93 194M111 195L130 189" stroke={trim} strokeWidth="2" />
          <path d="M67 113L59 138M144 116L151 137" stroke={accent} strokeWidth="5" />
          <path d="M81 147L92 155M115 154L126 146" stroke={accent} strokeWidth="3" />
        </>
      );
      break;
    case "music":
      garment = (
        <>
          <path
            d="M82 93L102 109L119 92L136 104L128 152L143 229L111 220L103 164L94 225L69 215L80 151L68 105Z"
            fill={trim}
          />
          <path d="M83 93L101 112L94 142L83 121ZM119 93L105 112L114 142L124 120Z" fill={cloth} />
          <path d="M80 162L76 205M125 160L134 218" stroke={accent} strokeWidth="2" />
          <path d="M87 106L96 117M118 106L110 116" stroke={accent} strokeWidth="2" />
        </>
      );
      break;
    case "boda":
    case "ranger":
    case "farmer":
      garment = (
        <>
          <path
            d="M81 94L97 104L104 140L114 103L126 96L138 116L128 134L136 202L108 207L103 158L97 206L73 200L80 135L68 116Z"
            fill={motif === "farmer" ? "#365d50" : cloth}
            stroke={trim}
            strokeWidth="2"
          />
          <path
            d="M88 104L86 190M120 105L125 192M78 177H132"
            stroke={accent}
            strokeWidth={motif === "boda" ? 5 : 2}
          />
          <path d="M80 141H96V162L82 164ZM111 141H128V162L112 164Z" fill={trim} />
          <path d="M81 143H95M112 143H127" stroke={accent} strokeWidth="2" />
          <path d="M76 197Q103 203 132 198" stroke={trim} fill="none" />
        </>
      );
      break;
    default:
      garment = (
        <>
          <path
            d="M82 94L99 105L118 93L133 104L127 143L133 198L105 205L101 120L95 204L75 197L80 144L73 105Z"
            fill={cloth}
            stroke={trim}
            strokeWidth="1.5"
          />
          <path d="M82 94L98 105L94 120L76 102M118 94L104 105L112 119L127 103" fill={accent} />
          <path d="M101 118L104 199M79 192L94 196M113 197L130 191" stroke={trim} strokeWidth="2" />
          <path d="M80 140H94V161H80Z" fill={trim} />
          <path d="M84 145H90M84 151H90" stroke={accent} strokeWidth="2" />
        </>
      );
  }
  return (
    <g data-part="garment" data-variant={motif}>
      {garment}
    </g>
  );
}
