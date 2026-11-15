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
    { id: 23, w: 3887, h: 4899, title: "Silver Forks", location: "Kitchen" },
    { id: 31, w: 3264, h: 4912, title: "Barefoot", location: "Studio" },
    { id: 75, w: 1999, h: 2998, title: "Vine Grapes", location: "Vineyard" },
    { id: 78, w: 1584, h: 2376, title: "Arched Doorway", location: "Old Town" },
    { id: 79, w: 2000, h: 3011, title: "Summit Hiker", location: "Mountains" },
    { id: 156, w: 2177, h: 3264, title: "Sand Footprints", location: "Beach" },
    { id: 253, w: 2448, h: 3264, title: "Mossy Stone", location: "Forest Floor" },
    { id: 260, w: 1500, h: 2250, title: "Alpine Pines", location: "Mountains" },
    { id: 263, w: 3429, h: 5000, title: "Winter Street", location: "Europe" },
    { id: 486, w: 3409, h: 5000, title: "Vintage Typewriter", location: "Studio" },
    { id: 508, w: 2955, h: 3892, title: "Vaulted Ceiling", location: "Cathedral" },
    { id: 512, w: 3434, h: 4340, title: "Blue Lagoon", location: "Iceland" },
    { id: 514, w: 3179, h: 4238, title: "White Land Rover", location: "Havana" },
    { id: 520, w: 3333, h: 5000, title: "Manhattan Bridge", location: "New York" },
    { id: 522, w: 1500, h: 2000, title: "Tree-Lined Avenue", location: "New York" },
    { id: 530, w: 3000, h: 4000, title: "Terrarium", location: "Greenhouse" },
    { id: 535, w: 2962, h: 3949, title: "Clothing Rack", location: "Boutique" },
    { id: 537, w: 2291, h: 3450, title: "Shooting Star", location: "Night Sky" },
    { id: 550, w: 1536, h: 2304, title: "City Sunset", location: "Rooftop" },
    { id: 567, w: 1667, h: 2517, title: "Bokeh Canopy", location: "Garden" },
    { id: 591, w: 1774, h: 2365, title: "Cliff in Clouds", location: "Mountains" },
    { id: 593, w: 1774, h: 2365, title: "Young Tiger", location: "Sanctuary" },
    { id: 613, w: 1670, h: 2513, title: "Golden Gate", location: "San Francisco" },
    { id: 638, w: 1774, h: 2365, title: "Coastal Aerial", location: "Beach" },
  ],

  "full-h": [
    { id: 0, w: 5000, h: 3333, title: "Laptop & Desk", location: "Studio" },
    { id: 54, w: 3264, h: 2176, title: "Mountain Summit", location: "Alps" },
    { id: 123, w: 4928, h: 3264, title: "Water Droplets", location: "Macro" },
    { id: 172, w: 2000, h: 1325, title: "Dock in Fog", location: "Lake" },
    { id: 216, w: 2500, h: 1667, title: "Mossy Trail", location: "Forest" },
    { id: 265, w: 3264, h: 2448, title: "Highway Sunset", location: "Desert" },
    { id: 310, w: 4928, h: 3264, title: "Smoke Portrait", location: "Night" },
    { id: 353, w: 5000, h: 2806, title: "Misty Hillside", location: "Tropics" },
    { id: 386, w: 4320, h: 2432, title: "Above the Clouds", location: "Summit" },
    { id: 428, w: 2529, h: 1581, title: "Yellow Wall", location: "Vietnam" },
    { id: 467, w: 5000, h: 3333, title: "Ocean Horizon", location: "Atlantic" },
    { id: 505, w: 2000, h: 1333, title: "Sunset Silhouette", location: "Beach" },
    { id: 548, w: 5000, h: 3333, title: "Bonfire Sparks", location: "Campsite" },
    { id: 583, w: 2509, h: 1673, title: "Cloud Tops", location: "Sky" },
    { id: 634, w: 2200, h: 1467, title: "Misty Pines", location: "Pacific Northwest" },
    { id: 672, w: 5000, h: 3333, title: "Bus Commute", location: "City" },
    { id: 726, w: 3264, h: 2176, title: "Red in Snow", location: "Winter" },
    { id: 783, w: 4096, h: 2731, title: "Snow Monkey", location: "Japan" },
    { id: 825, w: 5000, h: 3333, title: "Star Trails", location: "Desert" },
    { id: 871, w: 5000, h: 3338, title: "Sea Cave", location: "Mediterranean" },
    { id: 919, w: 5000, h: 3333, title: "Pine Forest", location: "Scandinavia" },
    { id: 962, w: 3200, h: 1800, title: "Sunset Waves", location: "Pacific" },
    { id: 1004, w: 5000, h: 3333, title: "Rain Silhouette", location: "Night" },
    { id: 1050, w: 5000, h: 3333, title: "Sea Stacks", location: "Oregon" },
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
