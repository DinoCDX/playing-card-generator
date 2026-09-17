// generate-flip-gifs.js
// Renders a "flip" animation (card back -> card face) for every card as an
// animated GIF, sized for use as Discord emojis. The back half of every
// flip uses the exact same markup as the standalone card_back.png, so the
// still back-cover emoji and the animated ones always match.
//
// How the flip is faked: rather than a real 3D rotation (fiddly to capture
// frame-by-frame with a headless browser), each frame just squashes the
// card horizontally with `scaleX`, going 1 -> 0 -> -1. Whichever face is
// "forward" swaps at the zero-crossing (half way through), which reads as
// a coin-flip / card-flip. It's simple and it works.
//
// 2026 fork addition, sits alongside the original generate-cards.js
// GPL 3.0 Licensed

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const GIFEncoder = require("gifencoder");
const { PNG } = require("pngjs");
const { SUITS, NUMBERS, frontCardHtml, backCardHtml, CARD_PX } = require("./templates");

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
// (face-up) frame — it will not loop.
const GIF_LOOP_REPEAT = -1;

// Chroma-key colour used to fake transparency (see note below).
const CHROMA_KEY = "#00ff00";

const OUT_DIR = path.resolve(__dirname, "gifs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// NOTE on transparency: GIF only supports fully-on/fully-off transparency,
// no soft edges. We render every frame against a solid chroma-key green
// background and tell the encoder to treat that exact colour as
// transparent. Anti-aliased pixels right at the card's rounded corners can
// end up with a faint green fringe rather than a perfectly clean edge —
// a known, minor trade-off of doing this without a full alpha-aware GIF
// pipeline. Swap CHROMA_KEY + setTransparent for a different flat colour
// (e.g. Discord's dark theme background) if you'd rather have a solid
// backdrop than fringing.

async function renderFlipGif(page, frontHtml, fileName) {
  const encoder = new GIFEncoder(CARD_PX.width, CARD_PX.height);
  const outStream = fs.createWriteStream(path.join(OUT_DIR, fileName));
  encoder.createReadStream().pipe(outStream);

  encoder.start();
  encoder.setRepeat(GIF_LOOP_REPEAT);
  encoder.setDelay(FRAME_DELAY_MS);
  encoder.setQuality(8);
  encoder.setTransparent(0x00ff00);

  const backHtml = backCardHtml();

  for (let f = 0; f < FRAME_COUNT; f++) {
    const t = f / (FRAME_COUNT - 1); // 0 -> 1
    const angle = t * Math.PI; // 0 -> PI
    const scaleX = Math.cos(angle); // 1 -> -1
    const showFront = t >= 0.5;

    await page.setContent(showFront ? frontHtml : backHtml, { waitUntil: "load" });
    await page.evaluate(
      ({ scale, chromaKey }) => {
        document.body.style.background = chromaKey;
        const el = document.querySelector("#card");
        el.style.transformOrigin = "center";
        // clamp so the card never hits a literal zero-width frame
        el.style.transform = `scaleX(${Math.max(Math.abs(scale), 0.04) * Math.sign(scale || 1)})`;
      },
      { scale: scaleX, chromaKey: CHROMA_KEY }
    );

    const buffer = await page.screenshot({
      clip: { x: 0, y: 0, width: CARD_PX.width, height: CARD_PX.height },
    });
    const png = PNG.sync.read(buffer);
    encoder.addFrame(png.data);
  }

  encoder.finish();
  await new Promise((resolve) => outStream.on("close", resolve));
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport(CARD_PX);

  for (const symbol of Object.keys(SUITS)) {
    for (const number of NUMBERS) {
      const fileName = `${number}_of_${SUITS[symbol].name}.gif`;
      console.log(`flip: ${symbol} ${number} -> ${fileName}`);
      await renderFlipGif(page, frontCardHtml(symbol, number), fileName);
    }
  }

  await page.close();
  await browser.close();
  console.log(`Done. ${NUMBERS.length * Object.keys(SUITS).length} GIFs written to ${OUT_DIR}`);
})();