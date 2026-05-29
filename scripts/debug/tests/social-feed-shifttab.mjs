/**
 * Debug: Social Feed shift-tab focus jump (#31).
 * Reproduces: Click first item → click RSS button (unfocus list) →
 * shift-tab twice → observe where focus lands.
 *
 * Expected: shift-tab should navigate backward through the page's tab order,
 * NOT jump to the 5th article inside the list.
 *
 *   bun scripts/debug/tests/social-feed-shifttab.mjs
 */
import { run } from "../runner.mjs";

const SEL = {
  vp: ".vlist-viewport",
  content: ".vlist-content",
  root: ".vlist",
  item: ".vlist-item",
};

await run("/examples/social-feed", { settle: 4000 }, async (s) => {
  const { page } = s;

  console.log("\n=== SOCIAL FEED SHIFT-TAB FOCUS TEST (#31) ===\n");

  // Wait for items to render
  await page.waitForSelector(SEL.item, { timeout: 10000 });
  const itemCount = await page.evaluate(
    (sel) => document.querySelectorAll(sel).length,
    SEL.item,
  );
  console.log(`  Rendered items: ${itemCount}`);

  // Step 1: Click first item
  await page.click(SEL.item);
  await s.wait(500);

  const afterClick = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName,
      class: el?.className?.substring(0, 60),
      id: el?.id,
    };
  });
  console.log(
    `  After clicking first item — focus: <${afterClick.tag}> class="${afterClick.class}" id="${afterClick.id}"`,
  );

  // Step 2: Click the RSS source button to move focus outside the list
  const rssClicked = await page.evaluate(() => {
    const btn = document.querySelector('[data-source="rss"]');
    if (btn) {
      btn.click();
      btn.focus();
      return true;
    }
    return false;
  });
  console.log(`  Clicked RSS button: ${rssClicked}`);
  await s.wait(1000);

  const afterRss = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName,
      class: el?.className?.substring(0, 60),
      id: el?.id,
    };
  });
  console.log(
    `  After clicking RSS — focus: <${afterRss.tag}> class="${afterRss.class}" id="${afterRss.id}"`,
  );

  // Step 3: Record scroll position before shift-tabs
  const scrollBefore = await page.evaluate((sel) => {
    const vp = document.querySelector(sel);
    return vp ? Math.round(vp.scrollTop) : null;
  }, SEL.vp);
  console.log(`  Scroll position before shift-tab: ${scrollBefore}`);

  // Step 4: Shift-Tab #1
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await s.wait(500);

  const afterShiftTab1 = await page.evaluate((sel) => {
    const el = document.activeElement;
    const vp = document.querySelector(sel);
    const isInsideList = document.querySelector(".vlist")?.contains(el);
    return {
      tag: el?.tagName,
      class: el?.className?.substring(0, 60),
      id: el?.id,
      role: el?.getAttribute("role"),
      tabindex: el?.getAttribute("tabindex"),
      isInsideList,
      scrollTop: vp ? Math.round(vp.scrollTop) : null,
      text: el?.textContent?.trim()?.substring(0, 40),
    };
  }, SEL.vp);
  console.log(`\n  Shift-Tab #1:`);
  console.log(
    `    Focus: <${afterShiftTab1.tag}> class="${afterShiftTab1.class}" id="${afterShiftTab1.id}"`,
  );
  console.log(
    `    Role: ${afterShiftTab1.role}, tabindex: ${afterShiftTab1.tabindex}`,
  );
  console.log(`    Inside list: ${afterShiftTab1.isInsideList}`);
  console.log(`    Text: "${afterShiftTab1.text}"`);
  console.log(`    Scroll: ${afterShiftTab1.scrollTop}`);

  // Step 5: Shift-Tab #2
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await s.wait(500);

  const afterShiftTab2 = await page.evaluate((sel) => {
    const el = document.activeElement;
    const vp = document.querySelector(sel);
    const isInsideList = document.querySelector(".vlist")?.contains(el);
    const listItem = el?.closest(".vlist-item");
    const allItems = [...document.querySelectorAll(".vlist-item")];
    const itemIndex = listItem ? allItems.indexOf(listItem) : -1;
    return {
      tag: el?.tagName,
      class: el?.className?.substring(0, 60),
      id: el?.id,
      role: el?.getAttribute("role"),
      tabindex: el?.getAttribute("tabindex"),
      isInsideList,
      itemIndex,
      scrollTop: vp ? Math.round(vp.scrollTop) : null,
      text: el?.textContent?.trim()?.substring(0, 40),
    };
  }, SEL.vp);
  console.log(`\n  Shift-Tab #2:`);
  console.log(
    `    Focus: <${afterShiftTab2.tag}> class="${afterShiftTab2.class}" id="${afterShiftTab2.id}"`,
  );
  console.log(
    `    Role: ${afterShiftTab2.role}, tabindex: ${afterShiftTab2.tabindex}`,
  );
  console.log(`    Inside list: ${afterShiftTab2.isInsideList}`);
  if (afterShiftTab2.itemIndex >= 0) {
    console.log(
      `    ⚠ Focus landed on item index ${afterShiftTab2.itemIndex} inside the list`,
    );
  }
  console.log(`    Text: "${afterShiftTab2.text}"`);
  console.log(`    Scroll: ${afterShiftTab2.scrollTop}`);

  // Step 6: Shift-Tab #3 (to see where it goes next)
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await s.wait(500);

  const afterShiftTab3 = await page.evaluate((sel) => {
    const el = document.activeElement;
    const vp = document.querySelector(sel);
    const isInsideList = document.querySelector(".vlist")?.contains(el);
    return {
      tag: el?.tagName,
      class: el?.className?.substring(0, 60),
      id: el?.id,
      isInsideList,
      scrollTop: vp ? Math.round(vp.scrollTop) : null,
      text: el?.textContent?.trim()?.substring(0, 40),
    };
  }, SEL.vp);
  console.log(`\n  Shift-Tab #3:`);
  console.log(
    `    Focus: <${afterShiftTab3.tag}> class="${afterShiftTab3.class}" id="${afterShiftTab3.id}"`,
  );
  console.log(`    Inside list: ${afterShiftTab3.isInsideList}`);
  console.log(`    Text: "${afterShiftTab3.text}"`);
  console.log(`    Scroll: ${afterShiftTab3.scrollTop}`);

  // Summary
  const scrollDelta = (afterShiftTab2.scrollTop ?? 0) - (scrollBefore ?? 0);
  console.log(`\n  ─── SUMMARY ───`);
  console.log(`  Scroll delta after shift-tabs: ${scrollDelta}px`);
  console.log(
    `  Focus entered list interior: ${afterShiftTab2.isInsideList && afterShiftTab2.itemIndex >= 0}`,
  );

  if (afterShiftTab2.isInsideList && afterShiftTab2.itemIndex >= 0) {
    console.log(
      `  BUG CONFIRMED: shift-tab from outside jumped to item ${afterShiftTab2.itemIndex} inside the list`,
    );
  } else if (afterShiftTab1.isInsideList && afterShiftTab1.role === "listbox") {
    console.log(`  Focus landed on list container (expected behavior)`);
  }

  console.log("");
});
