import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as carousel from "../../examples/carousel/shared.js";
import * as album from "../../examples/photo-album/shared.js";

// Both examples carry the same photo-loading helper in their own shared.js (one
// per example, so each can be read on its own). This one suite runs against
// both copies: a picture that stays pending — the host accepted the connection
// and never answers, so neither load nor error fires — is swapped for its
// committed SVG after the timeout, exactly once, and a picture that is pooled,
// recycled or removed never fires a late swap at whatever it shows next.

const ROOT = join(import.meta.dir, "../..");

type Listener = (event: { type: string }) => void;

function fakeImage(
  init: {
    src?: string;
    loading?: "eager" | "lazy";
    complete?: boolean;
    naturalWidth?: number;
    isConnected?: boolean;
  } = {},
) {
  let src = init.src ?? "https://picsum.photos/id/12/300/225";
  const listeners = new Map<string, Set<Listener>>();
  const writes: string[] = [];

  const img = {
    nodeType: 1,
    tagName: "IMG",
    loading: init.loading ?? "eager",
    complete: init.complete ?? false,
    naturalWidth: init.naturalWidth ?? 0,
    isConnected: init.isConnected ?? true,
    dataset: {} as Record<string, string>,
    onerror: null as Listener | null,
    writes,
    get src() {
      return src;
    },
    set src(value: string) {
      writes.push(value);
      src = value;
    },
    getAttribute(name: string) {
      if (name === "src") return src;
      // data-photo-fallback reaches dataset.photoFallback, as it would in a page.
      if (name === "data-photo-fallback") return img.dataset.photoFallback ?? null;
      return null;
    },
    matches(selector: string) {
      return (
        selector === "img[data-photo-fallback]" &&
        Boolean(img.dataset.photoFallback)
      );
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type: string, fn: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn({ type });
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };

  return img;
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: (entries: { target: unknown; isIntersecting: boolean }[]) => void;
  options: unknown;
  observed: unknown[] = [];
  disconnected = false;

  constructor(callback: any, options?: unknown) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: unknown) {
    this.observed.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  intersect(isIntersecting = true) {
    this.callback(
      this.observed.map((target) => ({ target, isIntersecting })),
      this as any,
    );
  }
}

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];
  callback: (records: any[], observer: FakeMutationObserver) => void;
  options: unknown;
  disconnected = false;

  constructor(callback: any) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }

  observe(_root: unknown, options?: unknown) {
    this.options = options;
  }

  disconnect() {
    this.disconnected = true;
  }

  emit(records: any[]) {
    this.callback(records, this);
  }
}

/** A container whose querySelectorAll finds the images it was given. */
function fakeContainer(images: ReturnType<typeof fakeImage>[] = []) {
  return {
    nodeType: 1,
    matches: () => false,
    querySelectorAll: () =>
      images.filter((image) => image.getAttribute("data-photo-fallback")),
    images,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeIntersectionObserver.instances = [];
  FakeMutationObserver.instances = [];
  (globalThis as any).IntersectionObserver = FakeIntersectionObserver;
  (globalThis as any).MutationObserver = FakeMutationObserver;
});

afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as any).IntersectionObserver;
  delete (globalThis as any).MutationObserver;
});

for (const [example, helper] of [
  ["carousel", carousel],
  ["photo-album", album],
] as const) {
  describe(`${example} shared.js photo load timeout`, () => {
    test("the timeout is one named constant, four seconds", () => {
      expect(helper.PHOTO_TIMEOUT_MS).toBe(4000);
    });

    test("a picture that stays pending is swapped once the timeout passes", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg");

      jest.advanceTimersByTime(3999);
      expect(img.writes).toEqual([]);

      jest.advanceTimersByTime(1);
      expect(img.writes).toEqual(["/fallback.svg"]);
      expect(img.dataset.fallback).toBe("1");

      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual(["/fallback.svg"]);
    });

    test("a picture that loads before the timeout is left alone", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg");

      jest.advanceTimersByTime(1000);
      img.fire("load");
      jest.advanceTimersByTime(60_000);

      expect(img.writes).toEqual([]);
      expect(img.listenerCount("load")).toBe(0);
      expect(img.listenerCount("error")).toBe(0);
    });

    test("an error swaps at once, and a second error never swaps again", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg");

      img.fire("error");
      expect(img.writes).toEqual(["/fallback.svg"]);
      expect(img.dataset.fallback).toBe("1");

      img.fire("error");
      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual(["/fallback.svg"]);
    });

    test("a picture the inline onerror already swapped is not swapped again", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg");

      // #141's inline onerror runs first on the same error event: it swaps the
      // src and removes itself, so the request never loops.
      img.src = "/fallback.svg";
      img.writes.length = 0;
      img.onerror = null;
      img.fire("error");

      expect(img.writes).toEqual([]);
    });

    test("the rejected request's inline onerror cannot swap a second time", () => {
      const img = fakeImage();
      let inlineSwaps = 0;
      img.onerror = () => {
        inlineSwaps++;
      };
      helper.watchPhoto(img, "/fallback.svg");

      jest.advanceTimersByTime(4000);
      expect(img.onerror).toBeNull();
      expect(inlineSwaps).toBe(0);
    });

    test("a recycled picture gets a new clock, not the old one", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/first.svg");

      jest.advanceTimersByTime(1000);
      // vlist pools items: the same element is handed the next picture.
      img.src = "https://picsum.photos/id/29/300/225";
      img.writes.length = 0;
      helper.watchPhoto(img, "/second.svg");

      jest.advanceTimersByTime(3000); // the first watch's deadline
      expect(img.writes).toEqual([]);

      jest.advanceTimersByTime(1000);
      expect(img.writes).toEqual(["/second.svg"]);
    });

    test("an element reused after a fallback is armed again", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/first.svg");

      jest.advanceTimersByTime(4000);
      expect(img.dataset.fallback).toBe("1");

      // The same <img> is handed the next photo: the marker belongs to the
      // picture before it and must not stop the new one from timing out.
      img.src = "https://picsum.photos/id/29/300/225";
      img.writes.length = 0;
      helper.watchPhoto(img, "/second.svg");
      expect(img.dataset.fallback).toBeUndefined();

      jest.advanceTimersByTime(3999);
      expect(img.writes).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(img.writes).toEqual(["/second.svg"]);
    });

    test("watchPhotosIn arms the pictures already in the container", () => {
      // A framework variant builds its list before it starts watching, so the
      // cards on screen at that moment never pass through the observer.
      const img = fakeImage();
      img.dataset.photoFallback = "/fallback.svg";

      const stop = helper.watchPhotosIn(fakeContainer([img]));
      jest.advanceTimersByTime(3999);
      expect(img.writes).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(img.writes).toEqual(["/fallback.svg"]);
      stop();
    });

    test("watchPhotosIn arms a picture added after it started", () => {
      const root = fakeContainer([]);
      const stop = helper.watchPhotosIn(root);
      const observer = FakeMutationObserver.instances.at(-1)!;

      const img = fakeImage();
      img.dataset.photoFallback = "/fallback.svg";
      observer.emit([{ type: "childList", addedNodes: [img], removedNodes: [] }]);

      jest.advanceTimersByTime(4000);
      expect(img.writes).toEqual(["/fallback.svg"]);
      stop();
    });

    test("watchPhotosIn stops the timer of a picture removed from the page", () => {
      const img = fakeImage();
      img.dataset.photoFallback = "/fallback.svg";
      const stop = helper.watchPhotosIn(fakeContainer([img]));
      const observer = FakeMutationObserver.instances.at(-1)!;

      observer.emit([{ type: "childList", addedNodes: [], removedNodes: [img] }]);
      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual([]);
      stop();
    });

    test("watchPhotosIn re-arms a recycled picture after it fell back once", () => {
      const img = fakeImage();
      img.dataset.photoFallback = "/first.svg";
      const stop = helper.watchPhotosIn(fakeContainer([img]));
      const observer = FakeMutationObserver.instances.at(-1)!;

      jest.advanceTimersByTime(4000);
      expect(img.writes).toEqual(["/first.svg"]);

      // vlist pools items: the element gets a new photo and a new fallback.
      img.dataset.photoFallback = "/second.svg";
      img.src = "https://picsum.photos/id/29/300/225";
      img.writes.length = 0;
      observer.emit([{ type: "attributes", attributeName: "src", target: img }]);

      jest.advanceTimersByTime(3999);
      expect(img.writes).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(img.writes).toEqual(["/second.svg"]);
      stop();
    });

    test("watchPhotosIn drops its observer when its stop is called", () => {
      const stop = helper.watchPhotosIn(fakeContainer([]));
      const observer = FakeMutationObserver.instances.at(-1)!;
      stop();
      expect(observer.disconnected).toBe(true);
    });

    test("a picture taken off the page is not swapped", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg");

      img.isConnected = false;
      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual([]);
    });

    test("a lazy picture is timed only once it comes near the viewport", () => {
      const img = fakeImage({ loading: "lazy" });
      helper.watchPhoto(img, "/fallback.svg");

      const [observer] = FakeIntersectionObserver.instances;
      expect(observer.observed).toEqual([img] as unknown[]);

      // Off-screen: the browser has not asked for it, so it is not pending.
      observer.intersect(false);
      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual([]);

      observer.intersect(true);
      expect(observer.disconnected).toBe(true);
      jest.advanceTimersByTime(3999);
      expect(img.writes).toEqual([]);
      jest.advanceTimersByTime(1);
      expect(img.writes).toEqual(["/fallback.svg"]);
    });

    test("an already-loaded picture never starts a clock", () => {
      const img = fakeImage({ complete: true, naturalWidth: 300 });
      helper.watchPhoto(img, "/fallback.svg");

      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual([]);
      expect(img.listenerCount("load")).toBe(0);
      expect(img.listenerCount("error")).toBe(0);
    });

    test("a picture that broke before it was watched is swapped at once", () => {
      const img = fakeImage({ complete: true, naturalWidth: 0 });
      helper.watchPhoto(img, "/fallback.svg");

      expect(img.writes).toEqual(["/fallback.svg"]);
      expect(img.dataset.fallback).toBe("1");
    });

    test("stopping the watch clears the timer", () => {
      const img = fakeImage();
      helper.watchPhoto(img, "/fallback.svg").stop();

      jest.advanceTimersByTime(60_000);
      expect(img.writes).toEqual([]);
      expect(img.listenerCount("load")).toBe(0);
      expect(img.listenerCount("error")).toBe(0);
    });
  });
}

describe("photo fallback wiring", () => {
  const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

  test("every slide and card template names its fallback for the watcher", () => {
    // Two slide templates (preloaded and lazy) plus the album card template.
    const carouselSlides =
      read("examples/carousel/vanilla/script.js").match(
        /data-photo-fallback="\/examples\/carousel\/images\/\$\{item\.picId\}\.svg"/g,
      ) ?? [];
    expect(carouselSlides.length).toBe(2);
    expect(read("examples/photo-album/shared.js")).toContain(
      'data-photo-fallback="/examples/photo-album/images/${item.picId}.svg"',
    );
  });

  test("every variant arms the watcher for its cards and its detail panel", () => {
    for (const name of [
      "examples/carousel/vanilla/script.js",
      "examples/photo-album/vanilla/script.js",
      "examples/photo-album/react/script.tsx",
      "examples/photo-album/vue/script.js",
      "examples/photo-album/svelte/script.js",
    ]) {
      const source = read(name);
      expect(source).toContain("watchPhotosIn(");
      expect(source).toContain("watchPhoto(");
    }
  });

  test("the detail panels' fallbacks stay the committed placeholder files", () => {
    // The cards' fallback comes from the template attribute; the panels name it
    // where they call the watcher.
    for (const name of [
      "examples/photo-album/vanilla/script.js",
      "examples/photo-album/react/script.tsx",
      "examples/photo-album/vue/script.js",
      "examples/photo-album/svelte/script.js",
    ]) {
      expect(read(name)).toContain("/examples/photo-album/images/");
    }
  });
});
