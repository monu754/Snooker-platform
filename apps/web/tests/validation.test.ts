import test from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  validateChatMessageInput,
  validateMatchInput,
  validateMatchPatchInput,
  validatePlayerProfileInput,
  validateRegistrationInput,
  validateSubscriptionCheckoutInput,
} from "../lib/validation.ts";
import { sanitizeChatText } from "../lib/chat-moderation.ts";
import { generateBracket } from "../lib/brackets.ts";

test("validateRegistrationInput normalizes and validates", () => {
  const result = validateRegistrationInput({
    name: "  Ronnie  ",
    email: "RONNIE@example.com ",
    password: "supersecure123",
  });

  assert.deepEqual(result, {
    name: "Ronnie",
    email: "ronnie@example.com",
    password: "supersecure123",
  });
});

test("validateRegistrationInput rejects short passwords", () => {
  assert.throws(
    () => validateRegistrationInput({ name: "A", email: "a@example.com", password: "short" }),
    ValidationError,
  );
});

test("validateMatchInput validates required production fields", () => {
  const result = validateMatchInput({
    title: "A vs B",
    playerA: "A",
    playerB: "B",
    format: "standard",
    totalFrames: 7,
    scheduledTime: "2026-03-22T10:00:00.000Z",
    venue: "Crucible",
    streamUrl: "https://youtube.com/watch?v=abcdefghijk",
    thumbnailUrl: "https://example.com/match.jpg",
  });

  assert.equal(result.totalFrames, 7);
  assert.equal(result.venue, "Crucible");
});

test("validateMatchPatchInput only accepts known fields", () => {
  const result = validateMatchPatchInput({
    status: "live",
    streamUrl: "https://example.com/live",
    ignored: "value",
  });

  assert.deepEqual(result.updates, {
    status: "live",
    streamUrl: "https://example.com/live",
  });
});

test("validateChatMessageInput trims message text", () => {
  const result = validateChatMessageInput({ text: "  Great shot  " });
  assert.equal(result.text, "Great shot");
});

test("chat moderation masks abusive language", () => {
  const result = validateChatMessageInput({ text: "you are a bitch" });
  assert.equal(result.text, "you are a bitch");
  assert.equal(sanitizeChatText(result.text), "you are a ****");
});

test("chat moderation masks common obfuscations", () => {
  assert.equal(sanitizeChatText("you are a b1tch"), "you are a ****");
  assert.equal(sanitizeChatText("what the f*ck was that"), "what the **** was that");
});

test("validateChatMessageInput rejects spammy messages", () => {
  assert.throws(
    () => validateChatMessageInput({ text: "SPAM SPAM SPAM SPAM" }),
    /spam/i,
  );
});

test("validatePlayerProfileInput normalizes optional player fields", () => {
  const result = validatePlayerProfileInput({
    name: "  Ronnie O'Sullivan ",
    country: " England ",
    rank: "1",
    bio: " World champion ",
  });

  assert.deepEqual(result, {
    name: "Ronnie O'Sullivan",
    country: "England",
    rank: 1,
    bio: "World champion",
  });
});

test("validatePlayerProfileInput rejects invalid rank values", () => {
  assert.throws(
    () => validatePlayerProfileInput({ name: "Player", rank: 0 }),
    ValidationError,
  );
});

test("validateSubscriptionCheckoutInput only allows billable tiers", () => {
  assert.deepEqual(validateSubscriptionCheckoutInput({ tier: "plus" }), { tier: "plus" });
  assert.throws(() => validateSubscriptionCheckoutInput({ tier: "free" }), ValidationError);
});

test("generateBracket pads the field to the next power of two", () => {
  const bracket = generateBracket(["Ronnie", "Judd", "Mark"]);
  assert.equal(bracket.bracketSize, 4);
  assert.equal(bracket.rounds[0]?.length, 2);
});
