// Wizard Navigation Example
// Demonstrates wheelScroll: false with button-only navigation

import { createVList } from "vlist";

// Recipe steps dataset — a cookbook wizard
const recipes = [
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

// Current focused index
let currentIndex = 0;
const TOTAL = recipes.length;

// Create virtual list with wheel scrolling disabled
const list = createVList({
  container: "#list-container",
  scroll: { wheel: false, scrollbar: "none", wrap: true },
  ariaLabel: "Recipe wizard",
  selection: { mode: "single" },
  item: {
    height: 320,
    template: (item) => `
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
    `,
  },
  items: recipes,
});

// DOM elements
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnFirst = document.getElementById("btn-first");
const btnLast = document.getElementById("btn-last");
const btnRandom = document.getElementById("btn-random");
const statsEl = document.getElementById("stats");
const indicatorEl = document.getElementById("step-indicator");

// Navigate to a specific index (wrap is handled by vlist)
function goTo(index) {
  currentIndex = ((index % TOTAL) + TOTAL) % TOTAL;

  list.scrollToIndex(currentIndex, {
    align: "start",
    behavior: "smooth",
    duration: 350,
  });

  list.clearSelection();
  list.select(recipes[currentIndex].id);

  updateUI();
}

// Update buttons, stats, and step indicator
function updateUI() {
  // No disabling — wrap mode means prev/next always work

  const recipe = recipes[currentIndex];
  statsEl.innerHTML = `
    <span><strong>Recipe:</strong> ${currentIndex + 1} / ${TOTAL}</span>
    <span><strong>${recipe.emoji} ${recipe.title}</strong></span>
    <span><strong>Difficulty:</strong> ${recipe.difficulty}</span>
  `;

  // Step dots
  const dots = recipes
    .map((_, i) => {
      const isActive = i === currentIndex;
      return `<span class="dot ${isActive ? "dot-active" : ""}" data-index="${i}"></span>`;
    })
    .join("");
  indicatorEl.innerHTML = dots;
}

// Button handlers
btnPrev.addEventListener("click", () => goTo(currentIndex - 1));
btnNext.addEventListener("click", () => goTo(currentIndex + 1));
btnFirst.addEventListener("click", () => goTo(0));
btnLast.addEventListener("click", () => goTo(TOTAL - 1));
btnRandom.addEventListener("click", () => {
  let next;
  do {
    next = Math.floor(Math.random() * TOTAL);
  } while (next === currentIndex && TOTAL > 1);
  goTo(next);
});

// Click on step dots
indicatorEl.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (dot) {
    goTo(Number(dot.dataset.index));
  }
});

// Keyboard navigation (left/right arrows anywhere on page)
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

// Item click — navigate to that recipe
list.on("item:click", ({ index }) => {
  goTo(index);
});

// Initial state
goTo(0);
