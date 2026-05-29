# Battleship War — Naval Combat Simulator

A single-player Battleship game built with Next.js and HTML5 Canvas. Battle against an AI opponent across three difficulty levels, place your fleet manually or randomly, and fight through turn-based naval combat until one side's fleet is destroyed.

## Features

- **Single-player gameplay against AI** — Face off against a computer opponent with hunt/target logic
- **Three difficulty levels (Easy, Normal, Hard)** — Easy uses random shots; Normal and Hard use parity-based targeting with directional follow-up
- **Manual and random ship placement** — Place ships one-by-one with rotation support, or auto-generate a random layout
- **Turn-based combat system** — Fire on the enemy grid, then the AI fires back with visual feedback for hits and misses
- **Ship sinking notifications** — Get notified when you sink an enemy ship (or when the AI sinks yours)
- **Fleet status tracking** — Live panels show remaining hit points for each ship on both sides
- **Game over detection with replay options** — Victory/defeat screen with "Play Again" (same difficulty) and "Change Difficulty" options
- **Score tracking** — Earn points for hits and sinks; view stats at game over
- **Sound effects** — Audio feedback for hits, misses, and sinking ships
- **Classic and Advanced fleet modes** — Standard 5-ship fleet or expanded 7-ship fleet

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) |
| UI Library | [React 19](https://react.dev/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Rendering | HTML5 Canvas API |
| Components | [shadcn/ui](https://ui.shadcn.com/) (Base UI) |

## Installation

```bash
# Clone the repository
git clone https://github.com/rossm9924/matt-ross-cognition-battlehsip-.git
cd matt-ross-cognition-battlehsip-

# Install dependencies
npm install

# Start the development server
npm run dev
```

The game will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

## Game Rules & Mechanics

### Setup Phase

1. Select a difficulty level: **Easy**, **Normal**, or **Hard**.
2. Place your fleet on the 10×10 grid:
   - Click cells to place ships one at a time.
   - Press **R** or click the Rotate button to toggle between horizontal and vertical orientation.
   - Click **Random Placement** to auto-place all ships.
   - Click **Reset** to clear the board and start over.
3. Once all ships are placed, click **Start Battle**.

### Battle Phase

- Click any cell on the **Enemy Waters** grid to fire.
- **Red X** = hit, **gray dot** = miss.
- After your shot, the AI fires back automatically.
- The game continues until one side's entire fleet is sunk.

### Fleet (Classic Mode)

| Ship | Length |
|------|--------|
| Carrier | 5 |
| Battleship | 4 |
| Cruiser | 3 |
| Submarine | 3 |
| Destroyer | 2 |

### AI Difficulty

- **Easy** — Fires randomly with no targeting logic.
- **Normal** — Uses parity-based hunting; switches to directional targeting after a hit.
- **Hard** — Aggressive parity hunting with smarter directional follow-up on consecutive hits.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page (mounts game canvas)
│   └── globals.css         # Global styles
├── components/
│   └── GameCanvas.tsx      # React wrapper for the canvas engine
└── game/
    ├── AI.ts               # AI opponent (hunt/target algorithm)
    ├── AudioManager.ts     # Sound effects manager
    ├── Board.ts            # Board state and ship placement logic
    ├── config.ts           # Grid size, fleet definitions, colors
    ├── Engine.ts           # Canvas game loop and scene management
    ├── setup.ts            # Scene registration and bootstrap
    ├── types.ts            # Shared type definitions
    └── scenes/
        ├── TitleScene.ts       # Title/splash screen
        ├── ModeSelectScene.ts  # Difficulty selection
        ├── PlacementScene.ts   # Ship placement phase
        ├── BattleScene.ts      # Main combat gameplay
        ├── BootScene.ts        # Asset loading
        └── GameOverScene.ts    # Victory/defeat screen
```

## Testing

A detailed end-to-end test plan is available in [`test-plan.md`](./test-plan.md). It covers:

- Difficulty selection screen
- Ship placement (random and manual with rotation)
- Battle phase hit/miss feedback
- Ship sinking notifications
- Cell re-targeting prevention
- Game over and replay flows

## License

This project is for demonstration purposes.
