// generate-cards.js
// Renders the 52 static front-face card PNGs, plus one card_back.png,
// sized for use as Discord emojis.
//
// 2024-05-03 false-fox @ falsefox.dev
// 2026 fork additions
// GPL 3.0 Licensed

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { SUITS, NUMBERS, frontCardHtml, backCardHtml, CARD_PX } = require("./templates");

const OUT_DIR = path.resolve(__dirname, "cards");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

async function screenshotCard(page, html, filePath) {
  await page.setContent(html, { waitUntil: "load" });
  const content = await page.$("#card");
  const imageBuffer = await content.screenshot({ omitBackground: true });
  fs.writeFileSync(filePath, imageBuffer);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport(CARD_PX);

  for (const symbol of Object.keys(SUITS)) {
    for (const number of NUMBERS) {
      const fileName = `${number}_of_${SUITS[symbol].name}.png`;
      console.log(`front: ${symbol} ${number} -> ${fileName}`);
      await screenshotCard(
        page,
        frontCardHtml(symbol, number),
        path.join(OUT_DIR, fileName)
      );
    }
  }

  console.log("back cover -> card_back.png");
  await screenshotCard(page, backCardHtml(), path.join(OUT_DIR, "card_back.png"));

  await page.close();
  await browser.close();
  console.log(`Done. ${NUMBERS.length * Object.keys(SUITS).length + 1} PNGs written to ${OUT_DIR}`);
})();