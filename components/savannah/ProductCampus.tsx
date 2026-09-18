function MiniBuilding({ kind }: { kind: number }) {
  return (
    <svg className="campus-building" viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="63" cy="83" rx="48" ry="12" fill="#09281d" opacity=".4" />
      <path d="M10 76Q28 57 58 62T110 80Q85 99 47 91T10 76" fill="#657b4c" />
      <path d="M15 77Q50 62 100 81" fill="none" stroke="#adb382" strokeWidth="2" />
      {kind === 3 ? (
        <g>
          <path d="M31 31 61 17 89 31v44L61 88 31 74Z" fill="#839788" />
          <path d="M61 45 89 31v44L61 88Z" fill="#34584e" />
          <path d="M26 30 61 12 94 30 61 48Z" fill="#d6bb7d" />
          <path d="M37 30 61 19 82 30 61 40Z" fill="#264b46" />
          {[47, 57, 67].map((y) => (
            <path
              key={y}
              d={`M37 ${y - 4} 57 ${y + 5}m9-1 16-8`}
              stroke="#d8d2ad"
              strokeWidth="3"
            />
          ))}
          <path d="M53 76v8l8 4 8-4v-9l-8 4Z" fill="#1b3a34" />
          <path d="M61 12V3m0 0 12 5-12 5" fill="#efd18c" stroke="#efd18c" />
        </g>
      ) : kind === 0 ? (
        <g>
          <path d="M37 24 63 12 85 24v49L62 85 37 73Z" fill="#315e54" />
          <path d="m63 36 22-12v49L63 85Z" fill="#173e38" />
          <path d="M33 24 62 10 89 24 62 38Z" fill="#bdc4a0" />
          <path d="m40 24 22-10 19 10-19 9Z" fill="#284b40" />
          {[43, 54, 65].map((y) => (
            <path
              key={y}
              d={`M41 ${y - 5} 60 ${y + 4}m7-1 14-7`}
              stroke="#a9d5b9"
              strokeWidth="3"
            />
          ))}
          <path d="M48 18v-8m0 0 12-5v9Z" fill="#edbf71" stroke="#edbf71" />
        </g>
      ) : kind === 1 ? (
        <g>
          <path d="M21 57 59 40 100 58v18L61 91 21 75Z" fill="#b09063" />
          <path d="M61 73 100 58v18L61 91Z" fill="#735e3e" />
          <path d="M15 53 58 29 106 53 61 77Z" fill="#bf794f" />
          <path d="m15 53 44-13 47 13-45 24Z" fill="#d9a570" />
          <path d="M58 29 59 40 61 77" fill="none" stroke="#eed19a" strokeWidth="2" />
          <path d="M29 64v12m13-7v13m32-13v13m13-19v12" stroke="#3c5645" strokeWidth="5" />
          <path d="m42 51 15 1 13-8v10l-13 8-15-1Z" fill="#fff0c6" />
        </g>
      ) : (
        <g>
          <path d="M24 52 62 36 96 52v23L60 91 24 75Z" fill="#537477" />
          <path d="M60 68 96 52v23L60 91Z" fill="#26494e" />
          <path d="M19 49 61 29 102 49 60 70Z" fill="#b6c9bb" />
          <path d="M30 49 61 34 90 49 60 63Z" fill="#244e53" />
          <path d="m42 43 15-7 24 11-15 7Z" fill="#83c2c3" />
          <path d="m37 47 22 11m-9-16 23 10m-8-14-15 16" stroke="#d5efdf" opacity=".65" />
          <path d="M32 63v11m10-6v11m30-10v10m12-16v10" stroke="#b1d3c5" strokeWidth="4" />
          <path
            d="M87 40V22m0 1q12 2 11 11m-11-6q6 0 6 6"
            fill="none"
            stroke="#d7bb82"
            strokeWidth="2"
          />
        </g>
      )}
      <path d="M15 76v-12" stroke="#71593d" strokeWidth="3" />
      <ellipse cx="15" cy="62" rx="13" ry="6" fill="#849760" />
      <ellipse cx="12" cy="60" rx="9" ry="4" fill="#afba77" />
    </svg>
  );
}

type Link = { label: string; url: string; description?: string };
export default function ProductCampus({
  name,
  links,
  mini = false,
}: {
  name: string;
  links: Link[];
  mini?: boolean;
}) {
  const safe = links.filter((link) => {
    try {
      return ["https:", "http:"].includes(new URL(link.url).protocol);
    } catch {
      return false;
    }
  });
  return (
    <section className={mini ? "organic-campus" : "product-branch"} aria-label={`${name} products`}>
      {!mini && (
        <header>
          <strong>{name}</strong>
          <span>{safe.length} products</span>
        </header>
      )}
      <div className="community-products">
        {safe.map((link, i) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
            <MiniBuilding kind={i % 4} />
            <strong>{link.label} ↗</strong>
            <small>{link.description}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
