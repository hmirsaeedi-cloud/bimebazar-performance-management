import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { createRichTextPayload, htmlToPlainText, stripUnsafeHtml } from "../src/richText.mjs";

describe("richText", () => {
  test("removes scripts and event handlers", () => {
    const html = stripUnsafeHtml('<p onclick="bad()">Goal</p><script>alert(1)</script>');
    assert.equal(html, "<p>Goal</p>");
  });

  test("keeps simple editor formatting", () => {
    const html = stripUnsafeHtml("<p><strong>Goal</strong> <em>note</em></p>");
    assert.equal(html, "<p><strong>Goal</strong> <em>note</em></p>");
  });

  test("converts rich text to readable plain text", () => {
    assert.equal(htmlToPlainText("<p>First</p><ul><li>Second</li></ul>"), "First\nSecond");
  });

  test("creates normalized rich text payload with word count", () => {
    const payload = createRichTextPayload({ html: "<p>One two</p>" });
    assert.equal(payload.format, "rich_text");
    assert.equal(payload.plainText, "One two");
    assert.equal(payload.wordCount, 2);
  });
});
