# Countdown specification

GOAL: Make the remaining wait immediately readable, then hand over to the live show.
OUTPUT: HyperFrames, 1920 × 1080, 30 fps, H.264 MP4.
TIME: 901 frames at 30 fps (30.033333 seconds). At t=0 show 30; t=1 show 29; t=29 show 1; the last frame at t=30 shows 0, then the video ends.
LOOK: Black #000000 with sparse green halftone matching the existing suite; Strands green #00cc60 for the digits, white title with “Trace” in Strands pink #ff70eb, white ghost, orange pumpkin. JetBrains Mono 600, 300 px digits, 76 px show title, 48 px subtitle text. Brand logo retained intact at 400 × 58 px, centered at the top. Subtitle: “Build an AWS incident triage agent with Strands harness”. Body font Space Grotesk.
OBJECTS: One central timer; 30 discrete progress marks, each represents one second; wizard frog lower left; two corner spiderwebs and one dangling pixel spider; ghost right; pumpkin lower right.
MOTION: Digits change at exact second boundaries with a 0.2 s, 4% scale settle. Webs fade in over 0.8 s at the edge, never cover digits. Spider drifts vertically by 80 px in 6 s with sine easing; frog hops 18 px every 5 s. Ghost drifts 24 px in 4 s. Last three seconds receive a slightly stronger settle. Live title appears in 0.3 s; no white flashes.
SHOTS: One continuous countdown composition. End on zero without a live handoff card.
BANNED: Footer/date banners, all-caps HARNESS, fake AWS dashboard, rapid flicker, tiny countdown, long intro before 30 appears. Black ground and top-left logo are intentional continuity with the approved Strands assets.
QA: Check 0, 1, 10, 20, 27, 28, 29 and 30 seconds. Verify zero on the last decoded MP4 frame and 901 total frames.

AUDIO: Silent repository export. Supply separately licensed music in the broadcasting software if needed.
