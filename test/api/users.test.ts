// test/api/users.test.ts
import { describe, test, expect } from "bun:test";
import {
  generateUser,
  getUsers,
  getUserById,
  DEFAULT_TOTAL,
  MAX_LIMIT,
  type User,
} from "../../src/api/users";

describe("users", () => {
  describe("generateUser", () => {
    test("returns a user with all required fields", () => {
      const user = generateUser(1);

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("avatar");
      expect(user).toHaveProperty("avatarColor");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("department");
      expect(user).toHaveProperty("company");
      expect(user).toHaveProperty("city");
      expect(user).toHaveProperty("country");
      expect(user).toHaveProperty("status");
      expect(user).toHaveProperty("joinedYear");
    });

    test("is deterministic - same index produces same user", () => {
      const user1 = generateUser(42);
      const user2 = generateUser(42);

      expect(user1).toEqual(user2);
    });

    test("different indices produce different users", () => {
      const user1 = generateUser(1);
      const user2 = generateUser(2);

      expect(user1.id).not.toBe(user2.id);
    });

    test("user ID matches the index", () => {
      expect(generateUser(1).id).toBe(1);
      expect(generateUser(100).id).toBe(100);
      expect(generateUser(1000).id).toBe(1000);
    });

    test("avatar is first letter of first + last name", () => {
      const user = generateUser(1);
      expect(user.avatar).toBe(user.firstName[0] + user.lastName[0]);
    });

    test("email format is correct", () => {
      const user = generateUser(1);
      expect(user.email).toMatch(/^[a-z]+\.[a-z]+@[a-z]+\.[a-z]+$/);
    });

    test("email includes suffix for indices > 1000", () => {
      const user = generateUser(1001);
      expect(user.email).toMatch(/^[a-z]+\.[a-z]+[a-z0-9]+@/);
    });

    test("joinedYear is between 2015 and 2026", () => {
      for (let i = 1; i <= 100; i++) {
        const user = generateUser(i);
        expect(user.joinedYear).toBeGreaterThanOrEqual(2015);
        expect(user.joinedYear).toBeLessThanOrEqual(2026);
      }
    });

    test("status is one of the valid values", () => {
      const validStatuses = ["active", "inactive", "pending", "suspended"];
      for (let i = 1; i <= 100; i++) {
        const user = generateUser(i);
        expect(validStatuses).toContain(user.status);
      }
    });

    test("avatarColor is a valid hex color", () => {
      const user = generateUser(1);
      expect(user.avatarColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe("getUsers", () => {
    test("returns items, total, and hasMore", () => {
      const result = getUsers(0, 10);

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.items)).toBe(true);
    });

    test("respects limit parameter", () => {
      const result = getUsers(0, 25);
      expect(result.items.length).toBe(25);
    });

    test("clamps limit to MAX_LIMIT", () => {
      const result = getUsers(0, 500);
      expect(result.items.length).toBe(MAX_LIMIT);
    });

    test("respects offset parameter", () => {
      const result = getUsers(10, 5);
      expect(result.items[0].id).toBe(11); // 1-based IDs, offset 10 = ID 11
    });

    test("returns correct total", () => {
      const result = getUsers(0, 10);
      expect(result.total).toBe(DEFAULT_TOTAL);

      const customTotal = getUsers(0, 10, 5000);
      expect(customTotal.total).toBe(5000);
    });

    test("hasMore is true when more items exist", () => {
      const result = getUsers(0, 10, 100);
      expect(result.hasMore).toBe(true);
    });

    test("hasMore is false at end of dataset", () => {
      const result = getUsers(90, 10, 100);
      expect(result.hasMore).toBe(false);
    });

    test("handles offset beyond total gracefully", () => {
      const result = getUsers(1000, 10, 100);
      expect(result.items.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    test("handles negative offset by clamping to 0", () => {
      const result = getUsers(-10, 5, 100);
      expect(result.items[0].id).toBe(1);
    });

    test("items are User objects with correct structure", () => {
      const result = getUsers(0, 5);
      for (const user of result.items) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("firstName");
        expect(user).toHaveProperty("lastName");
        expect(user).toHaveProperty("email");
      }
    });
  });

  describe("getUserById", () => {
    test("returns user for valid ID", () => {
      const user = getUserById(1);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(1);
    });

    test("returns null for ID less than 1", () => {
      expect(getUserById(0)).toBeNull();
      expect(getUserById(-1)).toBeNull();
    });

    test("returns null for ID greater than total", () => {
      expect(getUserById(DEFAULT_TOTAL + 1)).toBeNull();
      expect(getUserById(101, 100)).toBeNull();
    });

    test("respects custom total parameter", () => {
      expect(getUserById(100, 100)).not.toBeNull();
      expect(getUserById(100, 50)).toBeNull();
    });

    test("returns same user as generateUser", () => {
      const user1 = getUserById(42);
      const user2 = generateUser(42);
      expect(user1).toEqual(user2);
    });
  });

  describe("constants", () => {
    test("DEFAULT_TOTAL is 1 million", () => {
      expect(DEFAULT_TOTAL).toBe(1_000_000);
    });

    test("MAX_LIMIT is 200", () => {
      expect(MAX_LIMIT).toBe(200);
    });
  });
});
