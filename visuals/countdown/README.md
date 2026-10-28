# Trick or Trace countdown

[Play or download the silent MP4](trick-or-trace-countdown.mp4).

1920 × 1080, H.264, 30 fps. The timer begins at 30 and ends on the first zero frame at 30 seconds (901 frames, 30.033 seconds total). There is no live handoff card or extra hold.

## Use on the livestream

Add the MP4 as a media source. Enable restart when the source becomes active and turn looping off. The repository version is silent, so you can pair it with audio you have permission to use. Privately licensed music and music-backed exports are not distributed with this sample.

## Edit with HyperFrames

From this directory:

```sh
npm run dev
```

The preview exposes the title, subtitle, and brand color as variables. `compositions/countdown-stage.html` contains the timer, artwork, and animation. Images and fonts are packaged in `assets/`.

```sh
npm run check
npm run render -- --quality delivery --output trick-or-trace-countdown.mp4
```

The project pins HyperFrames 0.8.208. Rendering uses Chromium and FFmpeg; the first run may download dependencies. GSAP is loaded from jsDelivr. The exported MP4 has no runtime dependencies.

See [sources](../SOURCES.md) for original Strands assets and font licenses. The spiderweb and spider are seasonal artwork. See `SPEC.md` for timing.
