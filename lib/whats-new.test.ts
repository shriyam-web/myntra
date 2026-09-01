import assert from "node:assert/strict";
import { getUnreadWhatsNew, latestWhatsNewId, type WhatsNewRelease } from "./whats-new";

const sample: WhatsNewRelease[] = [
  { id: "c", date: "3 Sep", title: "Third", items: ["c"] },
  { id: "b", date: "2 Sep", title: "Second", items: ["b"] },
  { id: "a", date: "1 Sep", title: "First", items: ["a"] },
];

assert.equal(latestWhatsNewId(sample), "c");
assert.equal(latestWhatsNewId([]), null);

assert.deepEqual(
  getUnreadWhatsNew(null, sample).map((r) => r.id),
  ["c", "b", "a"]
);
assert.deepEqual(
  getUnreadWhatsNew(undefined, sample).map((r) => r.id),
  ["c", "b", "a"]
);
assert.deepEqual(
  getUnreadWhatsNew("c", sample).map((r) => r.id),
  []
);
assert.deepEqual(
  getUnreadWhatsNew("b", sample).map((r) => r.id),
  ["c"]
);
assert.deepEqual(
  getUnreadWhatsNew("a", sample).map((r) => r.id),
  ["c", "b"]
);
assert.deepEqual(
  getUnreadWhatsNew("unknown", sample).map((r) => r.id),
  ["c", "b", "a"]
);

const alphaSeen = "c";
const deltaSeen = "b";
assert.equal(getUnreadWhatsNew(alphaSeen, sample).length, 0);
assert.deepEqual(getUnreadWhatsNew(deltaSeen, sample).map((r) => r.id), ["c"]);

assert.equal(latestWhatsNewId(), "2026-09-02-whats-new");
assert.ok(getUnreadWhatsNew(null).length >= 1);
assert.equal(getUnreadWhatsNew("2026-09-02-whats-new").length, 0);

const ids = sample.map((r) => r.id);
assert.equal(new Set(ids).size, ids.length);

console.log("whats-new tests passed");
