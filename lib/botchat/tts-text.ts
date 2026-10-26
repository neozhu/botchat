// Select Latin-script speech from mixed Chinese/English responses locally.
// Removed text separates words; it must never concatenate neighboring words.
// This filters scripts rather than identifying languages sharing Latin letters.
export function extractEnglishSpeechText(text: string): string {
  const prose = text.normalize("NFKC")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove Chinese-only parenthetical translations as a unit so surrounding
    // English punctuation still belongs to the original English sentence.
    .replace(/\(([^()]*)\)/g, (parenthetical, content: string) =>
      /\p{Script=Han}/u.test(content) && !/\p{Script=Latin}/u.test(content)
        ? " "
        : parenthetical)
    .replace(/。/g, ".")
    .replace(/、/g, ",");

  const spans = prose.match(/[\p{Script=Latin}\p{Mark}0-9\s.,!?;:'"‘’“”()\[\]\-–—/$%+&]+/gu) ?? [];

  const englishSpans: string[] = [];
  for (const span of spans) {
    if (!/\p{Script=Latin}/u.test(span)) {
      const punctuation = span.trim();
      const previous = englishSpans.at(-1);
      if (previous && /^[.!?]+$/.test(punctuation) && !/[.!?]$/.test(previous)) {
        englishSpans[englishSpans.length - 1] += punctuation;
      }
      continue;
    }

    const english = span
      .replace(/^[\s.,!?;:)\]]+/g, "")
      .replace(/[\s(\[/]+$/g, "")
      .trim();
    if (english) englishSpans.push(english);
  }

  return englishSpans
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}
