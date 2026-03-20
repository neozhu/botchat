const MOBILE_COMPOSER_VIEWPORT_MAX_WIDTH = 768;
const MOBILE_COMPOSER_SINGLE_LINE_HEIGHT = 24;
const DESKTOP_COMPOSER_MAX_HEIGHT = 240;

export function getComposerTextareaSizing({
  scrollHeight,
  viewportWidth,
}: {
  scrollHeight: number;
  viewportWidth: number;
}) {
  if (viewportWidth < MOBILE_COMPOSER_VIEWPORT_MAX_WIDTH) {
    return {
      height: MOBILE_COMPOSER_SINGLE_LINE_HEIGHT,
      overflowY:
        scrollHeight > MOBILE_COMPOSER_SINGLE_LINE_HEIGHT ? "auto" : "hidden",
    } as const;
  }

  return {
    height: Math.min(scrollHeight, DESKTOP_COMPOSER_MAX_HEIGHT),
    overflowY: scrollHeight > DESKTOP_COMPOSER_MAX_HEIGHT ? "auto" : "hidden",
  } as const;
}
