"use client";

import { useEffect, useRef, useState } from "react";
import { createGame } from "@/game/setup";
import { Engine } from "@/game/Engine";

const MIN_WIDTH = 480;
const MIN_HEIGHT = 360;

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    function checkSize() {
      setTooSmall(window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT);
    }
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;
    // Clear any stale canvases (React strict mode double-mount)
    containerRef.current.innerHTML = "";
    engineRef.current = createGame(containerRef.current);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <>
      {tooSmall && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            color: "#33FF33",
            fontFamily: '"Black Ops One", sans-serif',
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>⚓</div>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>
            VIEWPORT TOO SMALL
          </div>
          <div style={{ fontSize: "13px", color: "#1A8A1A", maxWidth: "280px" }}>
            Please widen your browser window or rotate your device to landscape
            to play Battleship War.
          </div>
          <div style={{ fontSize: "11px", color: "#115511", marginTop: "12px" }}>
            Minimum: {MIN_WIDTH}×{MIN_HEIGHT}px
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      />
    </>
  );
}
