# Comparison Benchmark

This benchmark compares **vlist** against **react-window** side-by-side to help users make informed decisions based on real performance data.

## What It Tests

### 1. **Initial Render Time**
- Time to create the list and paint the first frame
- Measures median time across 5 iterations
- Lower is better

### 2. **Memory Usage**
- JS heap size after rendering (Chrome only)
- Measures actual memory footprint
- Lower is better

### 3. **Scroll Performance**
- Sustained scroll FPS over 5 seconds
- Measures frame consistency (P95 frame time)
- Higher FPS is better, lower frame time is better

## Why This Comparison?

**react-window** is one of the most popular virtual list libraries with:
- 4M+ weekly downloads
- Mature, battle-tested codebase
- Focused on doing one thing well

Comparing against react-window provides:
- **Real-world context** - not just synthetic benchmarks
- **Fair comparison** - both libraries are production-ready
- **Decision-making data** - helps users choose the right tool

## Key Differences

| Feature | vlist | react-window |
|---------|-------|--------------|
| **Framework** | Agnostic | React only |
| **Dependencies** | Zero | Zero |
| **Bundle Size** | 6-23 KB gzipped | 6.5 KB gzipped |
| **Tree-shakeable** | ✅ Yes | ❌ No |
| **Grid Layout** | ✅ Yes | ✅ Yes |
| **Async Loading** | ✅ Built-in | ❌ Manual |
| **Sections/Groups** | ✅ With sticky headers | ❌ No |
| **Selection** | ✅ Built-in | ❌ No |
| **Custom Scrollbar** | ✅ Yes | ❌ No |
| **Scale to Millions** | ✅ Auto compression | ✅ Yes |

## How It Works

### Testing Process

1. **Prepare Environment**
   - Generate test items
   - Clear memory with GC
   - Measure baseline

2. **Test vlist**
   - Render 5 times, measure median
   - Calculate memory footprint
   - Scroll for 5 seconds, measure FPS

3. **Test react-window**
   - Same test process
   - Same item count
   - Same container dimensions

4. **Compare Results**
   - Side-by-side metrics
   - Percentage differences
   - Winner indicators

### Fair Testing

Both libraries:
- Use the same container size (600px height)
- Render identical content (simple divs with index)
- Use the same item height (48px)
- Test with the same item counts (10K, 100K, 1M)
- Scroll at the same speed (100px/frame)

## Interpreting Results

### Render Time
- **< 30ms**: Excellent, imperceptible to users
- **30-50ms**: Good, smooth enough
- **> 50ms**: May feel sluggish on slower devices

### Memory Usage
- **< 30 MB**: Excellent, very efficient
- **30-50 MB**: Good, acceptable
- **> 50 MB**: May cause issues on low-memory devices

### Scroll FPS
- **> 55 FPS**: Excellent, buttery smooth
- **50-55 FPS**: Good, smooth enough
- **< 50 FPS**: May show visible jank

### P95 Frame Time
- **< 20ms**: Excellent, consistent 60 FPS
- **20-30ms**: Good, mostly smooth
- **> 30ms**: Poor, visible stuttering

## Expected Results

Based on typical test runs:

### 100K Items
- **Render**: vlist and react-window are comparable (~10-20ms)
- **Memory**: vlist uses slightly more (~10-20% due to extra features)
- **Scroll**: Both maintain 60 FPS easily

### 1M Items
- **Render**: vlist slightly slower (~30-40ms vs 20-30ms) due to compression setup
- **Memory**: vlist more efficient (~39 MB vs 45-60 MB) due to compression
- **Scroll**: Both maintain 55+ FPS with compression

## Limitations

### What This Doesn't Test

- **Complex templates** - Only tests simple divs
- **Variable heights** - Fixed height only
- **Real-world usage** - No user interactions
- **Production builds** - Uses development mode
- **Mobile devices** - Desktop browser only

### Why These Limitations?

We focus on **core virtual scrolling performance** to:
- Keep tests fast and repeatable
- Isolate library overhead
- Provide apples-to-apples comparisons

Real-world performance depends on:
- Template complexity
- React/framework overhead
- Application-specific code
- User device capabilities

## Running Locally

```bash
# From vlist.dev root
bun install
bun run benchmarks/build.ts

# Start dev server
bun run server.ts

# Open browser
open http://localhost:3338/benchmarks/comparison
```

## Notes

- **Chrome only**: Memory measurements require Chrome's `performance.memory` API
- **React required**: react-window tests need React/ReactDOM loaded from CDN
- **No server required**: All tests run in the browser
- **Deterministic**: Same results on the same hardware (± variance)

## Interpreting Differences

### When vlist is faster
- Usually due to optimized rendering pipeline
- May vary by item count and browser

### When react-window is faster
- Often on initial render with small item counts
- React-window is highly optimized for its use case

### When they're similar
- Both are excellent virtual scroll implementations
- Differences often within margin of error

## Key Takeaway

**Both libraries are excellent choices!**

Choose based on:
- **vlist**: Framework-agnostic, full-featured, tree-shakeable
- **react-window**: React-focused, minimal, battle-tested

Performance differences are usually negligible in real-world usage. Pick the one that fits your stack and feature needs!