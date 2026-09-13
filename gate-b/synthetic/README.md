# RFC-014 synthetic touch experiment

Standalone candidate B. **Not shipped vlist code and not a v3-default decision.**
Canonical design: [RFC-014](../../docs/rfcs/RFC-014-Scroll-Input-Model.md).

## Run

From `vlist.io`, use the existing development server and open
`http://localhost:3338/gate-b/synthetic/` (or your configured port).
Alternatively serve only the experiment: `python3 -m http.server 3347 --directory gate-b`;
open `http://localhost:3347/synthetic/`. The existing A comparison is then `/`.
No build or dependencies are needed by either test page. Use `?axis=x` for horizontal.

For a phone on the same trusted network, bind the server to the host's LAN interface
and replace localhost with that host address. No deployment is required. The browser
must support Pointer Events. Check that the intended server and port are reachable.

## Contract and limitations

- One million fixed-size items, viewport-sized main-axis content and pooled rows.
- Vertical synthetic motion + native horizontal overflow/header sync, or horizontal
  synthetic motion + native vertical overflow. This simulates a table integration
  seam; it is not the real table plugin.
- CSS permits cross-axis panning and pinch zoom. Physical-device behavior remains
  to be checked, especially diagonal intent and second-finger interruption.
- Same-axis touch **never chains to the parent** from inside the list, even at an
  initial boundary. Swipe outside the list to scroll the page. This deliberate
  prototype limitation has not been accepted for production.
- Interactive descendants don't start list drags. General rows do. After a drag,
  pointer-generated clicks are suppressed briefly; keyboard clicks are preserved.
- A single motion owner handles touch, inertia and smooth navigation. New input,
  cancellation, resize, blur/background and long frame pauses stop prior motion.
- Reduced motion disables inertia and smooth interpolation (evaluated at load).
- The position slider is a native test control, not production scrollbar work.
- No variable-size, autosize, groups, carousel or sortable integration is claimed.

## Automated verification

`bun test test/gate-b-synthetic.test.mjs` — deterministic motion contracts.

`bun scripts/debug/tests/synthetic-touch.mjs --base=http://localhost:3347/synthetic/`
— real Chromium smoke checks with emulated touch input. Default base is
`http://localhost:3338/gate-b/synthetic/`. Needs installed Chrome and project deps.
This validates browser event wiring and geometry, **not physical feel or native
pinch/parent gesture certification**. Screenshot goes to `/tmp/rfc-014-synthetic.png`.

Results recorded 2026-09-10:

- `bun test test/gate-b-synthetic.test.mjs`: **12 pass, 0 fail**, 33 assertions.
- Chrome **152.0.7977.83**, headless mobile viewport 430×932 with touch emulation:
  **both axes pass** touch advancement, pointer cancellation, native cross-axis
  pan, vertical header sync, First/Middle/Last, keyboard, resize, actual DOM
  coverage, bounded node count, smooth interruption and second-finger cancellation.
  Reduced-motion navigation passes; no browser runtime errors.
- The harness uses separate pages per axis to isolate Chrome's emulated gesture
  recognizer state after the multitouch scenario. It does not certify cross-page
  touch behavior, native pinch feel, or actual hardware.
- `bun run typecheck` in vlist.io and JavaScript syntax checks: **pass**.
- Mobile layout screenshot reviewed at `/tmp/rfc-014-synthetic.png`.

Physical-device feedback received **2026-09-11**: the user tested the deployed
synthetic experiment on both **iOS and Android** and reported that it “works
beautifully.” This is positive qualitative device feedback on candidate B, separate
from the automated results above; it does not close the Input gate. Device models, browser/OS versions, per-scenario
outcomes and JSON exports were not supplied; the individual matrix entries below
remain unrecorded rather than being inferred as passed. Production integration and
the v3-default decision remain separate gates.

## Device protocol

On each device, record hardware, OS, browser/version, axis, motion preference,
input and page zoom. Start fresh, reset counters and use the notes field. Download
JSON after each scenario; attach observations separately from counters.

| Scenario | Expected B behavior | iPhone / Safari | Android / Chrome |
|---|---|---|---|
| Slow drag + reverse | Correct direction, no jump; release follows recent direction | pending | pending |
| Fast/repeated flings, catch | Smooth decay; finger catch cancels inertia immediately | pending | pending |
| Start/arrive at list bounds | Hard stop, no same-axis parent handoff; judge acceptability | pending | pending |
| Page-margin gesture | Parent page scrolls normally | pending | pending |
| Native cross-axis + diagonal | Native overflow works; header stays aligned; no synthetic drift | pending | pending |
| Pinch / second finger | Browser zoom permitted; synthetic stops until all fingers lift | pending | pending |
| Link tap vs row drag | Link tap works; dragging doesn't activate a link | pending | pending |
| Smooth jump interrupted | Touch, slider, keyboard and wheel stop old animation | pending | pending |
| Resize, background, return | Position clamped; no stale fling resumes | pending | pending |
| Reduced motion | No release inertia or smooth interpolation | pending | pending |
| Low-end device / load | Frame gaps and perceived startup lag recorded | pending | pending |

Run the same relevant scenarios in A. A's telemetry differs: no native writes during
momentum and no *artificial runway* edge hits. B's boundary contacts are expected at
true logical list edges; they are not runway exhaustion.

## Interpreting telemetry

- Native main offset should stay 0 and scroll extent equal viewport extent.
  No main-axis scroll writes are present in the candidate; unexpected native scroll
  events expose browser focus/reveal or geometry interactions. Cross-axis reads
  are intentional and counted separately.
- Render coverage is a numerical range invariant. The smoke script also checks DOM
  bounds. Neither proves absence of physical-device paint/compositor flashes.
- Active frame gaps count rAF intervals over 32ms while tracking/animating. They
  measure scheduling, not precise input-to-photon latency.
- Events contain a bounded recent trace, not an exhaustive recording. Reset before
  short scenarios. Exported `physicalDeviceSignoff: pending` is intentionally not
  auto-promoted by counters; the decision record is filled by an actual tester.
