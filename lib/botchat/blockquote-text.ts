export type QuoteTextNode = {
  type: string;
  value?: string;
  tagName?: string;
  children?: QuoteTextNode[];
};

const paragraphTags = new Set(["p", "blockquote", "pre", "ul", "ol", "table"]);
const lineTags = new Set(["li", "h1", "h2", "h3", "h4", "h5", "h6", "tr"]);

function nodeText(node: QuoteTextNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.type !== "element") return "";
  if (node.tagName === "br") return "\n";
  const text = (node.children ?? []).map(nodeText).join("");
  if (node.tagName === "td" || node.tagName === "th") return `${text.trim()}\t`;
  if (paragraphTags.has(node.tagName ?? "")) return `${text.replace(/\n+$/, "")}\n\n`;
  if (lineTags.has(node.tagName ?? "")) return `${text.replace(/[\t\n]+$/, "")}\n`;
  return text;
}

export function getBlockquoteText(node: QuoteTextNode | undefined): string {
  return node ? nodeText(node).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
}
