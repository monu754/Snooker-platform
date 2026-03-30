import test from "node:test";
import assert from "node:assert/strict";
import { getStreamEmbed } from "../lib/stream-embed.ts";

test("getStreamEmbed normalizes YouTube watch urls for embeds", () => {
  const result = getStreamEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "snooker.example.com", true);

  assert.equal(result?.type, "youtube");
  assert.match(result?.embedUrl || "", /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
});

test("getStreamEmbed supports YouTube live links", () => {
  const result = getStreamEmbed("https://www.youtube.com/live/dQw4w9WgXcQ?feature=share", "snooker.example.com");

  assert.equal(result?.type, "youtube");
  assert.match(result?.embedUrl || "", /dQw4w9WgXcQ/);
});

test("getStreamEmbed preserves video urls as direct media", () => {
  const result = getStreamEmbed("https://cdn.example.com/match.mp4");

  assert.deepEqual(result, {
    type: "video",
    embedUrl: "https://cdn.example.com/match.mp4",
  });
});
