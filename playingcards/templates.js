// Fork additions, GPL 3.0 Licensed
// Shared visual language for the deck. Keeping the back design in ONE place
// (BACK_CSS / BACK_HTML) is what guarantees the standalone "card back" emoji
// and the back-face shown at the start of every flip GIF always match.

const CARD_W = "2.5in";
const CARD_H = "3.5in";
const RADIUS = "5mm";
const GOLD = "#d4af37";
const NAVY_DARK = "#142850";
const NAVY_LIGHT = "#1c3b6e";

// ---- shared page shell -----------------------------------------------
const BASE_CSS = `
  html, body { margin: 0; padding: 0; background: transparent; }
  * { box-sizing: border-box; }
`;

// ---- card BACK (single source of truth) --------------------------------
const BACK_CSS = `
  .back {
    width: ${CARD_W};
    height: ${CARD_H};
    border-radius: ${RADIUS};
    border: 3px solid ${GOLD};
    background-image:
      repeating-linear-gradient(45deg, ${NAVY_DARK}, ${NAVY_DARK} 8px, ${NAVY_LIGHT} 8px, ${NAVY_LIGHT} 16px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    position: relative;
  }
  .back .emblem {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.5in;
    height: 1.5in;
    border-radius: 50%;
    border: 3px solid ${GOLD};
    background: ${NAVY_DARK};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .back .emblem .pips {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0.05in;
    transform: rotate(45deg);
  }
  .back .emblem .pips span {
    display: block;
    font-size: 0.4in;
    color: ${GOLD};
    line-height: 1;
    transform: rotate(-45deg);
  }
`;

const BACK_HTML = `
  <div class="back">
    <div class="emblem">
      <div class="pips">
        <span>♠</span><span>♥️</span><span>♣</span><span>♦️</span>
      </div>
    </div>
  </div>
`;

// ---- card FRONT ----------------------------------------------------------
function frontCSS(color) {
  return `
  .front {
    width: ${CARD_W};
    height: ${CARD_H};
    border-radius: ${RADIUS};
    background: #ffffff;
    border: 2px solid #dcdcdc;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    position: relative;
    font-family: Georgia, 'Times New Roman', serif;
    color: ${color};
  }
  .front .corner {
    position: absolute;
    text-align: center;
    line-height: 1.05;
    font-weight: 700;
    font-size: 0.5in;
  }
  .front .corner.top { top: 0.14in; left: 0.16in; }
  .front .corner.bottom { bottom: 0.14in; right: 0.16in; transform: rotate(180deg); }
  .front .pip {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: 700;
    font-size: 2.5in;
  }
  .front .pip.ten { font-size: 1.9in; }
  `;
}

function frontHTML({ symbol, number }) {
  const pipClass = number === "10" ? "pip ten" : "pip";
  return `
  <div class="front">
    <div class="corner top">${number}<br/>${symbol}</div>
    <div class="pip ${pipClass}">${symbol}</div>
    <div class="corner bottom">${number}<br/>${symbol}</div>
  </div>
  `;
}

// ---- STATIC docs (used by generate-static.js) -----------------------------
function buildStaticFrontDoc({ symbol, number, color }) {
  return `<!DOCTYPE html><html><head><style>${BASE_CSS}${frontCSS(color)}</style></head>
  <body>${frontHTML({ symbol, number })}</body></html>`;
}

function buildStaticBackDoc() {
  return `<!DOCTYPE html><html><head><style>${BASE_CSS}${BACK_CSS}</style></head>
  <body>${BACK_HTML}</body></html>`;
}

// ---- FLIP doc (used by generate-animated.js) ------------------------------
// Flat 2D "squeeze" flip instead of a real 3D rotateY/backface-visibility
// flip: headless Chromium's software rasterizer handles that combo poorly
// (both faces can partially composite at once), which is what caused the
// mirrored front text and the green seam. Squeezing scaleX from 1 -> 0
// (back face), swapping which face is displayed at the invisible midpoint,
// then scaling 0 -> 1 (front face, never rotated so never mirrored) gives
// the same visual "flip" with only plain 2D transforms.
function buildFlipDoc({ symbol, number, color }) {
  return `<!DOCTYPE html><html><head><style>
    ${BASE_CSS}
    .stage { width: ${CARD_W}; height: ${CARD_H}; }
    .card {
      position: relative;
      width: 100%;
      height: 100%;
      transform-origin: center center;
    }
    .card .face { position: absolute; inset: 0; }
    ${BACK_CSS}
    ${frontCSS(color)}
  </style></head>
  <body>
    <div class="stage">
      <div class="card" id="card">
        <div class="face" id="backFace">${BACK_HTML}</div>
        <div class="face" id="frontFace" style="display:none;">${frontHTML({ symbol, number })}</div>
      </div>
    </div>
    <script>
      // p ranges 0 -> 1 across the whole flip.
      window.setFlipProgress = function (p) {
        var card = document.getElementById('card');
        var back = document.getElementById('backFace');
        var front = document.getElementById('frontFace');
        if (p < 0.5) {
          back.style.display = 'block';
          front.style.display = 'none';
          card.style.transform = 'scaleX(' + (1 - p / 0.5) + ')';
        } else {
          back.style.display = 'none';
          front.style.display = 'block';
          card.style.transform = 'scaleX(' + ((p - 0.5) / 0.5) + ')';
        }
      };
    </script>
  </body></html>`;
}

module.exports = {
  CARD_W,
  CARD_H,
  buildStaticFrontDoc,
  buildStaticBackDoc,
  buildFlipDoc,
};