// Records the landing page's demo clips by driving the real editor.
//
//   node scripts/record-demo.mjs            both clips
//   node scripts/record-demo.mjs desktop    just the desktop clip
//   node scripts/record-demo.mjs phone      just the phone clip
//
// Needs: the dev server on http://localhost:3000, Google Chrome, and ffmpeg.
// Uses the graphics card by default; SOFTWARE=1 forces software rendering.
//
// Writes to public/demos:
//   editor-demo.mp4          the whole editor, for wide screens
//   editor-demo-phone.mp4    tall close-up for phones
//   plus a -poster.jpg (first frame) for the desktop and phone clips
//
// Each clip starts and ends on the same frame so it loops seamlessly.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "demos");

// Playback speed of the finished clip relative to how it was recorded.
// Applied when the frames are timed, so there's no extra re-encoding.
const SPEED = 1.5;
// Frames per second of the finished clip.
const FPS = 60;

// Draw with the machine's graphics card (no window needed). This is what
// makes a smooth, high-frame-rate capture possible. On a machine without a
// usable GPU, run with SOFTWARE=1 to fall back to a slow software renderer.
const GPU_FLAGS = process.env.SOFTWARE
  ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
  : ["--enable-gpu", "--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nodeSelector = (id) => `.react-flow__node[data-id='${id}']`;

const VARIANTS = {
  // The whole editor: code, views, and the inspector.
  desktop: {
    width: 1600,
    height: 1000,
    // Pixels per CSS pixel. Shown about 1070px wide, so 1.5x (2400px) stays
    // sharp on high-resolution screens without a huge file.
    scale: 1.5,
    json: readFileSync(join(ROOT, "samples", "mission-demo.json"), "utf8").trimEnd(),
    fileName: "mission.json",
    settings: {},
    hide: [],
    css: "",
    outputs: [{ file: "editor-demo.mp4", crf: 23 }],
    poster: "editor-demo-poster.jpg",
    async steps(d) {
      await d.hold(1000);
      await d.click(await d.centre(nodeSelector('$."payload"."orbit"')));
      await d.hold(2600); // route lights up, code scrolls and highlights, inspector opens
      await d.click(await d.tab("Tree"));
      await d.hold(2300);
      await d.click(await d.tab("3D"));
      await d.hold(4000); // slow turn
      await d.click(await d.tab("Graph"));
      await d.hold(1300);
      await d.click(await d.empty()); // clear the selection: back to the opening frame
      await d.park();
      await d.hold(1500);
    },
  },

  // A tall close-up for phones: the JSON on top, its graph underneath, both
  // at a readable size. A tiny file laid out top to bottom keeps the node
  // cards full size. No inspector: there's no room for a third column.
  phone: {
    width: 420,
    height: 640,
    scale: 2.5,
    json: JSON.stringify(
      { order: 4821, customer: { name: "Ada", address: { city: "Leeds" } } },
      null,
      2
    ),
    fileName: "order.json",
    settings: { graphDirection: "TB" },
    // Only the code and the canvas, stacked. This project's Tailwind
    // utilities are !important and beat an injected stylesheet on the same
    // property, so: `hide` sets display inline (which does win), and the CSS
    // below only uses properties no utility on those elements sets.
    hide: ["main > header", "main > div:last-child"],
    css:
      "main > div:nth-last-child(2) { flex-direction: column !important }" +
      "main > div:nth-last-child(2) > div:first-child { width: 100% !important; height: 224px !important; flex: none !important }" +
      "main > div:nth-last-child(2) > div:first-child > div:first-child { width: 100% !important; border-right-color: transparent !important; box-shadow: inset 0 -1px 0 #1c1f23 }" +
      "main > div:nth-last-child(2) > div:first-child > div:last-child { visibility: hidden !important }" +
      // No room for the inspector or the canvas buttons in a small frame.
      ".vf-inspector { position: absolute !important; visibility: hidden !important }" +
      ".react-flow__panel { visibility: hidden !important }",
    outputs: [{ file: "editor-demo-phone.mp4", crf: 24 }],
    poster: "editor-demo-phone-poster.jpg",
    async steps(d) {
      await d.hold(900);
      await d.click(await d.centre(nodeSelector('$."customer"')));
      await d.hold(1900); // route lights up; its lines highlight in the code above
      await d.click(await d.centre(nodeSelector('$."customer"."address"')));
      await d.hold(1900);
      await d.click(await d.tab("Tree"));
      await d.hold(2000);
      await d.click(await d.tab("3D"));
      await d.hold(3200);
      await d.click(await d.tab("Graph"));
      await d.hold(1200);
      await d.click(await d.empty());
      await d.park();
      await d.hold(1400);
    },
  },
};

async function record(name) {
  const v = VARIANTS[name];
  const work = mkdtempSync(join(tmpdir(), `vf-demo-${name}-`));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn("google-chrome-stable", [
    "--headless=new", "--hide-scrollbars", `--window-size=${v.width},${v.height}`,
    // A real device scale factor: the screen capture ignores an emulated one.
    `--force-device-scale-factor=${v.scale}`,
    ...GPU_FLAGS,
    `--remote-debugging-port=${port}`, `--user-data-dir=${join(work, "profile")}`, "about:blank",
  ], { stdio: "ignore" });

  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const frames = []; // { file, time }
  let recording = false;
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d.error); pending.delete(d.id); }
    if (d.method === "Page.screencastFrame") {
      send("Page.screencastFrameAck", { sessionId: d.params.sessionId });
      if (!recording) return;
      const file = join(work, `f${String(frames.length).padStart(5, "0")}.jpg`);
      writeFileSync(file, Buffer.from(d.params.data, "base64"));
      frames.push({ file, time: d.params.metadata.timestamp });
    }
  };
  const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: 0, mobile: false });

  // Start from a clean state with this clip's settings, then load the file by
  // dropping it on the page, which also sets the file name in the top bar.
  await send("Page.navigate", { url: "http://localhost:3000/editor" });
  await sleep(1500);
  await ev(`(() => { localStorage.clear(); localStorage.setItem('json_visualizer_settings', ${JSON.stringify(JSON.stringify(v.settings))}); })()`);
  await send("Page.navigate", { url: "http://localhost:3000/editor" });
  for (let i = 0; i < 80; i++) {
    await sleep(300);
    if (await ev(`!!window.monaco && !!document.querySelector('.monaco-editor')`)) break;
  }

  // Hide dev-only chrome and toasts, apply this clip's layout, and add a
  // pointer so clicks can be followed (a headless browser has no cursor).
  const park = { x: v.width * 0.5, y: v.height * 0.9 };
  await ev(`(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal, [data-sonner-toaster] { display: none !important }'
      + ${JSON.stringify(v.css)}
      + '#demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; transition: transform .55s cubic-bezier(.4,0,.2,1); will-change: transform; }'
      + '#demo-cursor.press svg { transform: scale(.86); } #demo-cursor svg { transition: transform .12s; transform-origin: 4px 3px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }'
      + '#demo-ring { position: absolute; left: -9px; top: -10px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #c8f169; opacity: 0; }'
      + '#demo-cursor.press #demo-ring { animation: demo-ring .45s ease-out; } @keyframes demo-ring { from { opacity: .9; transform: scale(.3); } to { opacity: 0; transform: scale(1.5); } }';
    document.head.appendChild(style);
    for (const selector of ${JSON.stringify(v.hide)}) {
      document.querySelectorAll(selector).forEach((e) => e.style.setProperty('display', 'none', 'important'));
    }
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = '<div id="demo-ring"></div><svg width="22" height="24" viewBox="0 0 22 24"><path d="M3 2l15 9.5-6.8 1.3L15 21l-3.2 1.4-3.6-8.1L3 18.5z" fill="#ecedee" stroke="#0b0c0e" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cursor);
    window.__moveCursor = (x, y) => { cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
    window.__press = () => { cursor.classList.remove('press'); void cursor.offsetWidth; cursor.classList.add('press'); };
    window.__moveCursor(${park.x}, ${park.y});
  })()`);
  await sleep(600);

  await ev(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(v.json)}], ${JSON.stringify(v.fileName)}, { type: "application/json" }));
    const main = document.querySelector("main");
    for (const type of ["dragenter", "dragover", "drop"]) {
      main.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
    }
  })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    if (await ev(`document.querySelectorAll('.react-flow__node').length > 0`)) break;
  }
  await sleep(1500);

  const director = {
    centre: (selector) => ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + Math.min(b.width / 2, 60), y: b.y + Math.min(b.height / 2, 14) }; })()`),
    tab: (label) => ev(`(() => { const e = [...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === ${JSON.stringify(label)}); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`),
    empty: () => ev(`(() => { const r = document.querySelector('.react-flow').getBoundingClientRect(); for (let y = r.bottom - 40; y > r.top + 60; y -= 20) for (let x = r.left + 30; x < r.right - 30; x += 20) { const e = document.elementFromPoint(x, y); if (e && e.classList.contains('react-flow__pane')) return { x, y }; } return null; })()`),
    park: () => ev(`window.__moveCursor(${park.x}, ${park.y})`),
    async click(point, settle = 0) {
      if (!point) throw new Error(`${name}: nothing to click (a selector didn't match)`);
      await ev(`window.__moveCursor(${point.x}, ${point.y})`);
      await sleep(650);
      await ev(`window.__press()`);
      for (const type of ["mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 });
      }
      await sleep(settle);
    },
    // Holds while nudging the page so a frame is captured even when nothing moves.
    async hold(ms) {
      for (let t = 0; t < ms; t += 200) {
        await ev(`(() => { const c = document.getElementById('demo-cursor'); c.style.opacity = c.style.opacity === '0.999' ? '1' : '0.999'; })()`);
        await sleep(200);
      }
    },
  };

  // Warm up: open the 3D view once so its code is cached, then return to the start.
  await director.click(await director.tab("3D"), 3500);
  await director.click(await director.tab("Graph"), 1500);
  await director.park();
  await sleep(1200);

  await send("Page.startScreencast", { format: "jpeg", quality: 96, maxWidth: v.width * v.scale, maxHeight: v.height * v.scale, everyNthFrame: 1 });
  recording = true;
  await v.steps(director);
  recording = false;
  await send("Page.stopScreencast");
  chrome.kill();

  // ---- encode --------------------------------------------------------------
  const list = frames.map((f, i) => {
    const next = frames[i + 1];
    const duration = (next ? Math.max(next.time - f.time, 0.001) : 0.2) / SPEED;
    return `file '${f.file}'\nduration ${duration.toFixed(4)}`;
  }).join("\n") + `\nfile '${frames[frames.length - 1].file}'\n`;
  writeFileSync(join(work, "list.txt"), list);
  const seconds = frames[frames.length - 1].time - frames[0].time;
  console.log(`${name}: captured ${frames.length} frames over ${seconds.toFixed(1)}s; clip runs ${(seconds / SPEED).toFixed(1)}s at ${SPEED}x`);

  for (const output of v.outputs) {
    // The captured frames are full-range JPEG. Convert to the form browsers
    // expect for video (limited range, BT.709) and label the file as such.
    // Left as full-range with no labels, browsers crush the UI's dark greys to black.
    const resize = output.scaleTo ? `scale=${output.scaleTo}:-2:flags=lanczos,` : "";
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(work, "list.txt"),
      "-vf", `${resize}scale=in_range=pc:out_range=tv:out_color_matrix=bt709,fps=${FPS},format=yuv420p`,
      "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-an", "-c:v", "libx264", "-preset", "slow", "-crf", String(output.crf), "-movflags", "+faststart",
      join(OUT, output.file),
    ]);
    console.log(`  wrote ${output.file}`);
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", frames[0].file, "-q:v", "2", join(OUT, v.poster)]);
  console.log(`  wrote ${v.poster}`);
  rmSync(work, { recursive: true, force: true });
}

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : Object.keys(VARIANTS)) {
  if (!VARIANTS[name]) throw new Error(`unknown clip "${name}"; choose from ${Object.keys(VARIANTS).join(", ")}`);
  await record(name);
}
process.exit(0);
