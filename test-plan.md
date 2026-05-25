# Battleship Game End-to-End Test Plan

## What Changed
Full implementation of a single-player Battleship game: difficulty selection, ship placement, turn-based combat with AI, win/loss detection.

## Primary Flow: Complete Game on Easy Difficulty

### Test 1: Difficulty Selection Screen
**Steps:** Navigate to localhost:3000
**Assertions:**
- Page title "Battleship" is visible
- Three difficulty cards visible: "Easy", "Medium", "Hard"
- Each card has a "Select" button

### Test 2: Select Easy Difficulty → Ship Placement Phase
**Steps:** Click the "Easy" card
**Assertions:**
- Page heading changes to "Ship Placement"
- Difficulty label shows "easy"
- Message reads "Place your Carrier (5 cells)"
- A 10x10 grid is visible with column headers A-J and row labels 1-10
- Controls panel shows "Placing: Carrier (5 cells)"
- "Rotate (H)" button is visible
- "Random Placement" and "Reset" buttons are visible
- "Start Battle" button is NOT visible yet

### Test 3: Random Placement → All Ships Placed
**Steps:** Click "Random Placement" button
**Assertions:**
- Grid shows blue-highlighted cells for placed ships (exactly 17 cells total: 5+4+3+3+2)
- Message reads 'All ships placed! Click "Start Battle" to begin.'
- "Start Battle" button IS now visible
- "Rotate" button disappears (no more ships to place)
- Fleet status panel shows all 5 ships listed

### Test 4: Reset Placement
**Steps:** Click "Reset" button
**Assertions:**
- Grid is cleared (no blue ship cells)
- Message reads "Place your Carrier (5 cells)"
- "Start Battle" button disappears
- "Rotate (H)" button reappears

### Test 5: Manual Ship Placement with Rotation
**Steps:**
1. Click cell A1 (top-left area of grid) to place Carrier horizontally
2. Verify Carrier occupies 5 cells in row 1
3. Click "Rotate" button to switch to vertical
4. Click cell A2 to place Battleship vertically
5. Continue placing remaining ships
**Assertions:**
- After placing Carrier: message changes to "Place your Battleship (4 cells)"
- After toggling rotation: button text changes to "Rotate (V)"
- Ships are visible as blue cells on grid
- After all 5 ships placed: "Start Battle" button appears

### Test 6: Start Battle → Battle Phase
**Steps:** Click "Start Battle" button (use Random Placement first for speed)
**Assertions:**
- Page heading changes to "Battle"
- Difficulty label shows "easy"
- Status message reads "Your turn! Click on the enemy grid to fire."
- Two grids visible: "Enemy Waters (Click to Fire)" on left, "Your Fleet" on right
- Enemy Fleet and Your Fleet Status panels visible below grids

### Test 7: Player Fires and Gets Hit/Miss Response
**Steps:** Click a cell on the Enemy Waters grid
**Assertions:**
- Clicked cell changes color: red with "X" for hit, OR grey with dot for miss
- Status message updates with coordinate (e.g., "Hit at A1!" or "Miss at A1.")
- Hit message has red-tinted background, miss has grey-tinted background
- After ~800ms, AI fires back and message updates with AI's shot info
- A cell on "Your Fleet" grid changes to reflect AI's shot

### Test 8: Ship Sinking Notification
**Steps:** Keep firing at enemy grid cells systematically until a ship is sunk
**Assertions:**
- When a ship is fully hit, message reads "You sank the AI's [Ship Name]!"
- In Enemy Fleet status panel, sunk ship gets "SUNK" badge and strikethrough text
- Ship indicator dots turn red for hit segments

### Test 9: Cannot Re-target Already Shot Cell
**Steps:** Click a cell that was already targeted (hit or miss)
**Assertions:**
- Nothing happens (no state change, no turn consumed)
- The cell retains its hit/miss appearance

### Test 10: Game Over - Victory
**Steps:** Continue firing until all 5 AI ships are sunk
**Assertions:**
- Dialog appears with title "Victory!"
- Description reads "Congratulations! You sank all enemy ships!"
- "Play Again" and "Change Difficulty" buttons visible
- Grid behind dialog shows final game state

### Test 11: Play Again Flow
**Steps:** Click "Play Again" button
**Assertions:**
- Returns to Ship Placement phase (not difficulty selection)
- Grid is cleared for new ship placement
- Difficulty remains "easy"

### Test 12: Change Difficulty Flow
**Steps:** Complete another game, then click "Change Difficulty"
**Assertions:**
- Returns to difficulty selection screen with "Battleship" title and 3 cards
