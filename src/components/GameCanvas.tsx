"use client";

import { useEffect, useRef, useState } from "react";
import { createGame } from "@/game/setup";
import { Engine } from "@/game/Engine";

const MIN_WIDTH = 600;
const MIN_HEIGHT = 450;

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
            background: "linear-gradient(180deg, #0a1e3c 0%, #1a4f82 100%)",
            color: "#33FF33",
            fontFamily: '"Black Ops One", sans-serif',
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px", letterSpacing: "4px" }}>
            BATTLESHIP WAR
          </div>
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "2px solid #33FF33",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "28px", transform: "rotate(90deg)" }}>📱</div>
          </div>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>
            VIEWPORT TOO SMALL
          </div>
          <div style={{ fontSize: "13px", color: "#1A8A1A", maxWidth: "300px" }}>
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
