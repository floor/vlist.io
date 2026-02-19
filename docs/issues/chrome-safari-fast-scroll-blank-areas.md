# Chrome/Safari Fast Scroll Blank Areas Issue

**Date:** February 2026  
**Status:** ✅ Fixed (temporary solution via wheel interception)  
**Severity:** Critical - systematic rendering failure on Chrome/Safari  
**Affects:** Lists with <350K items (non-compressed mode)

---

## Summary

When scrolling very fast with mouse wheel on Chrome/Safari, blank areas appear where items haven't rendered yet. The issue does NOT occur on Firefox, with scrollbar dragging, keyboard navigation, or smooth scrolling. This is a browser-specific race condition between native scroll position updates and JavaScript rendering.

---

## Symptoms

### What Happens
- User scrolls very fast with mouse wheel (up or down)
- Viewport shows blank/empty areas where list items should be
- Items eventually render after scrolling stops or slows down
- More pronounced on Chrome (systematic) than Chromium
- Also affects Safari (pretty bad)

### What Works Fine
✅ Firefox - **perfect**, no issues  
✅ Scrollbar dragging - works on all browsers  
✅ Keyboard navigation (Page Up/Down, arrows) - works on all browsers  
✅ Smooth scroll (programmatic) - works on all browsers  
✅ Touch/trackpad scrolling - works on all browsers  
✅ Lists with >350K items - works (uses compression mode)  

### What Fails
❌ Chrome - **systematic failure** with fast wheel scrolling  
❌ Safari - **pretty bad** with fast wheel scrolling  
❌ Chromium - less visible but still occurs  

---

## Root Cause Analysis

### Browser Differences

**Chrome/Safari (Chromium/WebKit):**
- Update scroll position **immediately** on wheel event
- Fire scroll event **after** position is updated
- JavaScript sees the new position but hasn't rendered yet
- Viewport displays un-rendered area = blank

**Firefox (Gecko):**
- Better synchronization between scroll events and rendering
- Possibly batches scroll events more aggressively
- Or waits for rendering before updating scroll position
- Result: No blank areas

### Why Compression Mode Works

Lists with >350K items automatically use `withScale` plugin which:
- Uses custom scrollbar (not native scrolling)
- Intercepts wheel events and handles them manually
- Renders **synchronously** before updating scroll position
- Has full control over timing

### Technical Details

The core issue is in how browsers handle this sequence:

```javascript
// Chrome/Safari:
1. User scrolls wheel
2. Browser updates scrollTop immediately (native behavior)
3. Browser fires 'scroll' event
4. JavaScript receives event, starts rendering
5. Viewport shows new scrollTop but items not rendered yet → BLANK
6. Rendering completes (too late)

// Firefox:
1. User scrolls wheel
2. Browser fires 'scroll' event (or batches it)
3. JavaScript renders
4. Browser updates scrollTop
5. Viewport shows rendered items → NO BLANK
```

---

## Attempted Solutions

### ❌ 1. Increase Overscan (Failed)

**Attempts:**
- Default overscan: 3 items
- Increased to: 5, 7, 15 items
- Result: **Still occurred** even with 15 items overscan

**Why it failed:**
- During very fast wheel scrolling, user can scroll past 20+ items between frames
- No static overscan value can keep up with arbitrary scroll speed
- Chrome/Safari update position faster than JavaScript can render

### ❌ 2. Dynamic Overscan Based on Velocity (Failed)

**Attempt:**
- Calculate scroll velocity in px/ms
- Predict items per frame
- Increase overscan dynamically

**Result:** Failed in testing, caused browser crashes

**Why it failed:**
- Scrollbar dragging caused huge velocity spikes (4M+ pixels in one frame)
- Rendered thousands of items at once (6000+ items)
- Violated RAF budget (169ms render time)
- Render range was behind visible range

### ❌ 3. RAF Throttling (Failed)

**Attempt:**
- Batch multiple scroll events into one render per frame
- Use `requestAnimationFrame` to throttle rendering

**Result:** Made the problem worse

**Why it failed:**
- Introduced 1-frame delay between scroll and render
- During that frame, user scrolled even further
- Blank areas were even more visible

### ❌ 4. Aggressive Rendering (Disaster)

**Attempt:**
- Skip RAF throttling for fast scrolling
- Render immediately on every scroll event

**Result:** Complete disaster, browser became unresponsive

**Why it failed:**
- Rendered on every scroll event (60+ per second)
- Overwhelmed the browser
- Created render thrashing

### ✅ 5. Fixed Range Calculation (Partial Fix)

**Change:**
```javascript
// Before (inaccurate)
let end = hc.indexAtOffset(scrollTop + containerHeight);
if (end < totalItems - 1) end++;  // Only +1 item

// After (accurate)
const visibleCount = countVisibleItems(hc, start, containerHeight, totalItems);
const end = start + visibleCount;
```

**Result:** Significantly improved but still occurred on Chrome/Safari

**Why it helped:**
- Used same accurate counting as compression mode
- Properly calculated visible items based on actual heights
- Aligned non-compressed and compressed behavior

**Why it wasn't enough:**
- Chrome/Safari still update scroll position before render completes
- Fundamental race condition remains

---

## Current Solution: Wheel Event Interception

### Implementation

Intercept wheel events on Chrome/Safari and handle scrolling manually:

```javascript
// Detect Chrome/Safari (not Firefox)
const isChromiumOrWebKit = /Chrome|Safari/.test(navigator.userAgent) && 
                           !/Firefox/.test(navigator.userAgent);

if (wheelEnabled && !isHorizontal && isChromiumOrWebKit) {
  wheelHandler = (event: WheelEvent): void => {
    event.preventDefault();  // Stop native scrolling
    
    // Calculate new scroll position
    const currentScroll = $.sgt();
    const newScroll = Math.max(0, Math.min(
      currentScroll + event.deltaY,
      $.hc.getTotalHeight() - $.ch
    ));
    
    // Update position manually
    $.sst(newScroll);
    
    // Render IMMEDIATELY (synchronous, no RAF)
    $.ls = newScroll;
    $.vt = updateVelocityTracker($.vt, newScroll);
    $.rfn();  // Synchronous render
    
    // Emit events
    emitter.emit("scroll", { scrollTop: newScroll, direction });
  };
  
  // Non-passive listener allows preventDefault
  dom.viewport.addEventListener("wheel", wheelHandler, { passive: false });
}
```

### Why It Works

1. **Prevents native scrolling** - `preventDefault()` stops browser from updating scroll
2. **Manual scroll control** - JavaScript updates scroll position
3. **Synchronous rendering** - Renders BEFORE scroll position changes
4. **Browser-specific** - Only activates on Chrome/Safari, Firefox uses native
5. **Selective** - Keyboard, scrollbar, touch still use native scrolling

### Results

✅ **Works perfectly** on Chrome/Safari  
✅ **Works perfectly** on Firefox (still uses native)  
✅ No blank areas during fast wheel scrolling  
✅ All other scroll methods unaffected  

---

## Accessibility Impact

### What's Preserved

✅ **Keyboard navigation** - Page Up/Down, arrows, Home/End (native)  
✅ **Screen readers** - Use keyboard/focus, not wheel events  
✅ **Scrollbar** - Still native, not intercepted  
✅ **Touch/trackpad** - Still native, no wheel events  
✅ **Find-in-page** - Uses keyboard/scrollbar  
✅ **Focus management** - Not affected  

### What's Changed

⚠️ **Mouse wheel** - Custom behavior on Chrome/Safari only

### WCAG 2.1 Compliance

- ✅ 2.1.1 Keyboard - Preserved
- ✅ 2.1.2 No Keyboard Trap - Not affected
- ✅ 2.4.3 Focus Order - Not affected
- ✅ 2.5.1 Pointer Gestures - Mouse wheel still scrolls
- ✅ 2.5.2 Pointer Cancellation - Not relevant

**Conclusion:** No accessibility violations. Mouse wheel is a convenience feature, not an accessibility requirement.

---

## Trade-offs

### Pros
- ✅ Eliminates blank areas completely
- ✅ Works on all browsers
- ✅ Minimal code added (~50 lines)
- ✅ No accessibility impact
- ✅ Preserves native scrolling where it works (Firefox)
- ✅ Selective intervention (only Chrome/Safari wheel)

### Cons
- ⚠️ Browser-specific code (user agent detection)
- ⚠️ Custom wheel behavior vs native
- ⚠️ Loses native wheel momentum/inertia (could be added)
- ⚠️ Architectural compromise (mixing native + custom)

---

## Alternative Solutions Considered

### Option A: Use Compression/Scale Plugin by Default

**Pros:**
- Proven solution (works for large lists)
- Consistent behavior across all list sizes
- No browser-specific hacks
- Full control over scrolling

**Cons:**
- Adds ~5-8 KB minified (~7-11% increase)
- Adds ~2-3 KB gzipped (~8-13% increase)
- More complex (custom scrollbar always)
- Might feel different from native

**Status:** Under consideration

### Option B: Keep Current Wheel Interception

**Pros:**
- Minimal code/bundle impact
- Works perfectly
- Preserves native scrolling where possible

**Cons:**
- Browser-specific hack
- User agent detection (fragile)

**Status:** Current solution

### Option C: Extract Wheel Handling from Scale Plugin

**Pros:**
- Lighter weight than full scale plugin
- More maintainable than browser detection

**Cons:**
- Code duplication
- Increased complexity

**Status:** Not pursued

---

## Recommendations

### Short-term (Current)
Keep the wheel interception solution - it works, has minimal impact, and preserves accessibility.

### Long-term (To Evaluate)
Consider making compression/scale plugin default behavior for consistency and maintainability. The bundle size increase (~2-3 KB gzipped) may be worth the architectural cleanliness.

### Monitoring
Track if user agent detection breaks with future browser updates. Consider feature detection instead of user agent strings.

---

## Related Issues

- [firefox-compressed-scroll-up.md](./firefox-compressed-scroll-up.md) - Firefox-specific compression scroll bug

---

## Files Modified

- `src/builder/core.ts` - Added wheel interception for Chrome/Safari
- `src/builder/range.ts` - Fixed `calcVisibleRange` to use accurate item counting

---

## Testing

### Reproduction Steps (Before Fix)
1. Open 100K items list example
2. Use Chrome or Safari browser
3. Scroll very fast with mouse wheel (up and down repeatedly)
4. Observe blank areas appearing

### Verification (After Fix)
1. Open 100K items list example
2. Test on Chrome, Safari, Firefox
3. Scroll as fast as possible with mouse wheel
4. Verify no blank areas appear
5. Test scrollbar, keyboard, smooth scroll still work
6. Test with screen reader (keyboard navigation)

### Browser Matrix

| Browser | Version | Fast Wheel | Scrollbar | Keyboard | Status |
|---------|---------|------------|-----------|----------|--------|
| Chrome | Latest | ✅ Fixed | ✅ Works | ✅ Works | Pass |
| Safari | Latest | ✅ Fixed | ✅ Works | ✅ Works | Pass |
| Firefox | Latest | ✅ Works | ✅ Works | ✅ Works | Pass |
| Edge | Latest | ✅ Fixed (Chromium) | ✅ Works | ✅ Works | Pass |

---

## Commits

- `fc37fda` - fix(range): use accurate visible item counting to prevent blank areas during fast scrolling
- `[pending]` - fix(core): add wheel interception for Chrome/Safari to prevent scroll race condition

---

**Last Updated:** February 20, 2026  
**Next Review:** After evaluating long-term solution (compression by default)