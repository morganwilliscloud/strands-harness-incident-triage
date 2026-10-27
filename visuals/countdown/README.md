# Trick or Trace countdown

[Play or download the MP4](trick-or-trace-countdown.mp4).

1920 × 1080, H.264, 30 fps, 33 seconds. Silent. The timer shows 30 at the start, decrements once per second, shows zero at 30 seconds, and switches to a “We’re live” handoff at 30.5 seconds.

## Use on the livestream

Add the MP4 as a media source in your broadcast software. Enable restart when the source becomes active and turn looping off. The silent video can run over your existing music.

## Edit with HyperFrames

From this directory:

```sh
npm run dev
```

The browser preview exposes the title, subtitle and brand color as variables. `compositions/countdown-stage.html` contains the timer, decorative artwork and GSAP motion. Every number is an editable, one-second clip. Images and fonts are packaged in `assets/`.

```sh
npm run check
npm run render -- --quality delivery --output trick-or-trace-countdown.mp4
```

The project pins HyperFrames 0.8.208. The CLI renders locally using Chromium and FFmpeg; the first run may download its dependencies. The GSAP script is loaded from jsDelivr. The exported MP4 has no runtime dependencies.

The original Strands assets and font licenses come from the adjacent visual kit; see [sources](../SOURCES.md). The spiderweb and spider are seasonal SVG artwork. See `SPEC.md` for timing and `REVIEW.md` for validation.
