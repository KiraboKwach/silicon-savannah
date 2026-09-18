import { useId } from "react";
export default function GatheringPlace({
  projects = [],
  onOpen,
}: {
  onOpen?: () => void;
  projects?: { name: string; color: string; working: boolean }[];
}) {
  const id = useId().replaceAll(":", "");
  return (
    <g className="gathering-place">
      <defs>
        <linearGradient id={id + "stone"} x2=".8" y2="1">
          <stop stopColor="#93967a" />
          <stop offset="1" stopColor="#536652" />
        </linearGradient>
        <linearGradient id={id + "wood"} x2=".5" y2="1">
          <stop stopColor="#d1b487" />
          <stop offset="1" stopColor="#8e7250" />
        </linearGradient>
        <radialGradient id={id + "leaf"} cx=".3" cy=".2">
          <stop stopColor="#91a169" />
          <stop offset=".65" stopColor="#526f42" />
          <stop offset="1" stopColor="#354f35" />
        </radialGradient>
      </defs>
      <ellipse cx="490" cy="559" rx="155" ry="51" fill="#071c18" opacity=".3" />
      <path
        d="M344 531Q368 501 432 507Q508 487 615 521L634 555Q587 593 505 594Q399 591 344 560Z"
        fill="#354b3d"
      />
      <path
        d="M344 527Q368 497 432 503Q508 483 615 517L634 551Q587 589 505 590Q399 587 344 556Z"
        fill={"url(#" + id + "stone)"}
        stroke="#a5aa88"
        strokeWidth="1"
      />
      <path
        d="M348 551Q469 611 628 551M361 555Q486 604 621 554"
        fill="none"
        stroke="#c1b998"
        strokeWidth="1"
        opacity=".45"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={`M${366 + i * 32} ${517 - Math.sin(i) * 8}l8 53`}
          stroke="#d9ceb0"
          strokeWidth=".6"
          opacity=".17"
        />
      ))}
      <path
        d="M357 540Q441 561 507 540T618 540"
        fill="none"
        stroke="#b9b394"
        strokeWidth="13"
        opacity=".25"
      />
      {[
        { x: 374, y: 550 },
        { x: 610, y: 545 },
        { x: 566, y: 583 },
      ].map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M-13-2 0-8 13-2v8L0 12-13 6Z" fill="#4d6250" />
          <path d="M-13-2 0-8 13-2 0 4Z" fill="#273e30" />
          <ellipse cy="-5" rx="12" ry="5" fill="#6c8552" />
          <ellipse cx="-4" cy="-8" rx="7" ry="4" fill="#94a46d" />
        </g>
      ))}
      <ellipse cx="398" cy="526" rx="48" ry="13" fill="#183b29" opacity=".22" />
      <path
        d="M363 524Q370 482 356 459m10 31 25-31m-27 37-15-21"
        stroke="#65533b"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M362 520 367 488" stroke="#b09768" strokeWidth="1.5" />
      <g className="hub-canopy">
        {[
          { x: 345, y: 458, rx: 34, ry: 12 },
          { x: 383, y: 455, rx: 37, ry: 13 },
          { x: 362, y: 445, rx: 38, ry: 15 },
          { x: 326, y: 452, rx: 23, ry: 9 },
          { x: 404, y: 458, rx: 22, ry: 9 },
        ].map((v, i) => (
          <g key={i}>
            <ellipse cx={v.x} cy={v.y + 3} rx={v.rx} ry={v.ry} fill="#344d32" />
            <ellipse cx={v.x} cy={v.y} rx={v.rx} ry={v.ry} fill={"url(#" + id + "leaf)"} />
            <path
              d={`M${v.x - v.rx * 0.7} ${v.y - 3}q${v.rx * 0.6} -7 ${v.rx * 1.3} -1`}
              fill="none"
              stroke="#b2b783"
              opacity=".22"
              strokeWidth="1.3"
            />
          </g>
        ))}
      </g>
      {[{ x: 585, y: 552 }].map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <ellipse cy="17" rx="27" ry="8" fill="#132f24" opacity=".3" />
          <path d="M-18 0v19m36-19v19" stroke="#5a503b" strokeWidth="3" />
          <path d="M-28-3 0-14 28-3v4L0 13-28 1Z" fill="#715e43" />
          <path
            d="M-28-3 0-14 28-3 0 9Z"
            fill={"url(#" + id + "wood)"}
            stroke="#d7c397"
            strokeWidth=".6"
          />
          <path d="M-19-3 3-12m-14 16 26-12" stroke="#705b40" opacity=".2" />
          <path d="M-11-3 1-8 13-3 1 3Z" fill="#ded8bc" />
          <path d="m-6-3 7-2 5 2" stroke="#728e7d" fill="none" />
          <path d="M15-3v-5h5v5" fill="#ae7954" />
          <ellipse cx="17.5" cy="-8" rx="2.5" ry="1" fill="#e7d0a2" />
        </g>
      ))}
      <g
        transform="translate(490 542)"
        className="hq-project-table"
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? "Open HQ command table" : undefined}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (onOpen && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        <ellipse cy="21" rx="45" ry="12" fill="#102d24" opacity=".4" />
        <path d="M-29 0v24m58-24v24" stroke="#485f50" strokeWidth="4" />
        <path d="M-44-4 0-23 44-4v7L0 23-44 3Z" fill="#425e52" />
        <path d="M-44-4 0-23 44-4 0 16Z" fill="#234d44" stroke="#bad8b5" strokeWidth="1.2" />
        <path d="M-36-4 0-19 36-4 0 11Z" fill="#366b5d" />
        <path
          d="M-27-4 0 7 27-4M-18-11 18 4M-18 4 18-11"
          stroke="#9dd4b4"
          strokeWidth=".5"
          opacity=".5"
        />
        {projects.map((p, i) => (
          <g key={p.name} transform={`translate(${(i - 2) * 11} ${-4 + Math.abs(i - 2) * 2})`}>
            <title>
              {p.name}: {p.working ? "Working" : "Not working"}
            </title>
            <path d="M-4 0 0-2 4 0 0 2Z" fill={p.color} opacity={p.working ? 1 : 0.5} />
            {p.working && (
              <>
                <path d="M0 0v-10" stroke={p.color} strokeWidth="1" />
                <circle cy="-11" r="2" fill={p.color} />
              </>
            )}
          </g>
        ))}
        <path d="M-44 2 0 21 44 2" fill="none" stroke="#9ed3af" strokeWidth="1.4" opacity=".6" />
      </g>
      <path d="m593 531 22-7v7l-22 7Z" fill={"url(#" + id + "wood)"} stroke="#826d48" />
      <path d="m597 536-1 11m15-16v11" stroke="#776445" strokeWidth="3" />
      {[390, 590].map((x) => (
        <g key={x} transform={`translate(${x} 566)`}>
          <ellipse cy="3" rx="7" ry="3" fill="#e8bf6a" opacity=".1" />
          <path d="M0 2v-9" stroke="#384b3c" strokeWidth="2" />
          <rect x="-2" y="-12" width="4" height="5" rx="1" fill="#dac998" />
        </g>
      ))}
    </g>
  );
}
