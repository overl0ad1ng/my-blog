interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
}

const cjkCharacter = String.raw`[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef\u2018-\u201f]`;
const softLineBreak = new RegExp(`(?<=${cjkCharacter})\\r?\\n[\\t ]*(?=${cjkCharacter})`, "gu");

export function remarkJoinCjkLines() {
  return joinTextLines;
}

function joinTextLines(node: MarkdownNode): void {
  // Markdown has already separated paragraphs, hard breaks, and code from prose.
  if (node.type === "text" && typeof node.value === "string") {
    node.value = node.value.replace(softLineBreak, "");
  }

  node.children?.forEach(joinTextLines);
}
