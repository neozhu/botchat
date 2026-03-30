type SidebarState = "expanded" | "collapsed";
type SidebarCollapsible = "offcanvas" | "icon" | "none";
type SidebarMobileBehavior = "sheet" | "icon";

export function getSidebarPresentation({
  isMobile,
  mobileBehavior,
  collapsible,
  state,
}: {
  isMobile: boolean;
  mobileBehavior: SidebarMobileBehavior;
  collapsible: SidebarCollapsible;
  state: SidebarState;
}) {
  const collapsibleDataValue = state === "collapsed" ? collapsible : "";

  if (isMobile && mobileBehavior === "icon") {
    return {
      collapsibleDataValue,
      mobileIconWidthClassName:
        state === "collapsed" ? "w-(--sidebar-width-icon)" : "w-(--sidebar-width)",
    };
  }

  return {
    collapsibleDataValue,
    mobileIconWidthClassName: null,
  };
}
