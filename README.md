# Input Overlay (showmethekey → WebSocket → Browser)

Simple keyboard/mouse overlay for OBS.

- `showmethekey-cli` captures your input.
- `main.cs` runs a small WebSocket server and forwards events.
- `overlay/index.html` + `overlay.js` + `overlay.css` draw the keys and light them up.

## Requirements

- Linux (this uses `/usr/bin/showmethekey-cli`)
- [`showmethekey-cli`](https://github.com/AlynxZhou/showmethekey) installed and available at `/usr/bin/showmethekey-cli`
- .NET (to build/run the C# bridge)
- OBS (or anything that can show a browser source)

## How it works (short version)

1. `showmethekey-cli` writes JSON lines describing key and mouse events.
2. `main.cs`:
   - starts a WebSocket server on `ws://127.0.0.1:8765/`
   - reads `showmethekey-cli` stdout line by line
   - filters only:
     - `event_name == "KEYBOARD_KEY"` (keyboard)
     - `event_name == "POINTER_BUTTON"` (mouse buttons)
   - maps:
     - `state_name == "PRESSED"` → `"key_press"`
     - `state_name == "RELEASED"` → `"key_release"`
   - strips the `KEY_` prefix once:
     - `KEY_A` → `"A"`
   - broadcasts JSON like:
     ```json
     { "type": "key_press", "key": "A" }
     ```

3. `overlay.js` connects to `ws://127.0.0.1:8765/` and:
   - normalizes incoming `"key"` (e.g. `LEFTSHIFT` → `"SHIFT"`, `BTN_LEFT` → `"M1"`)
   - finds the matching `<div class="key" data-key="...">`
   - adds/removes the `.pressed` class on key press/release

4. `overlay.css` defines the layout and look of the keys.

## Running the bridge

TO DO 
