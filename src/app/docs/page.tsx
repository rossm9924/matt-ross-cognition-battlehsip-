import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Battleship War — Documentation",
  description:
    "How to play, bugs found during development, and how they were fixed.",
};

const sections = [
  { id: "how-to-play", label: "How to Play" },
  { id: "bugs", label: "Bugs Found" },
  { id: "fixes", label: "How They Were Fixed" },
] as const;

/* ------------------------------------------------------------------ */
/*  Bug entries – one object per bug keeps the markup clean            */
/* ------------------------------------------------------------------ */
interface Bug {
  id: string;
  title: string;
  what: string;
  found: string;
  foundMethod: "e2e-testing" | "user-report" | "comparison-audit" | "devin-proactive" | "regression-testing";
  fix: string;
  commit: string;
  pr: number;
  prUrl: string;
  sessionUrl: string;
  sessionName: string;
  userPrompt?: string;
}

const methodLabels: Record<Bug["foundMethod"], { label: string; color: string }> = {
  "e2e-testing": { label: "Devin E2E Testing", color: "#4dabf7" },
  "user-report": { label: "User Report", color: "#ff6b6b" },
  "comparison-audit": { label: "Side-by-Side Audit", color: "#da77f2" },
  "devin-proactive": { label: "Devin Proactive Fix", color: "#69db7c" },
  "regression-testing": { label: "Regression Testing", color: "#ffd43b" },
};

const SESSION_1_URL = "https://app.devin.ai/sessions/10c3385d7770434994c7834f5a55bf08";
const SESSION_2_URL = "https://app.devin.ai/sessions/21100b6feccc4b89a19ff6980a14aa54";
const PR1_URL = "https://github.com/rossm9924/matt-ross-cognition-battlehsip-/pull/1";
const PR2_URL = "https://github.com/rossm9924/matt-ross-cognition-battlehsip-/pull/2";
const PR3_URL = "https://github.com/rossm9924/matt-ross-cognition-battlehsip-/pull/3";
const PR10_URL = "https://github.com/rossm9924/matt-ross-cognition-battlehsip-/pull/10";

const bugs: Bug[] = [
  {
    id: "ai-crash",
    title: "AI Crash — Out of Available Cells",
    what: "When the AI exhausted every cell on the board, it tried to pick from an empty list and crashed the game with an unhandled error.",
    found: "Discovered by Devin during automated end-to-end testing. After building the initial game, Devin played through two complete games on localhost:3000. During the second playthrough the AI ran out of untried cells, causing a runtime crash in the getEasyShot function. The crash was caught immediately before the PR was submitted.",
    foundMethod: "e2e-testing",
    fix: "Added null-safety checks to every AI difficulty function (Easy, Medium, Hard). Each function now returns null when no cells remain, and the game loop gracefully skips the AI's turn instead of crashing.",
    commit: "f0eb085",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "duplicate-canvas",
    title: "Duplicate Canvas on Page Load",
    what: "React's Strict Mode mounts components twice in development. The game engine appended a new <canvas> each time, leaving a duplicate canvas element on the page.",
    found: "Reported by the user while testing the game locally on a narrow viewport. The user noticed two side-by-side <canvas> elements in the DOM, each natively 1280×800, inside a flex container. Devin confirmed via browser console that document.querySelectorAll('canvas').length returned 2. Root cause was React Strict Mode double-mounting the component.",
    foundMethod: "user-report",
    userPrompt: "The game uses two side-by-side <canvas> elements (each natively 1280×800) inside a flex-direction: row container with overflow: hidden.",
    fix: "The Engine's destroy() method now removes the canvas from the DOM, and the GameCanvas component clears the container's innerHTML before mounting to prevent stale elements.",
    commit: "66b2ea0",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "small-viewport",
    title: "No Small-Viewport Handling",
    what: "On narrow screens (phones, small browser windows), the canvas was clipped or unusable with no feedback to the user.",
    found: "Reported by the user after testing the game on a narrow browser window. The user described the layout breaking at ~266–308 px viewport width, with canvases extending off-screen in both directions and no responsive fallback.",
    foundMethod: "user-report",
    userPrompt: "No responsive layout / breaks on narrow viewports. At my viewport width (~266–308 px), one canvas sat at x = -111 (mostly off-screen left) and the other extended past the right edge.",
    fix: "Added a viewport-size guard that shows a friendly \"VIEWPORT TOO SMALL\" overlay when the window is smaller than 480 × 360 px, asking the user to resize or rotate their device.",
    commit: "66b2ea0",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-loading-state",
    title: "Blank Screen While Loading",
    what: "The game JavaScript loaded via dynamic import, leaving a completely black screen with no indication that anything was happening.",
    found: "Identified proactively by Devin while fixing the user-reported responsive layout issues. Devin noticed the dynamic import caused a fully black screen for several seconds before the game engine initialized, with no visual feedback. Added a loading splash as part of the same UX improvement pass.",
    foundMethod: "devin-proactive",
    fix: "Added a DOM-based loading splash (\"BATTLESHIP WAR — Loading...\") that displays instantly while the game JS downloads and initializes.",
    commit: "66b2ea0",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "text-overlap",
    title: "Text Overlap on the Placement Screen",
    what: "The \"Select a ship\" message and the \"YOUR FLEET\" panel label were drawn at overlapping vertical positions, making both unreadable.",
    found: "Reported directly by the user after playing through the game in a browser. The user spotted that the wording at the top of the placement screen, including the shuffle area, was overlapping with other text elements.",
    foundMethod: "user-report",
    userPrompt: "Bugs i've spotted while playing on browser: the wording at the top including shuffle is overlapped",
    fix: "Adjusted the y-coordinates for the Mode label, status message, and fleet header so each has proper spacing and no collisions.",
    commit: "307e8ce",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "slow-animations",
    title: "Shell Animation Too Fast to See",
    what: "The shell-arc flight animation lasted only 0.6 seconds — so fast it was nearly invisible, especially on larger monitors.",
    found: "Reported directly by the user while playing through the game. The user described the gameplay as \"overly fast\" when showing the rockets hitting the enemy board.",
    foundMethod: "user-report",
    userPrompt: "the gameplay is overly fast when showing the rockets hit the enemy board",
    fix: "Increased the shell animation duration from 0.6 s to 1.5 s, and extended the post-impact particle delay from 600 ms to 1 000 ms so players can enjoy the visual effect.",
    commit: "307e8ce",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-rotate-button",
    title: "No Clickable Rotate Button",
    what: "Ship orientation could only be toggled via a keyboard shortcut (R key). There was no on-screen button, which left mouse-only users stuck.",
    found: "Reported directly by the user during browser playtesting. The user noticed the horizontal/vertical switch button was not present on the placement screen.",
    foundMethod: "user-report",
    userPrompt: "the horizontal / vertical switch button is not present",
    fix: "Added a visible, clickable rotate button to the fleet panel on the placement screen.",
    commit: "307e8ce",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "invisible-hits",
    title: "Hit Markers Were Too Small and Dim",
    what: "Hit markers on the enemy grid were small red squares with partial transparency (alpha 0.8), making them hard to distinguish from the grid background.",
    found: "Reported directly by the user after playing through a battle. The user observed that when an enemy ship was hit, the board did not show red markers clearly.",
    foundMethod: "user-report",
    userPrompt: "when an enemy is hit their board doesn't show red",
    fix: "Made hit markers larger (reduced padding from 3 px to 2 px), set alpha to 1.0 for full opacity, and added an orange border outline for extra contrast.",
    commit: "307e8ce",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "play-overlap",
    title: "PLAY Button Overlapping Rotate Button",
    what: "The PLAY button appeared directly on top of the rotate button, so clicking \"Play\" also triggered a rotation — or vice versa.",
    found: "Discovered by Devin during regression testing after adding the rotate button fix. The new clickable rotate button was placed at the same y-position as the existing PLAY button, so both elements occupied the same space and clicks triggered both actions.",
    foundMethod: "regression-testing",
    fix: "Repositioned the PLAY button below the rotate button with a 50 px gap, and centered the mode/status text over the grid area instead of the full canvas.",
    commit: "0eab99f",
    pr: 1,
    prUrl: PR1_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "miss-markers",
    title: "Miss Markers Were Invisible",
    what: "Miss markers were rendered as dark-green squares on a dark-green grid — completely invisible to the player.",
    found: "Found by Devin during a side-by-side comparison audit, requested by the user, comparing the Vercel deployment against the reference game (battleshiponline.org). While comparing battle screens, it became clear that miss markers — rendered as rgba(34,102,34,0.5) dark-green squares — were invisible against the dark-green radar grid. The reference game used high-contrast white markers.",
    foundMethod: "comparison-audit",
    userPrompt: "Are you able to play the vercel deployment and the original online game (battleshiponline.org) in a browser and identify the issues with the vercel deployments UI/UX as well as user workflow bugs that need to be fixed.",
    fix: "Changed miss markers to white dots with sufficient contrast against the radar-green background.",
    commit: "5fc476b",
    pr: 3,
    prUrl: PR3_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "fleet-disappears",
    title: "Fleet Panel Disappeared After Placement",
    what: "Once all ships were placed or shuffled, the fleet status list vanished from the sidebar, giving the player no reference of their fleet.",
    found: "Identified by Devin during the same side-by-side comparison audit against battleshiponline.org. After clicking SHUFFLE, the fleet panel on the right side of the placement screen went blank because the code iterated over the \"remaining\" ships array (empty after all placed) instead of the full fleet list.",
    foundMethod: "comparison-audit",
    fix: "Made the fleet panel persistent with checkmark indicators showing placed vs. unplaced status after ships are positioned or shuffled.",
    commit: "5fc476b",
    pr: 3,
    prUrl: PR3_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-top-bar",
    title: "No Persistent Navigation Bar",
    what: "During gameplay, there was no way to access Help, Quit, or toggle Sound without restarting the game. These controls only appeared on certain screens.",
    found: "Identified by Devin during the side-by-side comparison audit. The reference game had persistent navigation controls on every screen. In Battleship War, Help (?) and Sound icons only appeared on the title screen, and there was no Quit button during battle — forcing players to reload the page to exit.",
    foundMethod: "comparison-audit",
    fix: "Added a persistent top bar (?, QUIT, FAST toggle, and Sound icon) that renders on every screen except the title screen.",
    commit: "5fc476b",
    pr: 3,
    prUrl: PR3_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-fast-mode",
    title: "No Way to Skip Cinematic Animations",
    what: "Every shot required watching the full shell-arc animation. Experienced players found this tedious after many turns.",
    found: "Raised by Devin during the side-by-side comparison audit. With the shell animation at 1.5 seconds, each full turn cycle took ~5–7 seconds. Over a 60+ shot game this added up to several minutes of idle watching. The reference game offered fast-paced inline shot resolution.",
    foundMethod: "comparison-audit",
    fix: "Added a FAST mode toggle in the top bar. When enabled, shots resolve instantly with inline feedback instead of cinematic animations.",
    commit: "5fc476b",
    pr: 3,
    prUrl: PR3_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "ship-vanishes-on-select",
    title: "Ship Vanished When Selected for Rotation",
    what: "Clicking a placed ship to rotate it immediately removed it from the board, making the player lose visual reference of where it was.",
    found: "Reported by the user during live browser testing. After shuffling ships and selecting one to rotate, the user observed that the ship disappeared from the board instead of staying in place while being repositioned.",
    foundMethod: "user-report",
    userPrompt: "when you select a ship and then scroll to the rotate button, the ship should stay in the same spot shouldn't it?",
    fix: "Ships now stay visible in-place when selected. The rotate button rotates the ship at its current position, and it only moves when the player clicks a new grid cell. If rotation is blocked by other ships, the ship stays in its original orientation with a message.",
    commit: "162904e",
    pr: 3,
    prUrl: PR3_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },

  /* ---- PR #2 — 19 UI/UX audit fixes (comparison audit) ---- */
  {
    id: "nonstandard-grid-ships",
    title: "Non-Standard Grid Size and Ship Sizes",
    what: "The game used a 14×14 grid instead of the canonical 10×10 Battleship board, and ship sizes did not match the standard Hasbro rules (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2).",
    found: "Identified during the comprehensive side-by-side audit comparing the Vercel deployment against the reference game (battleshiponline.org). The non-standard 14×14 grid and mismatched ship sizes were flagged as core gameplay deviations.",
    foundMethod: "comparison-audit",
    userPrompt: "Are you able to play the vercel deployment and the original online game (battleshiponline.org) in a browser and identify the issues with the vercel deployments UI/UX as well as user workflow bugs that need to be fixed.",
    fix: "Changed the grid to standard 10×10 (A–J, 1–10) and updated ship sizes to match official Hasbro rules: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "single-grid-battle",
    title: "Single-Grid Battle Layout",
    what: "During battle, only the enemy grid was visible. Players could not see their own board or where the AI was targeting their ships.",
    found: "Identified during the side-by-side audit against battleshiponline.org, which shows both grids simultaneously. The single-grid layout meant players had no awareness of the AI's attacks on their fleet.",
    foundMethod: "comparison-audit",
    userPrompt: "Are you able to play the vercel deployment and the original online game (battleshiponline.org) in a browser and identify the issues with the vercel deployments UI/UX as well as user workflow bugs that need to be fixed.",
    fix: "Implemented a dual-grid battle layout: player's board on the left (\"YOUR WATERS\") showing own ships and AI hit/miss markers, enemy grid on the right (\"ENEMY WATERS\") for firing.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-battle-log",
    title: "No Battle Log",
    what: "There was no history of shots fired during battle. Players had to rely on memory to recall which cells had been targeted and what the outcomes were.",
    found: "Identified during the side-by-side audit against battleshiponline.org. The reference game provided clear shot-by-shot feedback. Battleship War had no log, making it hard to follow the game flow.",
    foundMethod: "comparison-audit",
    fix: "Added a scrollable battle log panel showing the last 8 events with color coding — red for hits, white for misses, orange for sunk ships.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-sunk-banners",
    title: "No Ship Sunk Notification",
    what: "When a ship was sunk, there was no visual banner or clear feedback — the player might not even realize they had destroyed an enemy vessel.",
    found: "Identified during the side-by-side audit. The reference game clearly announces sunk ships. Battleship War only changed cell colors with no additional feedback.",
    foundMethod: "comparison-audit",
    fix: "Added animated floating banners (e.g., \"CARRIER DESTROYED\") that fade out, plus a sunk ship outline revealed on the enemy grid to show the full ship position.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "inconsistent-theme",
    title: "Inconsistent Visual Theme",
    what: "The game mixed two visual styles: a green CRT/radar aesthetic on most screens and a blue ocean cinematic during battle animations. The switch was jarring and broke immersion.",
    found: "Identified during the side-by-side audit. The blue ocean cinematic felt disconnected from the military command room theme used on every other screen.",
    foundMethod: "comparison-audit",
    fix: "Unified all screens to the CRT/radar green-on-black terminal aesthetic, removing the inconsistent blue ocean cinematic.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-gameover-stats",
    title: "No Game-Over Statistics",
    what: "The game-over screen only showed Victory or Defeat with no breakdown of how the player performed.",
    found: "Identified during the side-by-side audit. The reference game displayed post-game analytics. Battleship War gave no performance feedback at all.",
    foundMethod: "comparison-audit",
    fix: "Added a stats panel to the game-over screen showing shots fired, total hits, accuracy percentage, ships lost, elapsed time, and difficulty level.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-mode-descriptions",
    title: "Mode Selection Cards Lacked Descriptions",
    what: "The Classic and Advanced mode selection tiles showed only the mode name with no information about what each mode included (ship count, rules, etc.).",
    found: "Identified during the side-by-side audit. Players had no way to understand the difference between modes before selecting one.",
    foundMethod: "comparison-audit",
    fix: "Added descriptive mode cards showing ship names, counts, and gameplay descriptions for each mode.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-difficulty-selector",
    title: "No AI Difficulty Selector",
    what: "AI difficulty was hardcoded and could not be changed by the player. There was no way to choose between Easy, Normal, and Hard opponents.",
    found: "Identified during the side-by-side audit. Three AI difficulty algorithms existed in the code (random, hunt-and-target, parity) but there was no UI to let the player choose.",
    foundMethod: "comparison-audit",
    fix: "Added an AI difficulty selector on the mode selection screen: Easy (random shots), Normal (hunt-then-target), and Hard (parity strategy).",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-keyboard-nav",
    title: "No Keyboard Navigation",
    what: "The game was mouse-only. There was no way to navigate the grid, fire shots, or interact with placement using the keyboard.",
    found: "Identified during the side-by-side audit as a missing accessibility feature. Keyboard-only users could not play the game.",
    foundMethod: "comparison-audit",
    fix: "Added full keyboard navigation: arrow keys to move the cursor on the enemy grid, Enter/Space to fire, R to rotate ships during placement, and Escape to cancel selection.",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },
  {
    id: "no-hover-ship-name",
    title: "No Ship Name on Hover During Placement",
    what: "While placing ships on the grid, hovering over cells showed a preview outline but no label indicating which ship was being placed.",
    found: "Identified during the side-by-side audit. Players could lose track of which ship they were placing, especially in Advanced mode with 7 ships.",
    foundMethod: "comparison-audit",
    fix: "Added a ship name label that follows the cursor during placement, showing the name of the ship being positioned (e.g., \"CARRIER\").",
    commit: "7c7fd07",
    pr: 2,
    prUrl: PR2_URL,
    sessionUrl: SESSION_1_URL,
    sessionName: "Battleship AI shadcn game",
  },

  /* ---- PR #10 — UI/UX fixes (user reports + Devin audit) ---- */
  {
    id: "ship-names-hidden",
    title: "Ship Names Hidden on Mode Select Tiles",
    what: "On the mode selection screen, the green hover overlay covered the ship name labels, making them unreadable when the player moused over a tile.",
    found: "Reported by the user while testing the production deployment. The green overlay on the CLASSIC and ADVANCED tiles completely hid the ship names underneath.",
    foundMethod: "user-report",
    userPrompt: "Can you ensure that the ship names show when selecting the game mode and pressing on the box- the green overlay hides the names. turn it another color",
    fix: "Changed the overlay to dark green bars with bright green text labels, ensuring ship names remain readable in both hover and non-hover states.",
    commit: "d9e8610",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "strategy-panel-overlap",
    title: "Strategy Panel Headings Overlapping Fleet Panel",
    what: "On the ship placement screen (Strategy Panel), the \"Mode: CLASSIC\" and difficulty text overlapped with the \"YOUR FLEET\" heading on the right side, making both unreadable.",
    found: "Reported by the user during live testing of the production deployment. The user noted that the \"your fleet\" section overlapped with the mode and difficulty sections.",
    foundMethod: "user-report",
    userPrompt: "In the strategy panel; \"your fleet\" section overlaps with the mode and difficulty sections. bring down",
    fix: "Moved headings to center over the grid area only (using gridCenterX) instead of the full canvas width, preventing overlap with the fleet panel.",
    commit: "85ae9ed",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "strategy-panel-spacing",
    title: "Strategy Panel Excess Black Space",
    what: "The Strategy Panel had too much empty black space at the bottom of the screen, with grid cells sized too small (38px) for the available canvas area.",
    found: "Reported by the user while testing the production deployment. The user flagged a \"lots of blackspace at the bottom of the strategy panel.\"",
    foundMethod: "user-report",
    userPrompt: "Lots of blackspace at the bottom of the strategy panel",
    fix: "Increased grid cell size from 38px to 44px, centering the grid+fleet block within the canvas to fill more of the screen.",
    commit: "85ae9ed",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "battle-grids-not-centered",
    title: "Battle Station Grids Not Center-Aligned",
    what: "The dual grids on the battle screen were positioned toward the top-right of the canvas instead of being symmetrically centered, with small cells (28px) and excess black space at the bottom.",
    found: "Reported by the user during live testing. The user noted that the grids were \"not in the middle\" and there was too much empty space at the bottom.",
    foundMethod: "user-report",
    userPrompt: "In the battlestation page- can you centre align boards so they are in the middle not the top right side",
    fix: "Centered grids using symmetric margins (based on grid widths only, excluding fleet panels), increased cell size from 28px to 36px, and reduced the gap between grids from 100px to 60px.",
    commit: "85ae9ed",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "no-battle-quit-sound",
    title: "No QUIT or Sound Buttons on Battle Screen",
    what: "The battle screen's top bar only showed \"?\" and \"BATTLE STATION\" text — the QUIT and sound toggle buttons that appeared on every other screen were missing.",
    found: "Found by Devin during a comprehensive UI/UX audit of the production app, then confirmed by the user in a follow-up test.",
    foundMethod: "user-report",
    userPrompt: "In the battle station page, can we enable the quit button on top right as well as sound button",
    fix: "Added QUIT and sound toggle buttons to the battle screen's top bar, matching the layout used on all other game screens.",
    commit: "d9e8610",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "status-text-overlap",
    title: "\"Your Turn\" Text Overlapping Grid Labels",
    what: "The status text (\"Your Turn\", \"Enemy's Turn\") overlapped with the \"YOUR WATERS\" / \"ENEMY WATERS\" grid labels during battle, making both unreadable.",
    found: "Reported by the user during live testing of the battle screen. The user noticed the status subheading colliding with the grid section headers.",
    foundMethod: "user-report",
    userPrompt: "Can we ensure that the \"Your Turn\" subheading does not overlay onto the your waters / enemy waters table sections",
    fix: "Separated the status text from grid labels with proper vertical spacing, placing the status bar in its own area above the grids.",
    commit: "d9e8610",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "mode-panel-not-centered",
    title: "Game Mode Panel Not Vertically Centered",
    what: "The mode selection panel (CLASSIC/ADVANCED tiles and Easy/Normal/Hard difficulty buttons) was pushed toward the top of the screen with a large black void at the bottom.",
    found: "Reported by the user while testing the production deployment. The user noted that the difficulty buttons and mode boxes were not center-aligned on the panel.",
    foundMethod: "user-report",
    userPrompt: "Easy / Normal / Hard on the AI dificulty panel of the game mode panel are not centre aligned",
    fix: "Shifted the mode panel content down ~50px for balanced top/bottom spacing, and centered both the mode tiles and difficulty buttons horizontally.",
    commit: "21a5ab0",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
  {
    id: "help-button-broken",
    title: "Help Button (\"?\") Not Working on Multiple Screens",
    what: "The \"?\" help button in the top bar did nothing when clicked on the Game Mode panel, Battle Station screen, and Strategy Panel — the rules overlay only worked on the Title screen.",
    found: "Initially found by Devin during a production UI audit, then independently reported by the user across three separate screens: the battle station, game mode panel, and strategy panel.",
    foundMethod: "user-report",
    userPrompt: "the question mark on the battle station screen does not function on the game mode panel and battle station screen",
    fix: "Added click handlers for the \"?\" button on all four screens (Title, Game Mode, Strategy Panel, Battle Station), each opening the same rules overlay with a dark semi-transparent background that dismisses on click.",
    commit: "0371e6e",
    pr: 10,
    prUrl: PR10_URL,
    sessionUrl: SESSION_2_URL,
    sessionName: "LLM AI + UI/UX fixes",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DocsPage() {
  return (
    <div style={styles.wrapper}>
      {/* ---- Sidebar ---- */}
      <nav style={styles.sidebar}>
        <Link href="/" style={styles.logo}>
          ⚓ Battleship War
        </Link>
        <span style={styles.sidebarLabel}>Documentation</span>
        <ul style={styles.navList}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} style={styles.navLink}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <Link href="/" style={styles.playLink}>
          ▶ Play the Game
        </Link>
      </nav>

      {/* ---- Main content ---- */}
      <main style={styles.main}>
        {/* ---------- Section 1: How to Play ---------- */}
        <section id="how-to-play" style={styles.section}>
          <h1 style={styles.h1}>How to Play</h1>
          <p style={styles.intro}>
            Battleship War is a single-player naval combat game where you face
            off against an AI opponent. The goal is simple:{" "}
            <strong>sink all of the enemy&apos;s ships before they sink yours.</strong>
          </p>

          <h2 style={styles.h2}>1. Title Screen</h2>
          <p style={styles.p}>
            When you open the game you&apos;ll see the main title screen. Press{" "}
            <strong>PLAY</strong> to begin. You can also toggle sound on or off
            from here.
          </p>

          <h2 style={styles.h2}>2. Choose Your Mode</h2>
          <p style={styles.p}>
            Pick <strong>Classic</strong> (5 ships) or{" "}
            <strong>Advanced</strong> (7 ships). Classic uses the traditional
            fleet — Submarine, Frigate, Cruiser, Aircraft Carrier, and
            Battleship. Advanced adds a Destroyer and a Missile Boat for a
            bigger challenge.
          </p>

          <h2 style={styles.h2}>3. Place Your Fleet</h2>
          <p style={styles.p}>
            Select a ship from the fleet panel on the right, then click a cell
            on the grid to place it. Use the <strong>Rotate</strong> button (or
            press <kbd>R</kbd>) to switch between horizontal and vertical. You
            can also hit <strong>Shuffle</strong> to let the computer place your
            ships randomly, or <strong>Trash</strong> to clear the board and
            start over.
          </p>

          <h2 style={styles.h2}>4. Battle!</h2>
          <p style={styles.p}>
            Once all ships are placed, press <strong>PLAY</strong>. The battle
            screen shows the enemy&apos;s grid — click any cell to fire. A{" "}
            <strong style={{ color: "#ff2a2a" }}>red marker</strong> means you
            hit a ship; a{" "}
            <strong style={{ color: "#ccc" }}>white dot</strong> means you
            missed. After your shot, the AI fires back at your grid.
          </p>
          <p style={styles.p}>
            When every cell of a ship is hit, it sinks — and a banner announces
            which ship went down. Keep firing until one side has lost their
            entire fleet.
          </p>

          <h2 style={styles.h2}>5. Scoring</h2>
          <p style={styles.p}>
            You earn <strong>15 points</strong> for each hit and a{" "}
            <strong>50-point bonus</strong> for sinking a ship. Your high score
            is saved locally so you can try to beat it next time.
          </p>

          <h2 style={styles.h2}>6. Tips</h2>
          <ul style={styles.list}>
            <li>
              Use the <strong>FAST</strong> toggle in the top bar to skip shell
              animations and speed through turns.
            </li>
            <li>
              Press <strong>?</strong> at any time to see a quick rules overlay.
            </li>
            <li>
              The AI uses a hunt-and-target strategy: once it gets a hit, it
              will probe adjacent cells. Spread your ships out to make its job
              harder.
            </li>
          </ul>
        </section>

        <hr style={styles.divider} />

        {/* ---------- Section 2: Bugs Found ---------- */}
        <section id="bugs" style={styles.section}>
          <h1 style={styles.h1}>Bugs Found During Development</h1>
          <p style={styles.intro}>
            Over the course of building and testing Battleship War,{" "}
            <strong>{bugs.length} bugs</strong> were identified — ranging from
            game-crashing errors to subtle visual glitches. Bugs were
            discovered through several methods:{" "}
            <strong style={{ color: "#ff6b6b" }}>user reports</strong> (direct
            feedback from the developer while playtesting),{" "}
            <strong style={{ color: "#4dabf7" }}>automated E2E testing</strong>{" "}
            (Devin playing through full games),{" "}
            <strong style={{ color: "#da77f2" }}>side-by-side comparison audits</strong>{" "}
            (comparing the Vercel deployment against{" "}
            <a href="https://www.battleshiponline.org/" style={styles.extLink} target="_blank" rel="noopener noreferrer">
              battleshiponline.org
            </a>),{" "}
            <strong style={{ color: "#ffd43b" }}>regression testing</strong>{" "}
            (re-testing after fixes), and{" "}
            <strong style={{ color: "#69db7c" }}>proactive Devin fixes</strong>{" "}
            (issues Devin found and fixed independently).
            Each entry below links to the PR and Devin session where the
            bug was found. User-reported bugs include the original prompt.
          </p>

          <div style={styles.bugGrid}>
            {bugs.map((b, i) => {
              const method = methodLabels[b.foundMethod];
              return (
                <div key={b.id} style={styles.bugCard}>
                  <span style={styles.bugNumber}>#{i + 1}</span>
                  <h3 style={styles.bugTitle}>{b.title}</h3>
                  <p style={styles.bugDesc}>{b.what}</p>
                  <div style={styles.bugMeta}>
                    <span
                      style={{
                        ...styles.methodBadge,
                        backgroundColor: method.color + "1a",
                        color: method.color,
                        border: `1px solid ${method.color}44`,
                      }}
                    >
                      {method.label}
                    </span>
                    <a href={b.prUrl} style={styles.linkBadge} target="_blank" rel="noopener noreferrer">
                      PR #{b.pr}
                    </a>
                    <a href={b.sessionUrl} style={styles.linkBadge} target="_blank" rel="noopener noreferrer">
                      Session
                    </a>
                    <span style={styles.commitBadge}>{b.commit}</span>
                  </div>
                  <p style={styles.bugFound}>{b.found}</p>
                  {b.userPrompt && (
                    <div style={styles.promptBox}>
                      <span style={styles.promptLabel}>User prompt:</span>
                      <q style={styles.promptText}>{b.userPrompt}</q>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <hr style={styles.divider} />

        {/* ---------- Section 3: How They Were Fixed ---------- */}
        <section id="fixes" style={styles.section}>
          <h1 style={styles.h1}>How They Were Fixed</h1>
          <p style={styles.intro}>
            Every bug listed above was resolved through targeted code changes.
            Here&apos;s a detailed breakdown of each fix.
          </p>

          {bugs.map((b, i) => {
            const method = methodLabels[b.foundMethod];
            return (
              <div key={b.id} style={styles.fixEntry}>
                <div style={styles.fixHeader}>
                  <span style={styles.fixNumber}>#{i + 1}</span>
                  <h3 style={styles.fixTitle}>{b.title}</h3>
                  <span
                    style={{
                      ...styles.methodBadgeSmall,
                      backgroundColor: method.color + "1a",
                      color: method.color,
                      border: `1px solid ${method.color}44`,
                    }}
                  >
                    {method.label}
                  </span>
                </div>
                {b.userPrompt && (
                  <div style={{ ...styles.promptBox, marginBottom: 16 }}>
                    <span style={styles.promptLabel}>User prompt:</span>
                    <q style={styles.promptText}>{b.userPrompt}</q>
                  </div>
                )}
                <div style={styles.fixThreeCol}>
                  <div style={styles.fixCol}>
                    <span style={styles.colLabel}>How It Was Found</span>
                    <p style={styles.fixText}>{b.found}</p>
                  </div>
                  <div style={styles.fixCol}>
                    <span style={styles.colLabel}>Problem</span>
                    <p style={styles.fixText}>{b.what}</p>
                  </div>
                  <div style={styles.fixCol}>
                    <span style={styles.colLabel}>Solution</span>
                    <p style={styles.fixText}>{b.fix}</p>
                  </div>
                </div>
                <div style={styles.commitRef}>
                  <a href={b.prUrl} style={styles.refLink} target="_blank" rel="noopener noreferrer">
                    PR #{b.pr}
                  </a>
                  &nbsp;·&nbsp;Commit&nbsp;
                  <code style={styles.code}>{b.commit}</code>
                  &nbsp;·&nbsp;
                  <a href={b.sessionUrl} style={styles.refLink} target="_blank" rel="noopener noreferrer">
                    {b.sessionName}
                  </a>
                </div>
              </div>
            );
          })}
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <p>
            Battleship War Documentation •{" "}
            <Link href="/" style={styles.footerLink}>
              Play the Game
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline styles (avoids needing extra CSS modules for a docs page)  */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#e0e0e0",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },

  /* Sidebar */
  sidebar: {
    position: "sticky",
    top: 0,
    width: 240,
    minWidth: 240,
    height: "100vh",
    padding: "28px 20px",
    backgroundColor: "#111",
    borderRight: "1px solid #222",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  },
  logo: {
    color: "#33ff33",
    fontFamily: '"Black Ops One", sans-serif',
    fontSize: 18,
    textDecoration: "none",
    marginBottom: 4,
  },
  sidebarLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#666",
    marginBottom: 8,
  },
  navList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  navLink: {
    color: "#aaa",
    textDecoration: "none",
    fontSize: 14,
    padding: "6px 10px",
    borderRadius: 6,
    display: "block",
    transition: "background 0.15s",
  },
  playLink: {
    marginTop: "auto",
    color: "#33ff33",
    textDecoration: "none",
    fontSize: 14,
    fontFamily: '"Black Ops One", sans-serif',
    padding: "10px 14px",
    border: "1px solid #33ff33",
    borderRadius: 8,
    textAlign: "center",
  },

  /* Main */
  main: {
    flex: 1,
    maxWidth: 820,
    margin: "0 auto",
    padding: "48px 40px 80px",
    overflowY: "auto",
  },

  /* Typography */
  section: { marginBottom: 32 },
  h1: {
    fontSize: 32,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 12,
    fontFamily: '"Black Ops One", sans-serif',
    letterSpacing: 1,
  },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    color: "#33ff33",
    marginTop: 28,
    marginBottom: 8,
  },
  intro: { fontSize: 16, lineHeight: 1.7, color: "#bbb", marginBottom: 20 },
  extLink: {
    color: "#da77f2",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
  p: { fontSize: 15, lineHeight: 1.7, color: "#ccc", marginBottom: 12 },
  list: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#ccc",
    paddingLeft: 24,
    marginBottom: 12,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #222",
    margin: "48px 0",
  },

  /* Bug cards */
  bugGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340, 1fr))",
    gap: 16,
  },
  bugCard: {
    backgroundColor: "#161616",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "20px 22px",
    position: "relative",
  },
  bugNumber: {
    position: "absolute",
    top: 12,
    right: 16,
    fontSize: 12,
    color: "#555",
    fontFamily: "monospace",
  },
  bugTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#ff6b6b",
    marginBottom: 8,
    marginTop: 0,
  },
  bugDesc: { fontSize: 14, lineHeight: 1.6, color: "#aaa", margin: 0, marginBottom: 10 },
  bugMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap" as const,
    marginBottom: 10,
  },
  methodBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 12,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  methodBadgeSmall: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 10,
    fontFamily: "monospace",
    letterSpacing: 0.5,
    marginLeft: "auto",
  },
  bugFound: { fontSize: 13, lineHeight: 1.6, color: "#888", margin: 0, marginBottom: 8, fontStyle: "italic" },
  linkBadge: {
    display: "inline-block",
    fontSize: 11,
    color: "#4dabf7",
    backgroundColor: "#1a1a2a",
    padding: "3px 8px",
    borderRadius: 4,
    fontFamily: "monospace",
    textDecoration: "none",
    border: "1px solid #4dabf733",
  },
  promptBox: {
    backgroundColor: "#1a1212",
    border: "1px solid #ff6b6b33",
    borderRadius: 6,
    padding: "10px 14px",
    marginTop: 6,
  },
  promptLabel: {
    display: "block",
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    color: "#ff6b6b",
    marginBottom: 4,
    fontWeight: 600,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#ccc",
    fontStyle: "italic",
    margin: 0,
    quotes: '"\u201C" "\u201D"',
  },
  commitBadge: {
    display: "inline-block",
    marginTop: 12,
    fontSize: 11,
    color: "#666",
    backgroundColor: "#1a1a1a",
    padding: "3px 8px",
    borderRadius: 4,
    fontFamily: "monospace",
  },

  /* Fix entries */
  fixEntry: {
    backgroundColor: "#111",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "24px",
    marginBottom: 20,
  },
  fixHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  fixNumber: {
    fontSize: 13,
    color: "#33ff33",
    fontFamily: "monospace",
    fontWeight: 700,
    backgroundColor: "#0d2a0d",
    padding: "2px 8px",
    borderRadius: 4,
  },
  fixTitle: { fontSize: 17, fontWeight: 600, color: "#fff", margin: 0 },
  fixColumns: { display: "flex", gap: 24 },
  fixThreeCol: { display: "flex", gap: 20, flexWrap: "wrap" as const },
  fixCol: { flex: 1 },
  colLabel: {
    display: "block",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#666",
    marginBottom: 6,
  },
  fixText: { fontSize: 14, lineHeight: 1.6, color: "#bbb", margin: 0 },
  commitRef: {
    marginTop: 16,
    fontSize: 12,
    color: "#555",
  },
  refLink: {
    color: "#4dabf7",
    textDecoration: "none",
  },
  code: {
    backgroundColor: "#1a1a1a",
    padding: "2px 6px",
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 12,
    color: "#33ff33",
  },

  /* Footer */
  footer: {
    marginTop: 64,
    paddingTop: 24,
    borderTop: "1px solid #222",
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  footerLink: {
    color: "#33ff33",
    textDecoration: "none",
  },
};
