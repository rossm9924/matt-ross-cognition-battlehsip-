"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        color: "#33FF33",
        fontFamily: '"Black Ops One", monospace',
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "20px", letterSpacing: "2px" }}>
        BATTLESHIP WAR
      </div>
      <div style={{ fontSize: "14px", color: "#1A8A1A" }}>
        Loading...
      </div>
    </div>
  ),
});

export default function Home() {
  return <GameCanvas />;
}
