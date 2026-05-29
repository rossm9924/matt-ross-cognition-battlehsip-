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
  foundMethod: "e2e-testing" | "browser-playtesting" | "comparison-audit" | "code-review" | "regression-testing";
  fix: string;
  commit: string;
  pr: number;
  session: string;
}

const methodLabels: Record<Bug["foundMethod"], { label: string; color: string }> = {
  "e2e-testing": { label: "Devin E2E Testing", color: "#4dabf7" },
  "browser-playtesting": { label: "Devin Browser Playtest", color: "#ffa94d" },
  "comparison-audit": { label: "Side-by-Side Audit", color: "#da77f2" },
  "code-review": { label: "Devin Code Review", color: "#69db7c" },
  "regression-testing": { label: "Regression Testing", color: "#ffd43b" },
};

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
    session: "Battleship AI shadcn game",
  },
  {
    id: "duplicate-canvas",
    title: "Duplicate Canvas on Page Load",
    what: "React's Strict Mode mounts components twice in development. The game engine appended a new <canvas> each time, leaving a duplicate canvas element on the page.",
    found: "Found by Devin during browser testing after the Canvas rewrite. Devin ran document.querySelectorAll('canvas').length in the browser console and observed 2 canvases instead of 1. This was caused by React Strict Mode double-mounting the component in development.",
    foundMethod: "browser-playtesting",
    fix: "The Engine's destroy() method now removes the canvas from the DOM, and the GameCanvas component clears the container's innerHTML before mounting to prevent stale elements.",
    commit: "66b2ea0",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "small-viewport",
    title: "No Small-Viewport Handling",
    what: "On narrow screens (phones, small browser windows), the canvas was clipped or unusable with no feedback to the user.",
    found: "Identified by Devin during responsive testing. After the Canvas redesign, Devin tested the game at multiple viewport widths (600px, 700px) and confirmed that narrow windows caused the canvas to clip without any user-facing message.",
    foundMethod: "browser-playtesting",
    fix: "Added a viewport-size guard that shows a friendly \"VIEWPORT TOO SMALL\" overlay when the window is smaller than 480 × 360 px, asking the user to resize or rotate their device.",
    commit: "66b2ea0",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "no-loading-state",
    title: "Blank Screen While Loading",
    what: "The game JavaScript loaded via dynamic import, leaving a completely black screen with no indication that anything was happening.",
    found: "Noticed by Devin during browser testing of the dynamic import loading behavior. On initial page load the screen was entirely black for several seconds before the game engine initialized, with no visual feedback that anything was happening.",
    foundMethod: "browser-playtesting",
    fix: "Added a DOM-based loading splash (\"BATTLESHIP WAR — Loading...\") that displays instantly while the game JS downloads and initializes.",
    commit: "66b2ea0",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "text-overlap",
    title: "Text Overlap on the Placement Screen",
    what: "The \"Select a ship\" message and the \"YOUR FLEET\" panel label were drawn at overlapping vertical positions, making both unreadable.",
    found: "Caught by Devin during browser playtesting of the ship placement flow. While testing the placement screen visually, Devin observed that the \"Mode: CLASSIC\" label and the \"Select a ship to place\" message were drawn on top of each other, making both lines of text unreadable.",
    foundMethod: "browser-playtesting",
    fix: "Adjusted the y-coordinates for the Mode label, status message, and fleet header so each has proper spacing and no collisions.",
    commit: "307e8ce",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "slow-animations",
    title: "Shell Animation Too Fast to See",
    what: "The shell-arc flight animation lasted only 0.6 seconds — so fast it was nearly invisible, especially on larger monitors.",
    found: "Reported by Devin during browser playtesting. While playing through a battle, Devin noted the shell arc animation completed in roughly 0.6 seconds — so fast it was barely perceptible, especially on the isometric view. The explosion and splash particle effects also disappeared almost instantly.",
    foundMethod: "browser-playtesting",
    fix: "Increased the shell animation duration from 0.6 s to 1.5 s, and extended the post-impact particle delay from 600 ms to 1 000 ms so players can enjoy the visual effect.",
    commit: "307e8ce",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "no-rotate-button",
    title: "No Clickable Rotate Button",
    what: "Ship orientation could only be toggled via a keyboard shortcut (R key). There was no on-screen button, which left mouse-only users stuck.",
    found: "Found by Devin during browser playtesting of the placement screen. The only way to rotate ships was pressing the R key — there was just a text label showing \"Orientation: HORIZONTAL\" with no clickable element, leaving mouse-only users unable to rotate.",
    foundMethod: "browser-playtesting",
    fix: "Added a visible, clickable rotate button to the fleet panel on the placement screen.",
    commit: "307e8ce",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "invisible-hits",
    title: "Hit Markers Were Too Small and Dim",
    what: "Hit markers on the enemy grid were small red squares with partial transparency (alpha 0.8), making them hard to distinguish from the grid background.",
    found: "Identified by Devin during browser playtesting. While verifying hit/miss feedback on the radar grid, Devin observed that hit markers were small semi-transparent red squares that blended into the dark grid background, especially at lower viewport sizes.",
    foundMethod: "browser-playtesting",
    fix: "Made hit markers larger (reduced padding from 3 px to 2 px), set alpha to 1.0 for full opacity, and added an orange border outline for extra contrast.",
    commit: "307e8ce",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "play-overlap",
    title: "PLAY Button Overlapping Rotate Button",
    what: "The PLAY button appeared directly on top of the rotate button, so clicking \"Play\" also triggered a rotation — or vice versa.",
    found: "Discovered by Devin during regression testing after the rotate button was added. The new clickable rotate button was placed at the same y-position as the existing PLAY button, so both elements occupied the same space and clicks triggered both actions.",
    foundMethod: "regression-testing",
    fix: "Repositioned the PLAY button below the rotate button with a 50 px gap, and centered the mode/status text over the grid area instead of the full canvas.",
    commit: "0eab99f",
    pr: 1,
    session: "Battleship AI shadcn game",
  },
  {
    id: "miss-markers",
    title: "Miss Markers Were Invisible",
    what: "Miss markers were rendered as dark-green squares on a dark-green grid — completely invisible to the player.",
    found: "Found during a side-by-side comparison audit of the Vercel deployment against a reference game (battleshiponline.org). While comparing the battle screens, it became clear that miss markers — rendered as rgba(34,102,34,0.5) dark-green squares — were completely invisible against the dark-green radar grid. The reference game used high-contrast white markers.",
    foundMethod: "comparison-audit",
    fix: "Changed miss markers to white dots with sufficient contrast against the radar-green background.",
    commit: "5fc476b",
    pr: 3,
    session: "Battleship AI shadcn game",
  },
  {
    id: "fleet-disappears",
    title: "Fleet Panel Disappeared After Placement",
    what: "Once all ships were placed or shuffled, the fleet status list vanished from the sidebar, giving the player no reference of their fleet.",
    found: "Identified during the side-by-side comparison audit against battleshiponline.org. After clicking SHUFFLE, the fleet panel on the right side of the placement screen went blank because the code iterated over the \"remaining\" ships array (which was empty after all ships were placed) instead of the full fleet list.",
    foundMethod: "comparison-audit",
    fix: "Made the fleet panel persistent with checkmark indicators showing placed vs. unplaced status after ships are positioned or shuffled.",
    commit: "5fc476b",
    pr: 3,
    session: "Battleship AI shadcn game",
  },
  {
    id: "no-top-bar",
    title: "No Persistent Navigation Bar",
    what: "During gameplay, there was no way to access Help, Quit, or toggle Sound without restarting the game. These controls only appeared on certain screens.",
    found: "Identified during the side-by-side comparison audit. The reference game had persistent navigation controls accessible from every screen. In Battleship War, the Help (?) and Sound icons only appeared on the title screen, and there was no Quit button at all during battle — forcing players to reload the page to exit.",
    foundMethod: "comparison-audit",
    fix: "Added a persistent top bar (?, QUIT, FAST toggle, and Sound icon) that renders on every screen except the title screen.",
    commit: "5fc476b",
    pr: 3,
    session: "Battleship AI shadcn game",
  },
  {
    id: "no-fast-mode",
    title: "No Way to Skip Cinematic Animations",
    what: "Every shot required watching the full shell-arc animation. Experienced players found this tedious after many turns.",
    found: "Raised during the side-by-side comparison audit. With the shell animation slowed to 1.5 seconds, each full turn cycle took roughly 5–7 seconds. Over a 60+ shot game this added up to several minutes of waiting. The reference game offered fast-paced inline shot resolution.",
    foundMethod: "comparison-audit",
    fix: "Added a FAST mode toggle in the top bar. When enabled, shots resolve instantly with inline feedback instead of cinematic animations.",
    commit: "5fc476b",
    pr: 3,
    session: "Battleship AI shadcn game",
  },
  {
    id: "ship-vanishes-on-select",
    title: "Ship Vanished When Selected for Rotation",
    what: "Clicking a placed ship to rotate it immediately removed it from the board, making the player lose visual reference of where it was.",
    found: "Caught during continued audit testing of the placement flow. When a player clicked on an already-placed ship to reposition or rotate it, the code immediately removed it from the board — making the ship disappear visually. The player lost track of where the ship was and had to guess where to re-place it.",
    foundMethod: "comparison-audit",
    fix: "Ships now stay visible in-place when selected. The rotate button rotates the ship at its current position, and it only moves when the player clicks a new grid cell. If rotation is blocked by other ships, the ship stays in its original orientation with a message.",
    commit: "162904e",
    pr: 3,
    session: "Battleship AI shadcn game",
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
            <strong>automated E2E testing</strong> (Devin playing through
            full games),{" "}
            <strong>browser playtesting</strong> (manual visual inspection),{" "}
            <strong>side-by-side comparison audits</strong> (comparing the
            Vercel deployment against reference games like battleshiponline.org),
            and <strong>regression testing</strong> (re-testing after fixes).
            Each entry below shows how the bug was found, what it was, and
            which PR fixed it.
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
                    <span style={styles.commitBadge}>PR #{b.pr}</span>
                    <span style={styles.commitBadge}>{b.commit}</span>
                  </div>
                  <p style={styles.bugFound}>{b.found}</p>
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
                  PR&nbsp;<code style={styles.code}>#{b.pr}</code>
                  &nbsp;·&nbsp;Commit&nbsp;
                  <code style={styles.code}>{b.commit}</code>
                  &nbsp;·&nbsp;Session:&nbsp;
                  <span style={{ color: "#888" }}>{b.session}</span>
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
  bugFound: { fontSize: 13, lineHeight: 1.6, color: "#888", margin: 0, fontStyle: "italic" },
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
