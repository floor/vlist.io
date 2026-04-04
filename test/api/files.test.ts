// test/api/files.test.ts
import { describe, test, expect } from "bun:test";
import { listDirectory, getFilesBrowserInfo, type FileItem } from "../../src/api/files";

describe("files", () => {
  describe("getFilesBrowserInfo", () => {
    test("returns info object with required fields", () => {
      const info = getFilesBrowserInfo();

      expect(info).toHaveProperty("baseDir");
      expect(info).toHaveProperty("allowedRoots");
      expect(info).toHaveProperty("ignorePatterns");
      expect(info).toHaveProperty("description");
    });

    test("allowedRoots contains vlist and vlist.io", () => {
      const info = getFilesBrowserInfo();
      expect(info.allowedRoots).toContain("vlist");
      expect(info.allowedRoots).toContain("vlist.io");
    });

    test("ignorePatterns contains common patterns", () => {
      const info = getFilesBrowserInfo();
      expect(info.ignorePatterns).toContain("dist");
      expect(info.ignorePatterns).toContain(".git");
      expect(info.ignorePatterns).toContain("build");
    });

    test("description is a non-empty string", () => {
      const info = getFilesBrowserInfo();
      expect(typeof info.description).toBe("string");
      expect(info.description.length).toBeGreaterThan(0);
    });
  });

  describe("listDirectory", () => {
    test("returns path and items for empty path (root)", async () => {
      const result = await listDirectory("");

      expect(result).toHaveProperty("path");
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.path).toBe("");
    });

    test("root listing only shows allowed roots", async () => {
      const result = await listDirectory("");
      const names = result.items.map((item) => item.name);

      // Should only contain allowed roots (vlist, vlist.io)
      for (const name of names) {
        expect(["vlist", "vlist.io"]).toContain(name);
      }
    });

    test("items have correct structure", async () => {
      const result = await listDirectory("");

      for (const item of result.items) {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("size");
        expect(item).toHaveProperty("modified");
        expect(item).toHaveProperty("extension");
        expect(["directory", "file"]).toContain(item.type);
      }
    });

    test("can list vlist.io directory", async () => {
      const result = await listDirectory("vlist.io");

      expect(result.path).toBe("vlist.io");
      expect(result.items.length).toBeGreaterThan(0);

      // Should find common files
      const names = result.items.map((item) => item.name);
      expect(names).toContain("src");
      expect(names).toContain("package.json");
    });

    test("directories are sorted before files", async () => {
      const result = await listDirectory("vlist.io");

      const types = result.items.map((item) => item.type);
      const lastDirIndex = types.lastIndexOf("directory");
      const firstFileIndex = types.indexOf("file");

      if (lastDirIndex !== -1 && firstFileIndex !== -1) {
        expect(lastDirIndex).toBeLessThan(firstFileIndex);
      }
    });

    test("hidden files are filtered out", async () => {
      const result = await listDirectory("vlist.io");
      const names = result.items.map((item) => item.name);

      for (const name of names) {
        expect(name.startsWith(".")).toBe(false);
      }
    });

    test("throws for directory traversal attempts", async () => {
      await expect(listDirectory("../")).rejects.toThrow("Access denied");
      await expect(listDirectory("vlist.io/../../")).rejects.toThrow(
        "Access denied",
      );
      await expect(listDirectory("../../etc/passwd")).rejects.toThrow(
        "Access denied",
      );
    });

    test("throws for paths outside allowed roots", async () => {
      await expect(listDirectory("unauthorized")).rejects.toThrow(
        "Access denied",
      );
      await expect(listDirectory("notallowed/subdir")).rejects.toThrow(
        "Access denied",
      );
    });

    test("modified is an ISO date string", async () => {
      const result = await listDirectory("vlist.io");

      for (const item of result.items) {
        expect(item.modified).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        expect(() => new Date(item.modified)).not.toThrow();
      }
    });

    test("file extension is extracted correctly", async () => {
      const result = await listDirectory("vlist.io");

      const jsonFile = result.items.find((item) => item.name === "package.json");
      if (jsonFile) {
        expect(jsonFile.extension).toBe("json");
        expect(jsonFile.type).toBe("file");
      }

      const srcDir = result.items.find((item) => item.name === "src");
      if (srcDir) {
        expect(srcDir.extension).toBeNull();
        expect(srcDir.type).toBe("directory");
      }
    });

    test("size is a non-negative number", async () => {
      const result = await listDirectory("vlist.io");

      for (const item of result.items) {
        expect(typeof item.size).toBe("number");
        expect(item.size).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("error handling", () => {
    test("throws for non-existent directory within allowed root", async () => {
      await expect(
        listDirectory("vlist.io/this-directory-does-not-exist-12345"),
      ).rejects.toThrow("Failed to read directory");
    });
  });

  describe("security", () => {
    test("cannot access parent directories outside base", async () => {
      // These paths attempt to escape the base directory
      const traversalPaths = [
        "..",
        "../",
        "../..",
        "../../",
        "vlist.io/../..",
        "vlist.io/../../etc",
      ];

      for (const path of traversalPaths) {
        await expect(listDirectory(path)).rejects.toThrow("Access denied");
      }
    });

    test("vlist.io/.. resolves to root which is allowed", async () => {
      // This resolves to the base directory itself, which is allowed
      const result = await listDirectory("vlist.io/..");
      expect(result.path).toBe("vlist.io/..");
    });

    test("cannot access system directories", async () => {
      const systemPaths = [
        "/etc",
        "/etc/passwd",
        "/root",
        "/home",
        "C:\\Windows",
      ];

      for (const path of systemPaths) {
        await expect(listDirectory(path)).rejects.toThrow();
      }
    });
  });
});
