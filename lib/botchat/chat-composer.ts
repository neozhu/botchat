const COMPOSER_MIN_HEIGHT = 24;
const COMPOSER_MAX_HEIGHT = 240;

export function getComposerTextareaSizing({
  value,
  scrollHeight,
}: {
  value: string;
  scrollHeight: number;
}) {
  if (value.length === 0) {
    return {
      height: COMPOSER_MIN_HEIGHT,
      overflowY: "hidden",
    } as const;
  }

  return {
    height: Math.min(Math.max(scrollHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT),
    overflowY: scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden",
  } as const;
}
