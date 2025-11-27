/* 
   KEY OVERLAY JS / QUICK GUIDE

   HOW TO ADD A NEW KEY:
   1) Add the label to keysToShow below (must match CSS data-key="...").
   2) Make sure CSS maps that label to a grid-area in grid-template-areas.

   KEY NAMES / NORMALIZING:
   - The input bridge may send names like "KEY_Q", "BTN_LEFT", etc.
   - normalizeKey() below turns those into the labels used here + in the CSS.
*/

const WS_URL = "ws://localhost:8765/";

/* 
   KEYS TO SHOW
   - Whatever keys you wanna show, list them here.
   - Order here doesn't control layout, just what exists.
   - Layout is handled in the CSS via grid-template-areas.
*/
const keysToShow = [
    "1","2","3","4",
    "TAB","Q","W","E","R",
    "CAPS","A","S","D","F",
    "SHIFT","Z","X","C","V",
    "CTRL","ALT","SPACE",
    "M1","-","M2",
];

const overlay = document.getElementById("overlay");

/* Map label - DOM element for quick lookup when events come in. */
const keyMap = new Map();

/* Create a single key element and register it in keyMap. */
function makeKey(label) {
    let el = document.createElement("div");
    el.classList.add("key");
    el.dataset.key = label;
    el.textContent = label;
    overlay.appendChild(el);
    keyMap.set(label, el);
}

/* Build all keys listed in keysToShow. */
keysToShow.forEach(makeKey);

/* Turn raw key names from the input bridge into labels, that match keysToShow and the CSS (data-key="..."). */
function normalizeKey(raw) {
    if (!raw) return null;
    let k = raw.toUpperCase();

    /* Strip prefix like "KEY_Q" - "Q" */
    if (k.startsWith("KEY_")) k = k.substring(4);

    /* Merge left/right variants */
    if (["LEFTSHIFT","RIGHTSHIFT","SHIFT"].includes(k)) return "SHIFT";
    if (["LEFTCTRL","RIGHTCTRL","CTRL"].includes(k))   return "CTRL";
    if (["LEFTALT","RIGHTALT","ALT"].includes(k))      return "ALT";

    /* Space bar */
    if (["SPACE","SPACEBAR"].includes(k)) return "SPACE";

    /* Mouse buttons - M1 / M2 */
    if (["BTN_LEFT","MOUSE1"].includes(k))  return "M1";
    if (["BTN_RIGHT","MOUSE2"].includes(k)) return "M2";

    /* Caps lock */
    if (["CAPSLOCK","CAPS LOCK","CAPS"].includes(k)) return "CAPS";

    /* Default: use whatever's left (e.g. "Q", "1", "-") */
    return k;
}

/* 
   Apply the event to the matching key element:
   - key_press → add .pressed
   - key_release → remove .pressed
*/
function handleEvent(ev) {
    let key = normalizeKey(ev.key);
    if (!key) return;
    if (!keyMap.has(key)) return;

    let el = keyMap.get(key);

    if (ev.type === "key_press") {
        el.classList.add("pressed");
    } else if (ev.type === "key_release") {
        el.classList.remove("pressed");
    }
}

/* 
   Connect to the WebSocket input bridge.
   - On close, it auto-reconnects after 1 second.
*/
function connectWS() {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("Connected to input bridge.");

    ws.onmessage = msg => {
        try {
            let data = JSON.parse(msg.data);
            handleEvent(data);
        } catch (e) {
            console.error("Bad message:", e);
        }
    };

    ws.onclose = () => {
        console.log("Disconnected. Reconnecting in 1s...");
        setTimeout(connectWS, 1000);
    };
}

/* Start the overlay */
connectWS();

