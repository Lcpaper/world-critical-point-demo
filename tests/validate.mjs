import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const game = await readFile(new URL("../game.js", import.meta.url), "utf8");
const prd = await readFile(new URL("../PRD.md", import.meta.url), "utf8");

assert.equal((html.match(/<path data-iso=/g) || []).length, 177, "world map must contain 177 country paths");
assert.match(game, /BigInt/, "game resources must use BigInt");
assert.doesNotMatch(game, /\s\/\s|\/=|Math\.round\([^)]*\//, "core rules must not use division operators");
assert.match(html, /id="debug-panel"/, "debug panel is required");
assert.match(html, /id="support-button"/, "support interaction is required");
assert.match(html, /id="cooldown-segments"/, "cooldown progress is required");
assert.match(prd, /单次最多：100 份/, "PRD must define the per-drop cap");
assert.match(prd, /正式版本默认冷却：30 秒/, "PRD must define the cooldown");

console.log("Static demo validation passed");
