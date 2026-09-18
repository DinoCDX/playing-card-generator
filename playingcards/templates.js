// templates.js
// Shared HTML/CSS templates for card fronts and the card back.
// Both generate-cards.js (static PNGs) and generate-flip-gifs.js (animated
// GIFs) build their pages from these functions, so the back design always
// looks identical whether it's rendered as its own emoji or as a flip-frame.
// The back is a plain CSS pattern (border + diamond lattice + medallion) —
// no emoji glyph — so it looks like an actual card back, not an icon.
//
// 2024-05-03 false-fox @ falsefox.dev
// 2026 fork additions
// GPL 3.0 Licensed

const SUITS = {
  "♥️": { name: "hearts", color: "#e0263f" },
  "♣": { name: "clover", color: "#1a1a1a" },
  "♦️": { name: "diamonds", color: "#e0263f" },
  "♠": { name: "spades", color: "#1a1a1a" },
};

const NUMBERS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Card size, kept the same as upstream (2.5in x 3.5in ~= 240x336px @ 96dpi).
const CARD_WIDTH = "2.5in";
const CARD_HEIGHT = "3.5in";
const CARD_PX = { width: 240, height: 336 };

// Bigger ranks (two-character "10") get a smaller font so they don't clip.
function rankSizeForNumber(number) {
  return number === "10" ? "1.7in" : "2.3in";
}

function docShell(css, bodyHtml, bodyBg) {
  return `
<html>
<head>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: ${bodyBg}; }
  ${css}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function frontCardHtml(symbol, number) {
  const suit = SUITS[symbol];
  const color = suit.color;
  const rankSize = rankSizeForNumber(number);

  const css = `
    #card {
      position: relative;
      overflow: hidden;
      width: ${CARD_WIDTH};
      height: ${CARD_HEIGHT};
      border-radius: 5mm;
      background: #ffffff;
      box-shadow: 0 0.06in 0.12in rgba(0,0,0,0.35);
      font-family: Georgia, 'Times New Roman', serif;
    }
    .watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.6in;
      line-height: 1;
      opacity: 0.09;
      color: ${color};
    }
    .corner {
      position: absolute;
      font-size: 0.55in;
      line-height: 1;
      color: ${color};
    }
    .corner.top { top: 0.14in; left: 0.16in; }
    .corner.bottom { bottom: 0.14in; right: 0.16in; transform: rotate(180deg); }
    .rank {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: ${rankSize};
      line-height: 1;
      color: ${color};
      text-shadow: 0 0.02in 0 rgba(0,0,0,0.15);
      white-space: nowrap;
    }
  `;

  const bodyHtml = `
    <div id="card">
      <div class="watermark">${symbol}</div>
      <div class="corner top">${symbol}</div>
      <div class="rank">${number}</div>
      <div class="corner bottom">${symbol}</div>
    </div>`;

  return docShell(css, bodyHtml, "transparent");
}

// Colours for the card-back "cardstock" and its ink pattern. Change these
// to restyle the whole back design (e.g. swap to a deep blue for a more
// traditional look).
const BACK_STOCK_COLOR = "#7a1128"; // deep red cardstock
const BACK_INK_COLOR = "#e9d9b8"; // cream ink

function backCardHtml() {
  const css = `
    #card {
      position: relative;
      overflow: hidden;
      width: ${CARD_WIDTH};
      height: ${CARD_HEIGHT};
      border-radius: 5mm;
      background: ${BACK_STOCK_COLOR};
      box-shadow: 0 0.06in 0.12in rgba(0,0,0,0.35);
    }
    /* thin outer frame, like the edge printing on real card stock */
    .frame-outer {
      position: absolute;
      inset: 0.12in;
      border: 0.045in solid ${BACK_INK_COLOR};
      border-radius: 3mm;
    }
    /* inner frame filled with a criss-cross diamond lattice, the classic
       "Bicycle style" all-over back pattern */
    .frame-inner {
      position: absolute;
      inset: 0.2in;
      border: 0.02in solid ${BACK_INK_COLOR};
      border-radius: 2mm;
      background-color: ${BACK_STOCK_COLOR};
      background-image:
        repeating-linear-gradient(45deg, ${BACK_INK_COLOR}22 0, ${BACK_INK_COLOR}22 0.045in, transparent 0.045in, transparent 0.14in),
        repeating-linear-gradient(-45deg, ${BACK_INK_COLOR}22 0, ${BACK_INK_COLOR}22 0.045in, transparent 0.045in, transparent 0.14in);
    }
    /* central rosette/medallion, built from concentric rings, no text or
       emoji involved */
    .medallion {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 1.5in;
      height: 1.5in;
      border-radius: 50%;
      border: 0.035in solid ${BACK_INK_COLOR};
      background: repeating-radial-gradient(
        circle,
        ${BACK_INK_COLOR}e6 0,
        ${BACK_INK_COLOR}e6 0.018in,
        transparent 0.018in,
        transparent 0.11in
      );
    }
  `;

  const bodyHtml = `
    <div id="card">
      <div class="frame-outer"></div>
      <div class="frame-inner"></div>
      <div class="medallion"></div>
    </div>`;

  return docShell(css, bodyHtml, "transparent");
}

module.exports = {
  SUITS,
  NUMBERS,
  CARD_PX,
  frontCardHtml,
  backCardHtml,
};