"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Loader2, PanelLeft, Trash2 } from "lucide-react";

type SessionItem = {
  id: string;
  expert_id: string;
  title: string;
  last_message: string | null;
  updated_at: string;
};

export type SessionsPanelProps = {
  isLoadingSessions: boolean;
  sessions: SessionItem[];
  activeSessionId: string | null;
  deletingSessionIds: Set<string>;
  removingSessionIds: Set<string>;
  nowMs: number;
  onToggleSidebar: () => void;
  onSelectSession: (session: SessionItem) => void | Promise<void>;
  onDeleteSession: (session: SessionItem) => void | Promise<void>;
  formatRelativeTime: (thenIso: string, nowMs: number) => string;
};

export function SessionsPanel({
  isLoadingSessions,
  sessions,
  activeSessionId,
  deletingSessionIds,
  removingSessionIds,
  nowMs,
  onToggleSidebar,
  onSelectSession,
  onDeleteSession,
  formatRelativeTime,
}: SessionsPanelProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border border-white/60 bg-[var(--panel-soft)]/90 shadow-[0_20px_60px_-40px_rgba(30,20,60,0.45)] backdrop-blur"
      mobileBehavior="icon"
    >
      <SidebarHeader className="gap-4 pb-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:pb-0">
        <div className="flex items-center justify-between px-3 pt-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
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
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={onToggleSidebar}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <SidebarSeparator className="bg-black/10 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="px-3 pt-2 group-data-[collapsible=icon]:hidden">
        <SidebarMenu className="gap-3">
          {isLoadingSessions
            ? Array.from({ length: 2 }).map((_, index) => (
                <SidebarMenuItem key={`session-skeleton-${index}`}>
                  <div className="flex min-h-[68px] items-center gap-3 rounded-2xl bg-white/40 px-3 py-3.5 pr-11">
                    <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
                    <div className="min-w-0 flex-1 space-y-2">
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
                      "group relative transition-[opacity,transform] duration-200",
                      isDeleting && "opacity-60",
                      isRemoving && "pointer-events-none opacity-0 translate-x-2"
                    )}
                  >
                    <SidebarMenuButton
                      isActive={item.id === activeSessionId}
                      tooltip={item.title}
                      className={cn(
                        "rounded-2xl py-3.5 px-3 min-h-[68px] pr-11",
                        "group-data-[collapsible=icon]:min-h-[52px] group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
                        item.id === activeSessionId
                          ? "bg-white shadow-[0_18px_40px_-28px_rgba(32,24,70,0.6)]"
                          : "hover:bg-white/70"
                      )}
                      onClick={() => {
                        void onSelectSession(item);
                      }}
                    >
                      <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
                        <AvatarFallback className="bg-[var(--user-bubble)] text-[10px] font-semibold group-data-[collapsible=icon]:text-xs">
                          {String(index + 1).padStart(2, "0")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2">
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
                        "absolute right-3 top-3.5 h-7 w-7 rounded-full text-muted-foreground opacity-0 transition",
                        "hover:bg-red-500/10 hover:text-red-600",
                        item.id === activeSessionId && "opacity-100",
                        "group-hover:opacity-100"
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
    </Sidebar>
  );
}

