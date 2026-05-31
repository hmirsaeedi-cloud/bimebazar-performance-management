const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "P", "BR", "UL", "OL", "LI", "H3", "H4"]);

export function stripUnsafeHtml(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sstyle='[^']*'/gi, "")
    .replace(/<\/?([a-z0-9-]+)(\s[^>]*)?>/gi, (match, tag) => {
      return allowedTags.has(String(tag).toUpperCase()) ? match.replace(/\s[^>]*>/, ">") : "";
    });
}

export function htmlToPlainText(html) {
  return stripUnsafeHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h3|h4)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createRichTextPayload(input) {
  const html = stripUnsafeHtml(input?.html ?? "");
  const plainText = htmlToPlainText(html);
  return {
    format: "rich_text",
    html,
    plainText,
    wordCount: plainText ? plainText.split(/\s+/).length : 0,
  };
}
