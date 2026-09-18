import { useEffect, useState, type CSSProperties } from "react";

// Ambient scenery is deliberately independent of project progress and agent state.
export default function SavannahLife({ paused }: { paused: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <div className={`savannah-life ${paused || hidden ? "life-paused" : ""}`} aria-hidden="true">
      <div className="night-sky" />
      {Array.from({ length: 32 }, (_, i) => (
        <i
          key={"star" + i}
          className="savannah-star"
          style={{
            left: `${3 + ((i * 29) % 95)}%`,
            top: `${2 + ((i * 17) % 32)}%`,
            animationDelay: `${-i * 0.7}s`,
          }}
        />
      ))}
      <div className="savannah-moon" />
      <div className="savannah-sun" />
      <div className="sun-haze" />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`savannah-cloud cloud-${i}`}>
          <i />
          <i />
          <i />
        </div>
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const flock = Math.floor(i / 5),
          member = i % 5;
        return (
          <div
            className="bird-flight"
            key={i}
            style={
              {
                "--altitude": `${9 + flock * 11 + Math.abs(member - 2) * 2.7}%`,
                "--flight": `${25 + flock * 9}s`,
                "--delay": `${-flock * 10 - member * 0.7 - 8}s`,
                "--bird-size": `${0.65 + flock * 0.19}`,
                "--flap": `${0.65 + member * 0.09}s`,
              } as CSSProperties
            }
          >
            <div className="savannah-bird">
              <i className="bird-wing wing-left" />
              <i className="bird-body" />
              <i className="bird-wing wing-right" />
            </div>
          </div>
        );
      })}
      {[
        { x: 7, y: 48, s: 1.1 },
        { x: 94, y: 52, s: 0.85 },
        { x: 11, y: 82, s: 1.35 },
        { x: 91, y: 88, s: 1.15 },
      ].map((tree, i) => (
        <div
          key={i}
          className="living-acacia"
          style={
            {
              left: `${tree.x}%`,
              top: `${tree.y}%`,
              "--tree-size": tree.s,
              "--sway-delay": `${-i * 1.3}s`,
            } as CSSProperties
          }
        >
          <div className="acacia-trunk" />
          <div className="acacia-crown">
            <i />
            <i />
            <i />
          </div>
          <div className="tree-shadow" />
        </div>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="savannah-grass"
          style={
            {
              left: `${4 + ((i * 17) % 93)}%`,
              top: `${69 + ((i * 11) % 29)}%`,
              "--grass-delay": `${-i * 0.37}s`,
            } as CSSProperties
          }
        >
          <i />
          <i />
          <i />
        </div>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <i
          key={i}
          className="savannah-firefly"
          style={
            {
              left: `${8 + ((i * 23) % 85)}%`,
              top: `${46 + ((i * 13) % 48)}%`,
              "--glow-delay": `${-i * 1.7}s`,
              "--glow-duration": `${5 + (i % 4)}s`,
            } as CSSProperties
          }
        />
      ))}
      <div className="scene-evening-lights">
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${7 + ((i * 17) % 88)}%`,
              top: `${64 + ((i * 11) % 30)}%`,
              animationDelay: `${-i * 0.8}s`,
            }}
          />
        ))}
      </div>
      <div className="savannah-water">
        <i />
        <i />
        <i />
      </div>

      <div className="savannah-vignette" />
    </div>
  );
}
