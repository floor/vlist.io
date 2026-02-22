# Page Feature

> Document-level scrolling - use the browser's native scrollbar instead of container scrolling.

## Overview

The `withPage()` feature enables **page-level scrolling** where the list participates in the document flow instead of scrolling within a container. Perfect for blog posts, infinite scroll feeds, and full-page lists.

**Import:**
```typescript
import { vlist, withPage } from 'vlist';
```

**Bundle cost:** +0.9 KB gzipped

## Quick Start

```typescript
import { vlist, withPage } from 'vlist';

const feed = vlist({
  container: '#feed',
  items: articles,
  item: {
    height: 300,
    template: (article) => `
      <article>
        <h2>${article.title}</h2>
        <p>${article.excerpt}</p>
      </article>
    `,
  },
})
  .use(withPage())
  .build();
```

The list now scrolls with the page, using the browser's native scrollbar.

## Configuration

**No configuration needed:**

```typescript
withPage()  // That's it!
```

The feature automatically:
- ✅ Changes scroll element from container to `window`
- ✅ Uses document scroll position
- ✅ Adjusts viewport calculations for page-level scrolling
- ✅ Handles window resize events

## Use Cases

### Blog Posts / Articles

```typescript
import { vlist, withPage } from 'vlist';

const blog = vlist({
  container: '#articles',
  items: posts,
  item: {
    height: 400,  // Approximate article preview height
    template: (post) => `
      <article class="post">
        <h1>${post.title}</h1>
        <time>${post.date}</time>
        <div class="content">${post.excerpt}</div>
        <a href="/posts/${post.slug}">Read more →</a>
      </article>
    `,
  },
})
  .use(withPage())
  .build();
```

### Infinite Scroll Feed

```typescript
import { vlist, withPage, withAsync } from 'vlist';

const feed = vlist({
  container: '#feed',
  item: {
    height: 250,
    template: (item) => {
      if (!item) return `<div class="skeleton">Loading...</div>`;
      return `<div class="card">${item.content}</div>`;
    },
  },
})
  .use(withPage())
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/feed?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
  }))
  .build();
```

Combines page scrolling with lazy loading for infinite scroll.

### Product Listings

```typescript
import { vlist, withPage } from 'vlist';

const products = vlist({
  container: '#products',
  items: productList,
  item: {
    height: 350,
    template: (product) => `
      <div class="product-card">
        <img src="${product.image}" />
        <h3>${product.name}</h3>
        <p class="price">$${product.price}</p>
        <button>Add to Cart</button>
      </div>
    `,
  },
})
  .use(withPage())
  .build();
```

### Search Results

```typescript
import { vlist, withPage } from 'vlist';

const results = vlist({
  container: '#results',
  items: searchResults,
  item: {
    height: 120,
    template: (result) => `
      <div class="result">
        <a href="${result.url}">${result.title}</a>
        <p>${result.snippet}</p>
        <cite>${result.domain}</cite>
      </div>
    `,
  },
})
  .use(withPage())
  .build();
```

## How It Works

### Without `withPage()` (Default)

```html
<div id="list" style="height: 600px; overflow: auto;">
  <!-- List scrolls within this container -->
  <!-- Container has scrollbar -->
</div>
```

Scrollbar appears on the container. List has fixed height.

### With `withPage()`

```html
<div id="list" style="overflow: visible; height: auto;">
  <!-- List participates in page flow -->
  <!-- Document scrollbar controls scrolling -->
</div>
```

Scrollbar appears on the page. List height is dynamic based on content.

### Technical Details

The feature modifies:

1. **Scroll element:** `window` instead of container
2. **Scroll position:** `window.scrollY` instead of `container.scrollTop`
3. **Viewport height:** `window.innerHeight` instead of `container.clientHeight`
4. **Position calculations:** Relative to document, not container
5. **Resize handling:** Listens to `window` resize instead of container resize

## Compatibility

### ✅ Compatible With

- `withAsync()` - Infinite scroll feeds
- `withSelection()` - Selectable full-page lists
- `withScale()` - Large page-level datasets
- `reverse: true` - Reverse mode with page scroll

### ❌ Incompatible With

- `withScrollbar()` - Page uses native browser scrollbar
- `orientation: 'horizontal'` - Page scroll is vertical only
- `withGrid()` in some cases - Grid works but may need careful styling

**Note:** The builder will throw an error if you try to combine `withPage()` with `withScrollbar()`.

## Styling Considerations

### Container Styling

With page scrolling, the container doesn't need a fixed height:

```css
#feed {
  /* No height or overflow needed */
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
```

### Full-Height Items

For full-viewport items (like slides), use viewport units:

```typescript
const slides = vlist({
  container: '#slides',
  items: slideData,
  item: {
    height: () => window.innerHeight,  // Full viewport height
    template: (slide) => `<section class="slide">...</section>`,
  },
})
  .use(withPage())
  .build();

// Re-calculate on resize
window.addEventListener('resize', () => {
  slides.destroy();
  // Recreate with new heights
});
```

### Scroll Behavior

The native page scrollbar provides:
- ✅ Familiar scroll behavior for users
- ✅ Browser-native momentum scrolling
- ✅ Scroll position in browser history
- ✅ No custom scrollbar styling needed

## API

The `withPage()` feature doesn't add any new methods. All standard VList methods work:

```typescript
const list = vlist({ ... })
  .use(withPage())
  .build();

// All standard methods work
list.scrollToIndex(50);
list.scrollToItem('article-5');
list.getScrollPosition();
list.setItems(newArticles);
```

## Events

All standard events work with page scrolling:

```typescript
list.on('scroll', ({ scrollPosition, direction }) => {
  console.log('Page scrolled to:', scrollPosition);
});

list.on('range:change', ({ range }) => {
  console.log('Visible items:', range);
});

list.on('item:click', ({ item, index }) => {
  console.log('Clicked:', item);
});
```

## Performance

### Benefits

- ✅ **Browser-optimized** - Native scroll handling
- ✅ **No custom scrollbar** - One less thing to render
- ✅ **Familiar UX** - Users expect page scroll behavior
- ✅ **History integration** - Scroll position in browser history

### Considerations

- Browser scrollbar appearance varies by OS
- Less control over scroll behavior than container scrolling
- Can't combine with custom scrollbar styling

## Examples

See these interactive examples at [vlist.dev/examples](/examples/):

- **[Window Scroll](/examples/window-scroll/)** - Infinite scroll with page-level scrolling

## Best Practices

### When to Use `withPage()`

✅ **Use for:**
- Blog posts and articles
- Infinite scroll feeds
- Product listings
- Search results
- Full-page content

✅ **Don't use for:**
- Contained lists within a page section (use default container scroll)
- When you need custom scrollbar styling (use `withScrollbar()`)
- Horizontal scrolling (page scroll is vertical only)
- Multiple lists on same page (only one can use page scroll)

### Combining with Async Loading

```typescript
import { vlist, withPage, withAsync } from 'vlist';

const feed = vlist({
  container: '#feed',
  item: {
    height: 300,
    template: renderPost,
  },
})
  .use(withPage())
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
    loading: {
      cancelThreshold: 15,  // Skip loads when scrolling fast
    },
  }))
  .build();

// Events
list.on('load:start', () => showLoadingIndicator());
list.on('load:end', () => hideLoadingIndicator());
```

### SEO Considerations

For better SEO with infinite scroll:

1. Render initial items server-side
2. Use `withPage()` + `withAsync()` for progressive loading
3. Consider implementing "Load More" button as fallback
4. Update page URL as user scrolls through content

## Troubleshooting

### List doesn't scroll

**Problem:** Container has `height: 600px` set in CSS

**Solution:** Remove fixed height from container
```css
/* ❌ Don't */
#list { height: 600px; overflow: auto; }

/* ✅ Do */
#list { /* No height needed */ }
```

### Scroll position jumps on data load

**Problem:** Items have variable heights but you're using fixed height

**Solution:** Use variable height function or measure items first

### Multiple lists on same page

**Problem:** Only one list can use `withPage()`

**Solution:** Use page scroll for main list, container scroll for others

## See Also

- **[Features Overview](./README.md)** - All available features
- **[Async Feature](./async.md)** - Combine for infinite scroll
- **[Scrollbar Feature](./scrollbar.md)** - Alternative: custom scrollbar
- **[Builder Pattern](/tutorials/builder-pattern)** - How to compose features
- **[Examples](/examples/)** - Interactive examples

---

**Bundle cost:** +0.9 KB gzipped  
**Priority:** 10 (runs first - modifies scroll element)  
**Conflicts:** Cannot combine with `withScrollbar()`
