// Carousel — Curated photo sets by variant
// Each variant uses a unique set of photos from Lorem Picsum with
// hand-written titles and locations matching the actual photo content.

import { PHOTOS, getPhotoUrl } from "./lorem-picsum.js";

// =============================================================================
// Photo lookup
// =============================================================================

const PHOTO_MAP = new Map(PHOTOS.map((p) => [p.id, p]));

// =============================================================================
// Per-variant curated photo sets
// { id, title, location } — id references PHOTOS[].id from lorem-picsum.js
// =============================================================================

const SETS = {
  hero: [
    { id: 29, title: "Himalayan Peaks", location: "Nepal" },
    { id: 37, title: "Coastal Bluffs", location: "Maine" },
    { id: 39, title: "Vinyl Groove", location: "Studio" },
    { id: 42, title: "Morning Coffee", location: "Portland" },
    { id: 47, title: "Ocean Pier", location: "California" },
    { id: 49, title: "Santorini Village", location: "Greece" },
    { id: 55, title: "New Growth", location: "Lakeside" },
    { id: 58, title: "Stone Lighthouse", location: "New England" },
    { id: 59, title: "Prairie Fence", location: "Midwest" },
    { id: 65, title: "Golden Hour", location: "Countryside" },
    { id: 67, title: "Rolling Hills", location: "Carpathians" },
    { id: 69, title: "Railway Lines", location: "Eastern Europe" },
    { id: 74, title: "Bay Crossing", location: "San Francisco" },
    { id: 82, title: "Cherry Blossoms", location: "Spring" },
    { id: 84, title: "Bridge at Night", location: "New York" },
    { id: 100, title: "Hazy Beach", location: "Santa Monica" },
    { id: 103, title: "Park Afternoon", location: "Atlanta" },
    { id: 106, title: "Frangipani Blooms", location: "Hawaii" },
    { id: 110, title: "Pastoral Sunset", location: "Netherlands" },
    { id: 119, title: "Minimal Desk", location: "Studio" },
    { id: 122, title: "Millennium Bridge", location: "London" },
    { id: 129, title: "Golden Gate View", location: "San Francisco" },
    { id: 134, title: "Fort Point", location: "San Francisco" },
    { id: 137, title: "Tunnel Light", location: "Underground" },
  ],

  "hero-center": [
    { id: 10, title: "Island Treeline", location: "Pacific Northwest" },
    { id: 51, title: "Storm Approaching", location: "North Sea" },
    { id: 62, title: "Tuscan Sunrise", location: "Tuscany" },
    { id: 132, title: "Frozen Road", location: "Eastern Europe" },
    { id: 271, title: "Bosphorus Ferry", location: "Istanbul" },
    { id: 278, title: "Mountain Tunnel", location: "New Zealand" },
    { id: 281, title: "Skatepark Kickflip", location: "Venice Beach" },
    { id: 314, title: "Desert Highway", location: "Death Valley" },
    { id: 338, title: "Solitude", location: "Baltic Sea" },
    { id: 356, title: "Lone Surfer", location: "Oregon" },
    { id: 412, title: "Boreal Lake", location: "Quebec" },
    { id: 506, title: "Gullfoss Falls", location: "Iceland" },
    { id: 544, title: "Misty Mountains", location: "Appalachia" },
    { id: 629, title: "Leaning Tower", location: "Pisa" },
    { id: 649, title: "Dry Grass", location: "California" },
    { id: 670, title: "Red Tram", location: "Istanbul" },
    { id: 674, title: "Harvest Grapes", location: "Vineyard" },
    { id: 703, title: "City Rainbow", location: "New York" },
    { id: 811, title: "Forest Canopy", location: "Amazon" },
    { id: 876, title: "Cloud Forest", location: "Black Forest" },
    { id: 882, title: "Café Terrace", location: "Lisbon" },
    { id: 891, title: "Antler Still Life", location: "Studio" },
    { id: 912, title: "Deep Blue", location: "Atlantic" },
    { id: 984, title: "Highland Drama", location: "Scotland" },
  ],

  full: [
    { id: 9, title: "Workspace", location: "Studio" },
    { id: 46, title: "Rolling Foothills", location: "California" },
    { id: 115, title: "Rain Drops", location: "Studio" },
    { id: 160, title: "Phone Glow", location: "Studio" },
    { id: 212, title: "Bicycle Rack", location: "Kraków" },
    { id: 318, title: "Eiffel Tower", location: "Paris" },
    { id: 330, title: "Tree Stump", location: "Countryside" },
    { id: 365, title: "Morning Tea", location: "Home" },
    { id: 387, title: "Open Field", location: "Midwest" },
    { id: 457, title: "Ships in Fog", location: "Bosphorus" },
    { id: 474, title: "Loch Road", location: "Scotland" },
    { id: 511, title: "Moss Canyon", location: "Iceland" },
    { id: 559, title: "Snowy Path", location: "Minnesota" },
    { id: 560, title: "Forest Trail", location: "Scandinavia" },
    { id: 565, title: "Alpine Birds", location: "Patagonia" },
    { id: 656, title: "Desert Wanderer", location: "Lanzarote" },
    { id: 730, title: "Snowy Pines", location: "Alps" },
    { id: 770, title: "Summit Leap", location: "Cape Town" },
    { id: 836, title: "Record Shop", location: "Nashville" },
    { id: 839, title: "Evening Ride", location: "Colorado" },
    { id: 862, title: "Manhattan Skyline", location: "New York" },
    { id: 959, title: "Fireworks", location: "New Year" },
    { id: 1031, title: "Glass Tower", location: "Chicago" },
    { id: 1056, title: "Salt Flat Mirror", location: "Bolivia" },
  ],

  multi: [
    { id: 68, title: "Harbor Pier", location: "Australia" },
    { id: 120, title: "Milky Way Fence", location: "Wyoming" },
    { id: 141, title: "Golden Hills", location: "California" },
    { id: 191, title: "Alpine Pass", location: "Swiss Alps" },
    { id: 268, title: "Beach Chair", location: "North Sea" },
    { id: 403, title: "Old Typewriter", location: "Antique Shop" },
    { id: 407, title: "Sparkler Night", location: "Celebration" },
    { id: 427, title: "Palm Silhouettes", location: "Egypt" },
    { id: 429, title: "Fresh Raspberries", location: "Kitchen" },
    { id: 475, title: "Volcano in Mist", location: "Iceland" },
    { id: 585, title: "Mountain Stadium", location: "Utah" },
    { id: 621, title: "Under the Bridge", location: "Brisbane" },
    { id: 630, title: "Sun Through Pines", location: "Dolomites" },
    { id: 685, title: "Above the Clouds", location: "Summit" },
    { id: 731, title: "Cliff Eagle", location: "Canary Islands" },
    { id: 766, title: "Coffee Beans", location: "Roastery" },
    { id: 790, title: "Red Deer Stag", location: "Richmond Park" },
    { id: 803, title: "Tropical Moss", location: "Greenhouse" },
    { id: 809, title: "Peak in Clouds", location: "Huangshan" },
    { id: 832, title: "Quiet Reading", location: "Vietnam" },
    { id: 885, title: "Writer's Desk", location: "Studio" },
    { id: 945, title: "Fire Escapes", location: "New York" },
    { id: 1037, title: "Half Dome Sunrise", location: "Yosemite" },
    { id: 1076, title: "Steel Geometry", location: "Tokyo" },
  ],

  uncontained: [
    { id: 8, title: "Laptop & Coffee", location: "Studio" },
    { id: 27, title: "Watching Waves", location: "California" },
    { id: 34, title: "Rusty Barrel", location: "Countryside" },
    { id: 36, title: "Camera Parts", location: "Workshop" },
    { id: 73, title: "Baseball Glove", location: "Dugout" },
    { id: 76, title: "Green Bicycle", location: "Vermont" },
    { id: 185, title: "Sand Dunes", location: "Sahara" },
    { id: 247, title: "Red Rock", location: "Australia" },
    { id: 296, title: "Snow Peaks", location: "Rockies" },
    { id: 307, title: "Wood Grain", location: "Studio" },
    { id: 348, title: "Tube Station", location: "London" },
    { id: 392, title: "Golden Gate", location: "San Francisco" },
    { id: 453, title: "Stage Light", location: "Concert" },
    { id: 588, title: "Sunset Jetty", location: "Maldives" },
    { id: 757, title: "Classic Interior", location: "Route 66" },
    { id: 784, title: "Morning Dew", location: "Meadow" },
    { id: 815, title: "Heart Hands", location: "Sunset" },
    { id: 869, title: "Starry Mountains", location: "Norway" },
    { id: 892, title: "Rusty Plymouth", location: "Junkyard" },
    { id: 926, title: "Walking in Fog", location: "Highlands" },
    { id: 958, title: "Succulents", location: "Greenhouse" },
    { id: 1021, title: "Misty Canopy", location: "Oregon" },
    { id: 1033, title: "Escalator", location: "Metro" },
    { id: 1073, title: "Open Books", location: "Library" },
  ],

  "multi-aspect": [
    { id: 35, title: "Cactus Spines", location: "Desert" },
    { id: 48, title: "Café Laptop", location: "Brooklyn" },
    { id: 53, title: "Wispy Cloud", location: "Sky" },
    { id: 57, title: "SoHo Fire Escapes", location: "New York" },
    { id: 70, title: "Foggy Road", location: "Normandy" },
    { id: 90, title: "Glass Bottles", location: "Bali" },
    { id: 95, title: "Bare Trees", location: "Central Park" },
    { id: 312, title: "Honey Dipper", location: "Kitchen" },
    { id: 479, title: "Coastal Trail", location: "Big Sur" },
    { id: 594, title: "Boathouse Glow", location: "Lake District" },
    { id: 607, title: "Wading Out", location: "Pacific" },
    { id: 690, title: "London Bus", location: "London" },
    { id: 831, title: "Desert Stars", location: "Arizona" },
    { id: 840, title: "Garden Lawn", location: "Château" },
    { id: 842, title: "Steps Into Fog", location: "Forest" },
    { id: 873, title: "Mountain Reflection", location: "Dolomites" },
    { id: 898, title: "Tower at Dusk", location: "Manhattan" },
    { id: 940, title: "Succulent Garden", location: "Greenhouse" },
    { id: 947, title: "Windmill Sunset", location: "Santorini" },
    { id: 969, title: "Rocky Shore", location: "Atlantic" },
    { id: 977, title: "Forest Mushroom", location: "Black Forest" },
    { id: 1026, title: "Railway Sunset", location: "Hamburg" },
    { id: 1051, title: "Lake Pier", location: "Slovenia" },
    { id: 1071, title: "Lincoln Continental", location: "San Francisco" },
  ],
};

// =============================================================================
// Exports
// =============================================================================

export function getItems(variant) {
  const set = SETS[variant] || SETS.hero;
  return set.map((entry, i) => {
    const photo = PHOTO_MAP.get(entry.id);
    return {
      id: i + 1,
      picId: entry.id,
      photo,
      title: entry.title,
      location: entry.location,
      index: i,
    };
  });
}

export function getItemCount(variant) {
  return (SETS[variant] || SETS.hero).length;
}

export function getItemWidth(index, height, variant) {
  const set = SETS[variant] || SETS.hero;
  const entry = set[index % set.length];
  const photo = PHOTO_MAP.get(entry.id);
  if (!photo) return Math.round(height * 1.5);
  return Math.round(height * (photo.w / photo.h));
}

export { getPhotoUrl as getImageUrl };

export function preloadImages(variant, width, height) {
  const set = SETS[variant] || SETS.hero;
  return Promise.all(
    set.map(
      (entry) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = getPhotoUrl(entry.id, width, height);
        }),
    ),
  );
}
