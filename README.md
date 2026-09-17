# playing-card-generator (fork)

A generator for playing card emojis, intended for use in Discord. Fork of
[false-fox/playing-card-generator](https://github.com/false-fox/playing-card-generator).

## What's new in this fork

- **Animated flip GIFs** — `generate-flip-gifs.js` renders each of the 52
  cards as a small "flip" animation: card back → card face. The GIF loop
  count is a named constant (`GIF_LOOP_REPEAT`), currently **set to `-1`**
  (plays through once, then stops on the final frame — no looping) — see
  the comment above it in that file for exactly what that number means
  and how to change it.
- **Card back** — `templates.js` defines a shared back design that looks
  like an actual card back rather than an emoji: cream double border,
  diamond-lattice ink pattern, and a central ring medallion, all built
  from plain CSS (no glyph or text). It's used both for the standalone
  `card_back.png` and as the "closed" half of every flip GIF, so they
  always match. Colours live in `BACK_STOCK_COLOR` / `BACK_INK_COLOR` at
  the top of `templates.js` if you want to restyle it.
- **Refreshed visuals** — cards now have a large translucent suit
  watermark behind the rank, a drop shadow, and a serif typeface, in
  place of the old margin-hack corner layout.
- **CI workflow** — `.github/workflows/generate-cards.yml` regenerates
  every card + gif on every push to `main` (or manually via
  "Run workflow"), zips `cards/` and `gifs/` together, and publishes the
  zip as a GitHub Release.

## Layout