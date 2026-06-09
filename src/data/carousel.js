// Carousel — Curated photo sets by variant
// Each variant uses a unique set of photos from Lorem Picsum with
// hand-written titles and locations matching the actual photo content.

import { getPhotoUrl } from "./lorem-picsum.js";

// =============================================================================
// Per-variant curated photo sets
// { id, w, h, title, location } — w/h are native Picsum dimensions
// =============================================================================

const SETS = {
  hero: [
    { id: 29, w: 4000, h: 2670, title: "Himalayan Peaks", location: "Nepal" },
    { id: 37, w: 2000, h: 1333, title: "Coastal Bluffs", location: "Maine" },
    { id: 39, w: 3456, h: 2304, title: "Vinyl Groove", location: "Studio" },
    { id: 42, w: 3456, h: 2304, title: "Morning Coffee", location: "Portland" },
    { id: 47, w: 4272, h: 2848, title: "Ocean Pier", location: "California" },
    { id: 49, w: 1280, h: 792, title: "Santorini Village", location: "Greece" },
    { id: 55, w: 4608, h: 3072, title: "New Growth", location: "Lakeside" },
    { id: 58, w: 1280, h: 853, title: "Stone Lighthouse", location: "New England" },
    { id: 59, w: 2464, h: 1632, title: "Prairie Fence", location: "Midwest" },
    { id: 65, w: 4912, h: 3264, title: "Golden Hour", location: "Countryside" },
    { id: 67, w: 2848, h: 4288, title: "Rolling Hills", location: "Carpathians" },
    { id: 69, w: 4912, h: 3264, title: "Railway Lines", location: "Eastern Europe" },
    { id: 74, w: 4288, h: 2848, title: "Bay Crossing", location: "San Francisco" },
    { id: 82, w: 1500, h: 997, title: "Cherry Blossoms", location: "Spring" },
    { id: 84, w: 1280, h: 848, title: "Bridge at Night", location: "New York" },
    { id: 100, w: 2500, h: 1656, title: "Hazy Beach", location: "Santa Monica" },
    { id: 103, w: 2592, h: 1936, title: "Park Afternoon", location: "Atlanta" },
    { id: 106, w: 2592, h: 1728, title: "Frangipani Blooms", location: "Hawaii" },
    { id: 110, w: 5000, h: 3333, title: "Pastoral Sunset", location: "Netherlands" },
    { id: 119, w: 3264, h: 2176, title: "Minimal Desk", location: "Studio" },
    { id: 122, w: 4147, h: 2756, title: "Millennium Bridge", location: "London" },
    { id: 129, w: 4910, h: 3252, title: "Golden Gate View", location: "San Francisco" },
    { id: 134, w: 4928, h: 3264, title: "Fort Point", location: "San Francisco" },
    { id: 137, w: 4752, h: 3168, title: "Tunnel Light", location: "Underground" },
  ],

  "hero-center": [
    { id: 10, w: 2500, h: 1667, title: "Island Treeline", location: "Pacific Northwest" },
    { id: 51, w: 5000, h: 3333, title: "Storm Approaching", location: "North Sea" },
    { id: 62, w: 2000, h: 1333, title: "Tuscan Sunrise", location: "Tuscany" },
    { id: 132, w: 1600, h: 1066, title: "Frozen Road", location: "Eastern Europe" },
    { id: 271, w: 4608, h: 3072, title: "Bosphorus Ferry", location: "Istanbul" },
    { id: 278, w: 5000, h: 3333, title: "Mountain Tunnel", location: "New Zealand" },
    { id: 281, w: 4928, h: 3264, title: "Skatepark Kickflip", location: "Venice Beach" },
    { id: 314, w: 4608, h: 3072, title: "Desert Highway", location: "Death Valley" },
    { id: 338, w: 2000, h: 1333, title: "Solitude", location: "Baltic Sea" },
    { id: 356, w: 3264, h: 2448, title: "Lone Surfer", location: "Oregon" },
    { id: 412, w: 5000, h: 3337, title: "Boreal Lake", location: "Quebec" },
    { id: 506, w: 4561, h: 3421, title: "Gullfoss Falls", location: "Iceland" },
    { id: 544, w: 5000, h: 3333, title: "Misty Mountains", location: "Appalachia" },
    { id: 629, w: 2689, h: 1560, title: "Leaning Tower", location: "Pisa" },
    { id: 649, w: 2731, h: 1537, title: "Dry Grass", location: "California" },
    { id: 670, w: 2048, h: 1367, title: "Red Tram", location: "Istanbul" },
    { id: 674, w: 3888, h: 2592, title: "Harvest Grapes", location: "Vineyard" },
    { id: 703, w: 3926, h: 2848, title: "City Rainbow", location: "New York" },
    { id: 811, w: 3992, h: 2992, title: "Forest Canopy", location: "Amazon" },
    { id: 876, w: 5000, h: 3338, title: "Cloud Forest", location: "Black Forest" },
    { id: 882, w: 4896, h: 3264, title: "Café Terrace", location: "Lisbon" },
    { id: 891, w: 5000, h: 3361, title: "Antler Still Life", location: "Studio" },
    { id: 912, w: 5000, h: 3333, title: "Deep Blue", location: "Atlantic" },
    { id: 984, w: 4000, h: 2248, title: "Highland Drama", location: "Scotland" },
  ],

  full: [
    { id: 9, w: 5000, h: 3269, title: "Workspace", location: "Studio" },
    { id: 46, w: 3264, h: 2448, title: "Rolling Foothills", location: "California" },
    { id: 115, w: 1500, h: 1000, title: "Rain Drops", location: "Studio" },
    { id: 160, w: 3200, h: 2119, title: "Phone Glow", location: "Studio" },
    { id: 212, w: 2000, h: 1394, title: "Bicycle Rack", location: "Kraków" },
    { id: 318, w: 3264, h: 2448, title: "Eiffel Tower", location: "Paris" },
    { id: 330, w: 4272, h: 2848, title: "Tree Stump", location: "Countryside" },
    { id: 365, w: 5000, h: 3333, title: "Morning Tea", location: "Home" },
    { id: 387, w: 5000, h: 3333, title: "Open Field", location: "Midwest" },
    { id: 457, w: 4896, h: 2760, title: "Ships in Fog", location: "Bosphorus" },
    { id: 474, w: 4288, h: 2848, title: "Loch Road", location: "Scotland" },
    { id: 511, w: 4608, h: 3456, title: "Moss Canyon", location: "Iceland" },
    { id: 559, w: 4288, h: 2848, title: "Snowy Path", location: "Minnesota" },
    { id: 560, w: 5000, h: 3337, title: "Forest Trail", location: "Scandinavia" },
    { id: 565, w: 3000, h: 2000, title: "Alpine Birds", location: "Patagonia" },
    { id: 656, w: 2508, h: 1672, title: "Desert Wanderer", location: "Lanzarote" },
    { id: 730, w: 5000, h: 3333, title: "Snowy Pines", location: "Alps" },
    { id: 770, w: 3000, h: 2000, title: "Summit Leap", location: "Cape Town" },
    { id: 836, w: 5000, h: 3333, title: "Record Shop", location: "Nashville" },
    { id: 839, w: 5000, h: 3333, title: "Evening Ride", location: "Colorado" },
    { id: 862, w: 5000, h: 3333, title: "Manhattan Skyline", location: "New York" },
    { id: 959, w: 3699, h: 2466, title: "Fireworks", location: "New Year" },
    { id: 1031, w: 5000, h: 2812, title: "Glass Tower", location: "Chicago" },
    { id: 1056, w: 3988, h: 2720, title: "Salt Flat Mirror", location: "Bolivia" },
  ],

  multi: [
    { id: 68, w: 4608, h: 3072, title: "Harbor Pier", location: "Australia" },
    { id: 120, w: 4928, h: 3264, title: "Milky Way Fence", location: "Wyoming" },
    { id: 141, w: 2048, h: 1365, title: "Golden Hills", location: "California" },
    { id: 191, w: 2560, h: 1707, title: "Alpine Pass", location: "Swiss Alps" },
    { id: 268, w: 4228, h: 2773, title: "Beach Chair", location: "North Sea" },
    { id: 403, w: 3997, h: 2665, title: "Old Typewriter", location: "Antique Shop" },
    { id: 407, w: 4272, h: 2848, title: "Sparkler Night", location: "Celebration" },
    { id: 427, w: 4272, h: 2848, title: "Palm Silhouettes", location: "Egypt" },
    { id: 429, w: 4128, h: 2322, title: "Fresh Raspberries", location: "Kitchen" },
    { id: 475, w: 4288, h: 2848, title: "Volcano in Mist", location: "Iceland" },
    { id: 585, w: 2509, h: 1673, title: "Mountain Stadium", location: "Utah" },
    { id: 621, w: 2300, h: 1533, title: "Under the Bridge", location: "Brisbane" },
    { id: 630, w: 2517, h: 1667, title: "Sun Through Pines", location: "Dolomites" },
    { id: 685, w: 3000, h: 2000, title: "Above the Clouds", location: "Summit" },
    { id: 731, w: 3264, h: 2448, title: "Cliff Eagle", location: "Canary Islands" },
    { id: 766, w: 5000, h: 3337, title: "Coffee Beans", location: "Roastery" },
    { id: 790, w: 3220, h: 2147, title: "Red Deer Stag", location: "Richmond Park" },
    { id: 803, w: 5000, h: 3750, title: "Tropical Moss", location: "Greenhouse" },
    { id: 809, w: 5000, h: 3333, title: "Peak in Clouds", location: "Huangshan" },
    { id: 832, w: 5000, h: 3333, title: "Quiet Reading", location: "Vietnam" },
    { id: 885, w: 4000, h: 2667, title: "Writer's Desk", location: "Studio" },
    { id: 945, w: 4928, h: 3264, title: "Fire Escapes", location: "New York" },
    { id: 1037, w: 5000, h: 3333, title: "Half Dome Sunrise", location: "Yosemite" },
    { id: 1076, w: 4835, h: 3223, title: "Steel Geometry", location: "Tokyo" },
  ],

  uncontained: [
    { id: 8, w: 5000, h: 3333, title: "Laptop & Coffee", location: "Studio" },
    { id: 27, w: 3264, h: 1836, title: "Watching Waves", location: "California" },
    { id: 34, w: 3872, h: 2592, title: "Rusty Barrel", location: "Countryside" },
    { id: 36, w: 4179, h: 2790, title: "Camera Parts", location: "Workshop" },
    { id: 73, w: 5000, h: 3333, title: "Baseball Glove", location: "Dugout" },
    { id: 76, w: 4912, h: 3264, title: "Green Bicycle", location: "Vermont" },
    { id: 185, w: 3995, h: 2662, title: "Sand Dunes", location: "Sahara" },
    { id: 247, w: 3264, h: 2168, title: "Red Rock", location: "Australia" },
    { id: 296, w: 3072, h: 2048, title: "Snow Peaks", location: "Rockies" },
    { id: 307, w: 5000, h: 3333, title: "Wood Grain", location: "Studio" },
    { id: 348, w: 3872, h: 2592, title: "Tube Station", location: "London" },
    { id: 392, w: 5000, h: 3333, title: "Golden Gate", location: "San Francisco" },
    { id: 453, w: 2048, h: 1365, title: "Stage Light", location: "Concert" },
    { id: 588, w: 2509, h: 1673, title: "Sunset Jetty", location: "Maldives" },
    { id: 757, w: 5000, h: 2924, title: "Classic Interior", location: "Route 66" },
    { id: 784, w: 2640, h: 1760, title: "Morning Dew", location: "Meadow" },
    { id: 815, w: 2074, h: 1383, title: "Heart Hands", location: "Sunset" },
    { id: 869, w: 2000, h: 1333, title: "Starry Mountains", location: "Norway" },
    { id: 892, w: 5000, h: 3333, title: "Rusty Plymouth", location: "Junkyard" },
    { id: 926, w: 3264, h: 1836, title: "Walking in Fog", location: "Highlands" },
    { id: 958, w: 5000, h: 3333, title: "Succulents", location: "Greenhouse" },
    { id: 1021, w: 2048, h: 1206, title: "Misty Canopy", location: "Oregon" },
    { id: 1033, w: 2048, h: 1365, title: "Escalator", location: "Metro" },
    { id: 1073, w: 5000, h: 3333, title: "Open Books", location: "Library" },
  ],

  "multi-aspect": [
    { id: 35, w: 2758, h: 3622, title: "Cactus Spines", location: "Desert" },
    { id: 48, w: 5000, h: 3333, title: "Café Laptop", location: "Brooklyn" },
    { id: 53, w: 1280, h: 1280, title: "Wispy Cloud", location: "Sky" },
    { id: 57, w: 2448, h: 3264, title: "SoHo Fire Escapes", location: "New York" },
    { id: 70, w: 3011, h: 2000, title: "Foggy Road", location: "Normandy" },
    { id: 90, w: 3000, h: 1992, title: "Glass Bottles", location: "Bali" },
    { id: 95, w: 2048, h: 2048, title: "Bare Trees", location: "Central Park" },
    { id: 312, w: 3888, h: 2592, title: "Honey Dipper", location: "Kitchen" },
    { id: 479, w: 5000, h: 3125, title: "Coastal Trail", location: "Big Sur" },
    { id: 594, w: 2509, h: 1673, title: "Boathouse Glow", location: "Lake District" },
    { id: 607, w: 1673, h: 2509, title: "Wading Out", location: "Pacific" },
    { id: 690, w: 4288, h: 2848, title: "London Bus", location: "London" },
    { id: 831, w: 5000, h: 3333, title: "Desert Stars", location: "Arizona" },
    { id: 840, w: 2424, h: 3620, title: "Garden Lawn", location: "Château" },
    { id: 842, w: 2423, h: 3233, title: "Steps Into Fog", location: "Forest" },
    { id: 873, w: 2640, h: 3960, title: "Mountain Reflection", location: "Dolomites" },
    { id: 898, w: 3333, h: 5000, title: "Tower at Dusk", location: "Manhattan" },
    { id: 940, w: 3000, h: 4542, title: "Succulent Garden", location: "Greenhouse" },
    { id: 947, w: 5000, h: 3333, title: "Windmill Sunset", location: "Santorini" },
    { id: 969, w: 4360, h: 2900, title: "Rocky Shore", location: "Atlantic" },
    { id: 977, w: 3888, h: 2592, title: "Forest Mushroom", location: "Black Forest" },
    { id: 1026, w: 4621, h: 3070, title: "Railway Sunset", location: "Hamburg" },
    { id: 1051, w: 4928, h: 3264, title: "Lake Pier", location: "Slovenia" },
    { id: 1071, w: 3000, h: 1996, title: "Lincoln Continental", location: "San Francisco" },
  ],
};

// =============================================================================
// Exports
// =============================================================================

export function getItems(variant) {
  const set = SETS[variant] || SETS.hero;
  return set.map((entry, i) => ({
    id: i + 1,
    picId: entry.id,
    w: entry.w,
    h: entry.h,
    title: entry.title,
    location: entry.location,
    index: i,
  }));
}

export function getItemCount(variant) {
  return (SETS[variant] || SETS.hero).length;
}

export function getItemWidth(index, height, variant) {
  const set = SETS[variant] || SETS.hero;
  const entry = set[index % set.length];
  return Math.round(height * (entry.w / entry.h));
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
