# Battleship

A traditional Battleship game played against a computer AI opponent, built with Next.js, React, and HTML5 Canvas.

## About

Command your fleet and sink the enemy ships before the AI sinks yours. Place your ships on a 14×14 grid, then take turns firing shots at the opponent's board. The computer AI uses a hunt-and-target strategy — switching from a parity-based search pattern to directional targeting once it scores a hit — so every game is a real challenge.

## Features

- **14×14 Grid** — A larger board than the standard 10×10, giving more room for strategy and maneuvering.
- **Turn-Based Gameplay** — Classic alternating turns: fire a shot, then the AI fires back.
- **Computer AI Opponent** — The AI hunts with a parity heuristic and switches to targeted fire along ship axes after a hit, pruning its queue when a ship is sunk.
- **Two Game Modes**
  - *Classic* — 5 ships (Submarine, Frigate, Cruiser, Aircraft Carrier, Battleship).
  - *Advanced* — 7 ships, adding a Destroyer and Missile Boat for a denser board.
- **Dual View Modes** — Toggle between a top-down radar view and an isometric 3D perspective during battle.
- **Ship Placement** — Drag and rotate ships onto your board before the battle begins.
- **Scoring System** — Earn points for hits and bonus points for sinking entire ships.
- **Sound Effects** — Audio feedback for hits, misses, and ship sinkings.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 & React 19
- TypeScript
- HTML5 Canvas (custom game engine)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.
