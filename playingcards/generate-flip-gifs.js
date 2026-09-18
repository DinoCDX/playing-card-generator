// generate-flip-gifs.js
// Renders a "flip" animation (card back -> card face) for every card as an
// animated GIF, sized for use as Discord emojis. The back half of every
// flip uses the exact same markup as the standalone card_back.png, so the
// still back-cover PNG and the animated ones always match.
//
// How the flip is faked: rather than a real 3D rotation (fiddly to capture
// frame-by-frame with a headless browser), each frame just squashes the
// visible face horizontally with `scaleX`, going 1 -> 0 -> 1. Whichever
// face is "forward" swaps at the zero-crossing (half way through), which
// reads as a coin-flip / card-flip. The scale is always a plain magnitude
// (never negative) - an earlier version of this file preserved the sign of
// cos(angle) into the second half of the animation, which mirrored the
// front face horizontally. Don't reintroduce that.
//
// Performance note: the page is built ONCE per card (both faces already in
// the DOM, see templates.flipDocumentHtml), and each frame just toggles
// visibility + sets a transform via page.evaluate(). Don't go back to
// calling page.setContent() once per frame - that's a full page navigation
// each time (52 cards x ~18 frames = 900+ navigations) and is much slower.
//
// Transparency note: GIF only supports fully-on/fully-off transparency, no
// soft edges, and it has no real alpha channel. Screenshots are taken with
// `omitBackground: true` so Chromium renders against a truly transparent
// backdrop (no visible colour to blend into anti-aliased edges). We then
// walk each frame's real alpha channel ourselves: pixels that are mostly
// transparent get remapped to a solid chroma-key colour (so the GIF
// encoder's setTransparent() can key them out); pixels that are mostly
// opaque keep their real, unblended colour. This avoids ever compositing
// the card against a visible background colour, which is what caused a
// green fringe around the rounded corners in an earlier version - do not
// go back to painting the page background a solid colour before
// screenshotting.
//
// 2026 fork addition, sits alongside the original generate-cards.js
// GPL 3.0 Licensed

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const GIFEncoder = require("gifencoder");
const { PNG } = require("pngjs");
const { SUITS, NUMBERS, flipDocumentHtml, CARD_PX } = require("./templates");

// ---- tuning knobs --------------------------------------------------------

// Frames per flip. Higher = smoother animation but slower to render and a
// bigger GIF file. 16-24 looks good at emoji size.
const FRAME_COUNT = 18;

// How long each frame is shown, in milliseconds.
const FRAME_DELAY_MS = 45;

// GIF loop count, per gifencoder's setRepeat():
//   -1 = play once, then stop on the last frame (no looping at all)
//    0 = loop forever
//    n = loop n additional times after the first playthrough
//
// Set to -1: the flip plays through exactly once and freezes on the final
// (face-up) frame - it will not loop.
const GIF_LOOP_REPEAT = -1;

// Chroma-key colour used to mark transparent pixels for the GIF encoder.
// Only ever applied in post-processing (see paintTransparencyKey below),
// never actually painted into the page itself.
const CHROMA_KEY_RGB = [0x00, 0xff, 0x00];
const CHROMA_KEY_HEX = 0x00ff00;

// Alpha values below this (out of 255) are treated as "background" and
// remapped to the chroma key; at/above it, the pixel is treated as fully
// opaque and keeps its real colour.
const ALPHA_CUTOFF = 128;

const OUT_DIR = path.resolve(__dirname, "gifs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// Mutates a decoded PNG's pixel buffer in place: fully/mostly-transparent
// pixels become the chroma-key colour (for the encoder to key out),
// fully/mostly-opaque pixels are forced fully opaque but otherwise
// untouched. This is what keeps real card colours from ever blending
// against a visible background colour.
function paintTransparencyKey(png) {
  const data = png.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < ALPHA_CUTOFF) {
      data[i] = CHROMA_KEY_RGB[0];
      data[i + 1] = CHROMA_KEY_RGB[1];
      data[i + 2] = CHROMA_KEY_RGB[2];
      data[i + 3] = 0xff;
    } else {
      data[i + 3] = 0xff;
    }
  }
}

async function renderFlipGif(page, symbol, number, fileName) {
  const encoder = new GIFEncoder(CARD_PX.width, CARD_PX.height);
  const outStream = fs.createWriteStream(path.join(OUT_DIR, fileName));
  encoder.createReadStream().pipe(outStream);

  encoder.start();
  encoder.setRepeat(GIF_LOOP_REPEAT);
  encoder.setDelay(FRAME_DELAY_MS);
  encoder.setQuality(8);
  encoder.setTransparent(CHROMA_KEY_HEX);

  // Build the page ONCE for this card - both faces already in the DOM.
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
    const png = PNG.sync.read(buffer);
    paintTransparencyKey(png);
    encoder.addFrame(png.data);
  }

  encoder.finish();
  await new Promise((resolve) => outStream.on("close", resolve));
}

(async () => {
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
  console.log(`Done. ${NUMBERS.length * Object.keys(SUITS).length} GIFs written to ${OUT_DIR}`);
})();