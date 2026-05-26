---
name: testing-battleship
description: Test the Battleship game end-to-end. Use when verifying gameplay, AI behavior, or UI changes.
---

## Overview
E2E testing of the Battleship game built with Next.js, shadcn/ui, and Tailwind CSS v4.

## Setup
1. `cd` to the repo root and run `npm install && npm run dev -- --port 3000`
2. Verify server is up: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` should return `200`

## Testing Flow
1. **Difficulty Selection**: Navigate to `localhost:3000`. Verify 3 cards (Easy/Medium/Hard) with Select buttons.
2. **Ship Placement**: Select a difficulty → verify 10×10 grid (A–J, 1–10), Rotate/Random Placement/Reset controls. Use "Random Placement" for speed.
3. **Battle Phase**: Click "Start Battle" → verify two grids ("Enemy Waters" and "Your Fleet"), status message, fleet status panels.
4. **Gameplay Automation**: Clicking 100 cells manually is slow. Use a Playwright CDP script (`http://localhost:29229`) to fire systematically. Key: wait for "Your turn" text before each click, and wait 1500ms after each click for the AI's 800ms delay.
5. **Game Over**: Verify "Victory!" or "Defeat!" dialog appears with "Play Again" and "Change Difficulty" buttons.
6. **Play Again**: Should return to Ship Placement with clean grid, same difficulty.
7. **Change Difficulty**: Should return to difficulty selection screen.

## Playwright CDP Automation Pattern
```js
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://localhost:29229');
const page = browser.contexts()[0].pages()[0];
// Wait for turn, click cell, wait 1500ms for AI response
```

## Known Issues
- AI might crash if it exhausts all 100 cells (fixed in commit f0eb085). If you see "Cannot destructure property 'row' of 'coordinate' as it is undefined", this bug may have regressed — check `src/lib/ai.ts` return types.
- Browser console automation scripts can fail due to React state timing. Playwright CDP scripts are more reliable because they can properly await conditions.
- The game over dialog uses shadcn AlertDialog — check for `role="alertdialog"` or `role="dialog"` in DOM when detecting game over state.

## Key Files
- `src/lib/ai.ts` — AI logic (Easy/Medium/Hard)
- `src/hooks/use-game.ts` — Game state management
- `src/components/battle-phase.tsx` — Battle UI
- `src/components/game-over.tsx` — Victory/Defeat dialog

## Devin Secrets Needed
None — this is a fully client-side game with no API keys or external services.
