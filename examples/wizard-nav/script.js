// Wizard — Step-by-step recipe viewer
// Demonstrates scroll.wheel: false, wrap, button-only navigation

import { vlist } from "vlist";
import { createStats } from "../stats.js";
import "./controls.js";

// =============================================================================
// Data — recipe cards (domain-specific, kept inline)
// =============================================================================

export const recipes = [
  {
    id: 1,
    emoji: "🍝",
    title: "Spaghetti Carbonara",
    origin: "Rome, Italy",
    time: "25 min",
    difficulty: "Medium",
    ingredients: "Guanciale, Pecorino, Eggs, Black Pepper",
    tip: "Never use cream — the egg and cheese create the sauce.",
  },
  {
    id: 2,
    emoji: "🍣",
    title: "Salmon Nigiri",
    origin: "Tokyo, Japan",
    time: "45 min",
    difficulty: "Hard",
    ingredients: "Sushi Rice, Fresh Salmon, Rice Vinegar, Wasabi",
    tip: "Wet your hands before shaping to prevent sticking.",
  },
  {
    id: 3,
    emoji: "🌮",
    title: "Tacos al Pastor",
    origin: "Mexico City, Mexico",
    time: "60 min",
    difficulty: "Medium",
    ingredients: "Pork Shoulder, Pineapple, Achiote, Corn Tortillas",
    tip: "Marinate overnight for the deepest flavor.",
  },
  {
    id: 4,
    emoji: "🥘",
    title: "Chicken Tagine",
    origin: "Marrakech, Morocco",
    time: "90 min",
    difficulty: "Easy",
    ingredients: "Chicken, Preserved Lemons, Olives, Saffron",
    tip: "Low and slow — let the spices meld for at least an hour.",
  },
  {
    id: 5,
    emoji: "🍛",
    title: "Butter Chicken",
    origin: "Delhi, India",
    time: "50 min",
    difficulty: "Medium",
    ingredients: "Chicken, Tomato, Butter, Garam Masala, Cream",
    tip: "Char the chicken under a broiler before adding to sauce.",
  },
  {
    id: 6,
    emoji: "🥐",
    title: "Croissants",
    origin: "Paris, France",
    time: "4 hours",
    difficulty: "Hard",
    ingredients: "Flour, Butter, Yeast, Milk, Sugar",
    tip: "Keep the butter cold — lamination is everything.",
  },
  {
    id: 7,
    emoji: "🍜",
    title: "Pho Bo",
    origin: "Hanoi, Vietnam",
    time: "3 hours",
    difficulty: "Medium",
    ingredients: "Beef Bones, Star Anise, Cinnamon, Rice Noodles, Herbs",
    tip: "Toast the spices before adding to the broth.",
  },
  {
    id: 8,
    emoji: "🥟",
    title: "Xiaolongbao",
    origin: "Shanghai, China",
    time: "2 hours",
    difficulty: "Hard",
    ingredients: "Pork, Aspic, Ginger, Dumpling Wrappers",
    tip: "The soup inside comes from chilled gelatinous broth.",
  },
  {
    id: 9,
    emoji: "🫕",
    title: "Cheese Fondue",
    origin: "Gruyères, Switzerland",
    time: "30 min",
    difficulty: "Easy",
    ingredients: "Gruyère, Emmental, White Wine, Garlic, Kirsch",
    tip: "Rub the pot with garlic before melting the cheese.",
  },
  {
    id: 10,
    emoji: "🍖",
    title: "Pulled Pork",
    origin: "Carolina, USA",
    time: "8 hours",
    difficulty: "Easy",
    ingredients: "Pork Shoulder, Brown Sugar, Paprika, Apple Cider Vinegar",
    tip: "Low heat, long time — 225°F is the sweet spot.",
  },
  {
    id: 11,
    emoji: "🥙",
    title: "Falafel Wrap",
    origin: "Cairo, Egypt",
    time: "40 min",
    difficulty: "Medium",
    ingredients: "Chickpeas, Parsley, Cumin, Tahini, Pita",
    tip: "Use dried chickpeas, never canned — texture matters.",
  },
  {
    id: 12,
    emoji: "🍕",
    title: "Neapolitan Pizza",
    origin: "Naples, Italy",
    time: "24 hours",
    difficulty: "Medium",
    ingredients: "00 Flour, San Marzano Tomatoes, Mozzarella, Basil",
    tip: "The dough needs a 24-hour cold ferment for flavor.",
  },
  {
    id: 13,
    emoji: "🍲",
    title: "Tom Yum Goong",
    origin: "Bangkok, Thailand",
    time: "35 min",
    difficulty: "Medium",
    ingredients: "Shrimp, Lemongrass, Galangal, Lime Leaves, Chili",
    tip: "Add the lime juice off heat to preserve brightness.",
  },
  {
    id: 14,
    emoji: "🫓",
    title: "Naan Bread",
    origin: "Punjab, Pakistan",
    time: "2 hours",
    difficulty: "Easy",
    ingredients: "Flour, Yogurt, Yeast, Ghee, Garlic",
    tip: "A screaming-hot cast iron pan mimics a tandoor.",
  },
  {
    id: 15,
    emoji: "🍰",
    title: "Basque Cheesecake",
    origin: "San Sebastián, Spain",
    time: "50 min",
    difficulty: "Easy",
    ingredients: "Cream Cheese, Sugar, Eggs, Heavy Cream, Flour",
    tip: "The burnt top is intentional — bake at 450°F.",
  },
  {
    id: 16,
    emoji: "🍤",
    title: "Pad Thai",
    origin: "Bangkok, Thailand",
    time: "30 min",
    difficulty: "Medium",
    ingredients: "Rice Noodles, Shrimp, Tamarind, Peanuts, Bean Sprouts",
    tip: "Soak noodles, don't boil — they finish cooking in the wok.",
  },
  {
    id: 17,
    emoji: "🥩",
    title: "Argentine Asado",
    origin: "Buenos Aires, Argentina",
    time: "3 hours",
    difficulty: "Medium",
    ingredients: "Beef Ribs, Chimichurri, Coarse Salt, Charcoal",
    tip: "Salt generously 40 minutes before grilling.",
  },
  {
    id: 18,
    emoji: "🧆",
    title: "Arancini",
    origin: "Sicily, Italy",
    time: "90 min",
    difficulty: "Medium",
    ingredients: "Risotto Rice, Mozzarella, Peas, Breadcrumbs",
    tip: "Use day-old risotto — it holds its shape much better.",
  },
  {
    id: 19,
    emoji: "🍮",
    title: "Crème Brûlée",
    origin: "Lyon, France",
    time: "5 hours",
    difficulty: "Medium",
    ingredients: "Egg Yolks, Heavy Cream, Vanilla Bean, Sugar",
    tip: "Strain the custard twice for a silky texture.",
  },
  {
    id: 20,
    emoji: "🫔",
    title: "Tamales",
    origin: "Oaxaca, Mexico",
    time: "3 hours",
    difficulty: "Hard",
    ingredients: "Masa Harina, Pork, Dried Chiles, Corn Husks, Lard",
    tip: "The masa should float in water when it's whipped enough.",
  },
];

export const TOTAL = recipes.length;
export const ITEM_HEIGHT = 320;

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let currentOrientation = "vertical"; // "vertical" | "horizontal"
export let currentWrap = true;
export let currentIndex = 0;
export let list = null;

export function setCurrentOrientation(v) {
  currentOrientation = v;
}
export function setCurrentWrap(v) {
  currentWrap = v;
}

// =============================================================================
// Template
// =============================================================================

const itemTemplate = (item) => `
  <div class="recipe-card">
    <div class="recipe-header">
      <span class="recipe-emoji">${item.emoji}</span>
      <div class="recipe-meta">
        <span class="meta-tag meta-time">⏱ ${item.time}</span>
        <span class="meta-tag meta-difficulty">${item.difficulty}</span>
      </div>
    </div>
    <h2 class="recipe-title">${item.title}</h2>
    <p class="recipe-origin">${item.origin}</p>
    <div class="recipe-section">
      <h3>Ingredients</h3>
      <p>${item.ingredients}</p>
    </div>
    <div class="recipe-tip">
      <span class="tip-icon">💡</span>
      <p>${item.tip}</p>
    </div>
  </div>
`;

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => TOTAL,
  getItemHeight: () => ITEM_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// Create / Recreate list
// =============================================================================

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  // Toggle horizontal class on wizard wrapper
  const wizardEl = document.querySelector(".wizard");
  const isH = currentOrientation === "horizontal";
  wizardEl.classList.toggle("wizard--horizontal", isH);

  // In horizontal mode, item width = container width so one card fills the view
  const containerWidth = isH ? container.clientWidth : undefined;

  const builder = vlist({
    container: "#list-container",
    orientation: currentOrientation,
    scroll: { wheel: false, scrollbar: "none", wrap: currentWrap },
    ariaLabel: "Recipe wizard",
    item: {
      height: ITEM_HEIGHT,
      width: isH ? containerWidth : undefined,
      template: itemTemplate,
    },
    items: recipes,
  });

  list = builder.build();

  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", stats.scheduleUpdate);
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ index }) => {
    goTo(index);
  });

  stats.update();
  updateContext();

  // Restore current index (instant — no animation after rebuild)
  goTo(currentIndex, true);
}

// =============================================================================
// Navigation — go to a specific recipe
// =============================================================================

export function goTo(index, instant = false) {
  if (currentWrap) {
    currentIndex = ((index % TOTAL) + TOTAL) % TOTAL;
  } else {
    currentIndex = Math.max(0, Math.min(index, TOTAL - 1));
  }

  list.scrollToIndex(currentIndex, {
    align: "start",
    behavior: instant ? "auto" : "smooth",
    duration: instant ? 0 : 350,
  });

  updateCurrentInfo();
  updateDots();
  stats.update();
}

// =============================================================================
// Step indicator dots
// =============================================================================

const indicatorEl = document.getElementById("step-indicator");

function updateDots() {
  indicatorEl.innerHTML = recipes
    .map(
      (_, i) =>
        `<span class="dot ${i === currentIndex ? "dot-active" : ""}" data-index="${i}"></span>`,
    )
    .join("");
}

indicatorEl.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (dot) goTo(Number(dot.dataset.index));
});

// =============================================================================
// Current recipe info (panel)
// =============================================================================

const currentNameEl = document.getElementById("current-name");
const currentDifficultyEl = document.getElementById("current-difficulty");
const currentTimeEl = document.getElementById("current-time");

function updateCurrentInfo() {
  const r = recipes[currentIndex];
  currentNameEl.textContent = `${r.emoji} ${r.title}`;
  currentDifficultyEl.textContent = r.difficulty;
  currentTimeEl.textContent = r.time;
}

// =============================================================================
// Keyboard navigation
// =============================================================================

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    goTo(currentIndex - 1);
  } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    goTo(currentIndex + 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    goTo(0);
  } else if (e.key === "End") {
    e.preventDefault();
    goTo(TOTAL - 1);
  }
});

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const ftOrientation = document.getElementById("ft-orientation");
const ftWrap = document.getElementById("ft-wrap");

export function updateContext() {
  ftOrientation.textContent = currentOrientation;
  ftWrap.textContent = currentWrap ? "on" : "off";
}

// =============================================================================
// Initialise
// =============================================================================

createList();
