"use client";

import { useEffect, useMemo, useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { ChangePasswordDialog } from "@/components/botchat/change-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSidebarChrome } from "@/lib/botchat/sidebar-chrome";
import { ExpertSettingsDialog } from "@/components/botchat/expert-settings-dialog";
import type { ExpertRow } from "@/lib/botchat/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

type SessionItem = {
  id: string;
  expert_id: string;
  title: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionsPanelProps = {
  isLoadingSessions: boolean;
  experts: ExpertRow[];
  sessions: SessionItem[];
  activeSessionId: string | null;
  deletingSessionIds: Set<string>;
  removingSessionIds: Set<string>;
  nowMs: number;
  onSelectSession: (session: SessionItem) => void | Promise<void>;
  onDeleteSession: (session: SessionItem) => void | Promise<void>;
  onCreateSession: () => void | Promise<void>;
  formatRelativeTime: (thenIso: string, nowMs: number) => string;
  onExpertsUpdated?: (experts: ExpertRow[]) => void;
  onExpertDeleted?: (payload: {
    expertId: string;
    deletedSessionIds: string[];
    experts: ExpertRow[];
  }) => void;
};

export function SessionsPanel({
  isLoadingSessions,
  experts,
  sessions,
  activeSessionId,
  deletingSessionIds,
  removingSessionIds,
  nowMs,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  formatRelativeTime,
  onExpertsUpdated,
  onExpertDeleted,
}: SessionsPanelProps) {
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SessionItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const sidebarChrome = getSidebarChrome(isMobile);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!searchDialogOpen) return;
    if (!normalizedQuery) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const abort = new AbortController();
    setIsSearching(true);

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/sessions/search?q=${encodeURIComponent(normalizedQuery)}`,
            { signal: abort.signal }
          );

          if (!response.ok) {
            console.error("Failed to search sessions", await response.text());
            setSearchResults([]);
            return;
          }

          const payload = (await response.json()) as { sessions?: SessionItem[] };
          setSearchResults(Array.isArray(payload.sessions) ? payload.sessions : []);
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") return;
          console.error("Failed to search sessions", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 180);

    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [normalizedQuery, searchDialogOpen]);

  const filteredSessions = useMemo(() => {
    if (!normalizedQuery) return sessions;
    return searchResults ?? [];
  }, [normalizedQuery, searchResults, sessions]);

  const groupedSessions = useMemo(() => {
    const now = new Date(nowMs);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const groups: Array<{ label: string; items: SessionItem[] }> = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older", items: [] },
    ];

    for (const session of filteredSessions) {
      const updatedAtMs = new Date(session.updated_at).getTime();
      const ageDays = Math.floor((todayMs - updatedAtMs) / dayMs);

      if (ageDays <= 0) groups[0]?.items.push(session);
      else if (ageDays === 1) groups[1]?.items.push(session);
      else if (ageDays <= 7) groups[2]?.items.push(session);
      else groups[3]?.items.push(session);
    }

    return groups.filter((group) => group.items.length > 0);
  }, [filteredSessions, nowMs]);

  const handleSelectFromSearch = (session: SessionItem) => {
    void (async () => {
      await onSelectSession(session);
      setSearchDialogOpen(false);
      if (isMobile) setOpenMobile(false);
    })();
  };

  const handleCreateFromSearch = () => {
    void (async () => {
      await onCreateSession();
      setSearchDialogOpen(false);
      setSearchQuery("");
      if (isMobile) setOpenMobile(false);
    })();
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border border-white/60 bg-[var(--panel-soft)]/90 shadow-[0_20px_60px_-40px_rgba(30,20,60,0.45)] backdrop-blur"
      mobileBehavior={sidebarChrome.mobileBehavior}
    >
      <SidebarHeader className="gap-3 pb-2 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:pb-0">
        <div className="flex items-center justify-between px-2.5 pt-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="font-[var(--font-display)] text-base font-semibold tracking-tight">
              Sessions
            </span>
            {isLoadingSessions ? (
              <Skeleton className="h-5 w-10 rounded-full bg-muted/60" />
            ) : (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {sessions.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Search chat history"
              className="h-8 w-8 rounded-full group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9"
              onClick={() => setSearchDialogOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <SidebarTrigger className="h-8 w-8 rounded-full group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9" />
          </div>
        </div>
        <SidebarSeparator className="bg-black/10 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="px-2.5 pt-1.5 group-data-[collapsible=icon]:hidden">
        <SidebarMenu className="gap-2">
          {isLoadingSessions
            ? Array.from({ length: 2 }).map((_, index) => (
                <SidebarMenuItem key={`session-skeleton-${index}`}>
                  <div className="flex min-h-[58px] items-center gap-2.5 rounded-[20px] bg-white/40 px-3 py-2.5 pr-10">
                    <Skeleton className="h-7 w-7 rounded-full bg-muted/60" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-28 rounded-md bg-muted/60" />
                        <Skeleton className="ml-auto h-3 w-20 rounded-md bg-muted/60" />
                      </div>
                      <Skeleton className="h-3 w-[85%] rounded-md bg-muted/50" />
                    </div>
                  </div>
                </SidebarMenuItem>
              ))
            : sessions.map((item, index) => {
                const isDeleting = deletingSessionIds.has(item.id);
                const isRemoving = removingSessionIds.has(item.id);

                return (
                  <SidebarMenuItem
                    key={item.id}
                    className={cn(
                      "group/session-item relative transition-[opacity,transform] duration-200",
                      isDeleting && "opacity-60",
                      isRemoving && "pointer-events-none opacity-0 translate-x-2"
                    )}
                  >
                    <SidebarMenuButton
                      isActive={item.id === activeSessionId}
                      tooltip={item.title}
                      className={cn(
                        "min-h-[58px] rounded-[20px] px-3 py-2.5 pr-10",
                        "group-data-[collapsible=icon]:min-h-[46px] group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                        item.id === activeSessionId
                          ? "bg-white shadow-[0_18px_40px_-28px_rgba(32,24,70,0.6)]"
                          : "hover:bg-white/70"
                      )}
                      onClick={() => {
                        void (async () => {
                          await onSelectSession(item);
                          if (isMobile) setOpenMobile(false);
                        })();
                      }}
                    >
                      <Avatar className="h-7 w-7 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                        <AvatarFallback className="bg-[var(--user-bubble)] text-[10px] font-semibold group-data-[collapsible=icon]:text-xs">
                          {String(index + 1).padStart(2, "0")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                            {item.title}
                          </span>
                          <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                            {formatRelativeTime(item.updated_at, nowMs)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.last_message ?? "—"}
                        </p>
                      </div>
                    </SidebarMenuButton>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete session"
                      disabled={isDeleting}
                      className={cn(
                        "absolute right-2.5 top-2.5 h-6 w-6 rounded-full text-muted-foreground opacity-0 transition",
                        "hover:bg-red-500/10 hover:text-red-600",
                        item.id === activeSessionId && "opacity-100",
                        "group-hover/session-item:opacity-100"
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onDeleteSession(item);
                      }}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </SidebarMenuItem>
                );
              })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto px-2.5 pb-3">
        <SidebarMenu className="gap-1">
          <Collapsible asChild defaultOpen={false} className="group/settings">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip="Settings"
                  className={cn(
                    "rounded-[20px] px-3 py-2",
                    "hover:bg-white/70",
                    "group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium group-data-[collapsible=icon]:hidden">
                    Settings
                  </span>
                  <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/settings:rotate-180 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="mt-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Workspace
                  </p>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <button
                        type="button"
                        onClick={() => setExpertDialogOpen(true)}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-xs">Expert System</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Account
                  </p>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <button
                        type="button"
                        onClick={() => setPasswordDialogOpen(true)}
                      >
                        <KeyRound className="h-4 w-4" />
                        <span className="text-xs">Change password</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <form action={signOutAction}>
                      <SidebarMenuSubButton asChild>
                        <button type="submit">
                          <LogOut className="h-4 w-4" />
                          <span className="text-xs">Log out</span>
                        </button>
                      </SidebarMenuSubButton>
                    </form>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>

        <ExpertSettingsDialog
          open={expertDialogOpen}
          onOpenChange={setExpertDialogOpen}
          experts={experts}
          onExpertsUpdated={onExpertsUpdated}
          onExpertDeleted={onExpertDeleted}
        />
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />
      </SidebarFooter>

      <Dialog
        open={searchDialogOpen}
        onOpenChange={(open) => {
          setSearchDialogOpen(open);
          if (!open) {
            setSearchQuery("");
            setSearchResults(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-3 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">Search chat history</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or latest message..."
              autoFocus
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Close search dialog"
              className="h-8 w-8 rounded-full"
              onClick={() => setSearchDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-2 pb-2">
            <Button
              type="button"
              variant="ghost"
              className="mb-2 flex h-11 w-full items-center justify-start gap-2 rounded-xl px-3 text-sm"
              onClick={handleCreateFromSearch}
            >
              <Plus className="h-4 w-4" />
              <span>New chat</span>
            </Button>

            {isSearching ? (
              <div className="space-y-2 px-1 pb-2 pt-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`searching-row-${index}`}
                    className="animate-pulse rounded-xl border bg-muted/30 px-3 py-2"
                  >
                    <Skeleton className="h-4 w-1/2 rounded-md bg-muted/70" />
                    <Skeleton className="mt-2 h-3 w-4/5 rounded-md bg-muted/60" />
                  </div>
                ))}
              </div>
            ) : groupedSessions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No chats found.
              </p>
            ) : (
              <div className="animate-in fade-in-0 zoom-in-95 duration-200">
                {groupedSessions.map((group) => (
                  <div key={group.label} className="mb-3">
                    <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          className={cn(
                            "flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-all duration-200",
                            "animate-in fade-in-0 slide-in-from-bottom-1",
                            session.id === activeSessionId
                              ? "bg-accent"
                              : "hover:bg-accent/70"
                          )}
                          onClick={() => handleSelectFromSearch(session)}
                        >
                          <span className="w-full truncate text-sm font-medium">
                            {session.title}
                          </span>
                          <span className="w-full truncate text-xs text-muted-foreground">
                            {session.last_message ?? "—"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
