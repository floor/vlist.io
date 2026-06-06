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
  "Mountain Sunrise", "Ocean Waves", "Forest Path", "Desert Dunes",
  "City Lights", "Autumn Leaves", "Snowy Peaks", "Coastal Cliffs",
  "Golden Fields", "Misty Valley", "Urban Skyline", "Lakeside View",
  "Tropical Beach", "Alpine Meadow", "River Bend", "Night Sky",
  "Volcanic Shore", "Pine Forest", "Canyon Depths", "Flower Garden",
  "Bamboo Grove", "Northern Lights", "Rolling Hills", "Coral Reef",
];

const LOCATIONS = [
  "Patagonia", "Big Sur", "Black Forest", "Sahara",
  "Tokyo", "Vermont", "Swiss Alps", "Amalfi Coast",
  "Tuscany", "Yosemite", "Hong Kong", "Lake Como",
  "Maldives", "Dolomites", "Colorado", "Iceland",
  "Hawaii", "Redwood", "Grand Canyon", "Provence",
  "Kyoto", "Tromsø", "New Zealand", "Great Barrier Reef",
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
