export function getSidebarChrome(isMobile: boolean) {
  return {
    mobileBehavior: isMobile ? "sheet" : "icon",
    showChatTrigger: isMobile,
  } as const;
}
