// generate-flip-gifs.js
// Renders a "flip" animation (card back -> card face) for every card as an
// animated GIF, sized for use as Discord emojis. The back half of every
// flip uses the exact same markup as the standalone card_back.png, so the
// still back-cover PNG and the animated ones always match.
//
// How the flip is faked: each frame squashes the visible face horizontally
// with `scaleX`, going 1 -> 0 -> 1 (always a plain magnitude, never
// negative - a negative scale mirrors the face horizontally, which was a
// bug in an earlier version). Whichever face is "forward" swaps at the
// zero-crossing (half way through), which reads as a coin-flip / card-flip.
//
// GIF assembly is done by shelling out to ffmpeg rather than hand-rolling a
// GIF encoder in JS. Earlier versions of this file used the 'gifencoder'
// package with a manual chroma-key transparency hack, which was flaky:
// each frame's 256-colour palette was quantized independently, so the
// "transparent" key colour wasn't guaranteed to land on the same palette
// index every frame - the background would flicker between transparent
// and solid green. ffmpeg's two-pass palette workflow (palettegen +
// paletteuse) builds ONE palette shared across every frame and supports
// real alpha-channel transparency directly, avoiding that whole class of
// bug. Every frame is captured as a real PNG with a true alpha channel
// (`omitBackground: true` - no chroma-key colour involved at all); ffmpeg
// handles all the transparency logic. Don't reintroduce a JS-side
// chroma-key/palette hack here.
//
// Requires ffmpeg on PATH. It's preinstalled on GitHub Actions'
// ubuntu-latest runners (the workflow also installs it explicitly to be
// safe). For local use: `sudo apt install ffmpeg` / `brew install ffmpeg` /
// on Windows, install from ffmpeg.org and add it to PATH.
//
// 2026 fork addition, sits alongside the original generate-cards.js
// GPL 3.0 Licensed

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { SUITS, NUMBERS, flipDocumentHtml, CARD_PX } = require("./templates");

// ---- tuning knobs --------------------------------------------------------

// Frames per flip. Higher = smoother animation but slower to render and a
// bigger GIF file. 16-24 looks good at emoji size.
const FRAME_COUNT = 18;

// How long each frame is shown, in milliseconds.
const FRAME_DELAY_MS = 45;

// GIF loop count, passed straight to ffmpeg's `-loop`:
//   -1 = play once, then stop on the last frame (no looping at all)
//    0 = loop forever
//    n = loop n additional times after the first playthrough
//
// Set to -1: the flip plays through exactly once and freezes on the final
// (face-up) frame - it will not loop.
const GIF_LOOP_REPEAT = -1;

const OUT_DIR = path.resolve(__dirname, "gifs");
const TMP_ROOT = path.resolve(__dirname, ".tmp-frames");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

function assertFfmpegAvailable() {
  const check = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (check.error) {
    throw new Error(
      "ffmpeg is required to build the flip GIFs but wasn't found on PATH. " +
        "Install it (e.g. `sudo apt install ffmpeg`, `brew install ffmpeg`) and try again."
    );
  }
}

async function captureFrames(page, symbol, number, frameDir) {
  await page.setContent(flipDocumentHtml(symbol, number), { waitUntil: "load" });

  for (let f = 0; f < FRAME_COUNT; f++) {
    const t = f / (FRAME_COUNT - 1); // 0 -> 1
    const angle = t * Math.PI; // 0 -> PI
    const scale = Math.max(Math.abs(Math.cos(angle)), 0.04); // 1 -> 0 -> 1, never negative
    const showFront = t >= 0.5;

    await page.evaluate(
      ({ scale, showFront }) => {
        const front = document.getElementById("front-face");
        const back = document.getElementById("back-face");
        front.style.display = showFront ? "block" : "none";
        back.style.display = showFront ? "none" : "block";
        const visible = showFront ? front : back;
        visible.style.transform = `scaleX(${scale})`;
      },
      { scale, showFront }
    );

    const buffer = await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: CARD_PX.width, height: CARD_PX.height },
    });
    const frameName = `frame_${String(f).padStart(3, "0")}.png`;
    fs.writeFileSync(path.join(frameDir, frameName), buffer);
  }
}

function assembleGif(frameDir, outPath) {
  const framerate = `1000/${FRAME_DELAY_MS}`;
  // One shared palette across all frames (via split + palettegen), reusing
  // it for every frame (paletteuse), with a real alpha threshold for
  // binary GIF transparency. No chroma-key colour anywhere in this pipeline.
  const filter =
    "split[s0][s1];" +
    "[s0]palettegen=reserve_transparent=1[p];" +
    "[s1][p]paletteuse=alpha_threshold=128";

  const args = [
    "-y",
    "-framerate", framerate,
    "-i", path.join(frameDir, "frame_%03d.png"),
    "-filter_complex", filter,
    "-loop", String(GIF_LOOP_REPEAT),
    outPath,
  ];

  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed while building ${outPath}`);
  }
}

async function renderFlipGif(page, symbol, number, fileName) {
  const frameDir = path.join(TMP_ROOT, path.basename(fileName, ".gif"));
  fs.mkdirSync(frameDir, { recursive: true });

  try {
    await captureFrames(page, symbol, number, frameDir);
    assembleGif(frameDir, path.join(OUT_DIR, fileName));
  } finally {
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

(async () => {
  assertFfmpegAvailable();
  fs.mkdirSync(TMP_ROOT, { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport(CARD_PX);

  for (const symbol of Object.keys(SUITS)) {
    for (const number of NUMBERS) {
      const fileName = `${number}_of_${SUITS[symbol].name}.gif`;
      console.log(`flip: ${symbol} ${number} -> ${fileName}`);
      await renderFlipGif(page, symbol, number, fileName);
    }
  }

  await page.close();
  await browser.close();
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  console.log(`Done. ${NUMBERS.length * Object.keys(SUITS).length} GIFs written to ${OUT_DIR}`);
})();