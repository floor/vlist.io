// Carousel — Shared data, constants, and template
// MD3-aligned carousel demo using real photos from Picsum

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 24;

// Valid Picsum IDs — curated for visual quality (landscapes, architecture, nature)
const PHOTO_IDS = [
  29, 37, 39, 42, 47, 49, 55, 58, 59, 65,
  67, 69, 74, 82, 84, 100, 103, 106, 110, 119,
  122, 129, 134, 137,
];

const TITLES = [
  "Himalayan Peaks", "Coastal Bluffs", "Vinyl Groove", "Morning Coffee",
  "Ocean Pier", "Santorini Village", "New Growth", "Stone Lighthouse",
  "Prairie Fence", "Golden Hour", "Rolling Hills", "Railway Lines",
  "Bay Crossing", "Cherry Blossoms", "Bridge at Night", "Hazy Beach",
  "Park Afternoon", "Frangipani Blooms", "Pastoral Sunset", "Minimal Desk",
  "Millennium Bridge", "Golden Gate View", "Fort Point", "Tunnel Light",
];

const LOCATIONS = [
  "Nepal", "Maine", "Studio", "Portland",
  "California", "Greece", "Lakeside", "New England",
  "Midwest", "Countryside", "Carpathians", "Eastern Europe",
  "San Francisco", "Spring", "New York", "Santa Monica",
  "Atlanta", "Hawaii", "Netherlands", "Studio",
  "London", "San Francisco", "San Francisco", "Underground",
];

// =============================================================================
// Data
// =============================================================================

export const items = Array.from({ length: ITEM_COUNT }, (_, i) => ({
  id: i + 1,
  picId: PHOTO_IDS[i % PHOTO_IDS.length],
  title: TITLES[i % TITLES.length],
  location: LOCATIONS[i % LOCATIONS.length],
  index: i,
}));

// =============================================================================
// Image URLs
// =============================================================================

export function getImageUrl(picId, width, height) {
  return `https://picsum.photos/id/${picId}/${width}/${height}`;
}
