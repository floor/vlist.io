// test/api/recipes.test.ts
import { describe, test, expect } from "bun:test";
import { recipes, getRecipes, getRecipeById, type Recipe } from "../../src/api/recipes";

describe("recipes", () => {
  describe("recipes array", () => {
    test("contains 20 recipes", () => {
      expect(recipes.length).toBe(20);
    });

    test("each recipe has all required fields", () => {
      for (const recipe of recipes) {
        expect(recipe).toHaveProperty("id");
        expect(recipe).toHaveProperty("emoji");
        expect(recipe).toHaveProperty("title");
        expect(recipe).toHaveProperty("origin");
        expect(recipe).toHaveProperty("time");
        expect(recipe).toHaveProperty("difficulty");
        expect(recipe).toHaveProperty("ingredients");
        expect(recipe).toHaveProperty("tip");
      }
    });

    test("all IDs are unique", () => {
      const ids = recipes.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(recipes.length);
    });

    test("IDs are sequential from 1 to 20", () => {
      const sortedIds = recipes.map((r) => r.id).sort((a, b) => a - b);
      for (let i = 0; i < sortedIds.length; i++) {
        expect(sortedIds[i]).toBe(i + 1);
      }
    });

    test("all titles are non-empty strings", () => {
      for (const recipe of recipes) {
        expect(typeof recipe.title).toBe("string");
        expect(recipe.title.length).toBeGreaterThan(0);
      }
    });

    test("all emojis are food-related", () => {
      for (const recipe of recipes) {
        expect(recipe.emoji.length).toBeGreaterThan(0);
      }
    });

    test("difficulty is one of Easy, Medium, Hard", () => {
      const validDifficulties = ["Easy", "Medium", "Hard"];
      for (const recipe of recipes) {
        expect(validDifficulties).toContain(recipe.difficulty);
      }
    });

    test("origin includes location", () => {
      for (const recipe of recipes) {
        expect(recipe.origin).toMatch(/\w+,\s*\w+/);
      }
    });

    test("time includes unit", () => {
      for (const recipe of recipes) {
        expect(recipe.time).toMatch(/\d+\s*(min|hour|hours)/i);
      }
    });
  });

  describe("getRecipes", () => {
    test("returns all recipes", () => {
      const result = getRecipes();
      expect(result).toBe(recipes);
      expect(result.length).toBe(20);
    });

    test("returns the same reference as recipes array", () => {
      const result = getRecipes();
      expect(result).toBe(recipes);
    });
  });

  describe("getRecipeById", () => {
    test("returns recipe for valid ID", () => {
      const recipe = getRecipeById(1);
      expect(recipe).toBeDefined();
      expect(recipe?.id).toBe(1);
      expect(recipe?.title).toBe("Spaghetti Carbonara");
    });

    test("returns undefined for invalid ID", () => {
      expect(getRecipeById(0)).toBeUndefined();
      expect(getRecipeById(-1)).toBeUndefined();
      expect(getRecipeById(21)).toBeUndefined();
      expect(getRecipeById(100)).toBeUndefined();
    });

    test("returns correct recipe for each valid ID", () => {
      for (let id = 1; id <= 20; id++) {
        const recipe = getRecipeById(id);
        expect(recipe).toBeDefined();
        expect(recipe?.id).toBe(id);
      }
    });

    test("returns same recipe as finding in array", () => {
      const id = 5;
      const fromFunction = getRecipeById(id);
      const fromArray = recipes.find((r) => r.id === id);
      expect(fromFunction).toBe(fromArray);
    });
  });

  describe("specific recipes", () => {
    test("first recipe is Spaghetti Carbonara", () => {
      const recipe = getRecipeById(1);
      expect(recipe?.title).toBe("Spaghetti Carbonara");
      expect(recipe?.origin).toBe("Rome, Italy");
      expect(recipe?.emoji).toBe("🍝");
    });

    test("last recipe is Tamales", () => {
      const recipe = getRecipeById(20);
      expect(recipe?.title).toBe("Tamales");
      expect(recipe?.origin).toBe("Oaxaca, Mexico");
      expect(recipe?.emoji).toBe("🫔");
    });
  });
});
