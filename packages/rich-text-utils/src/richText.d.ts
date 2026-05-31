export function stripUnsafeHtml(html: unknown): string;
export function htmlToPlainText(html: unknown): string;
export function createRichTextPayload(input: { html?: string }): {
  format: "rich_text";
  html: string;
  plainText: string;
  wordCount: number;
};
