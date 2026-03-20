"use client";

import { useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { ChangePasswordDialog } from "@/components/botchat/change-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
} from "@/components/ui/sidebar";
import { ExpertSettingsDialog } from "@/components/botchat/expert-settings-dialog";
import type { ExpertRow } from "@/lib/botchat/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  KeyRound,
  Loader2,
  LogOut,
  PanelLeft,
  Settings,
  SlidersHorizontal,
  Trash2,
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
  onToggleSidebar: () => void;
  onSelectSession: (session: SessionItem) => void | Promise<void>;
  onDeleteSession: (session: SessionItem) => void | Promise<void>;
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
  onToggleSidebar,
  onSelectSession,
  onDeleteSession,
  formatRelativeTime,
  onExpertsUpdated,
  onExpertDeleted,
}: SessionsPanelProps) {
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <Sidebar
      collapsible="icon"
      className="border border-white/60 bg-[var(--panel-soft)]/90 shadow-[0_20px_60px_-40px_rgba(30,20,60,0.45)] backdrop-blur"
      mobileBehavior="icon"
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
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={onToggleSidebar}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
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
                        void onSelectSession(item);
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
          <Collapsible defaultOpen={false} className="group/settings">
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
    </Sidebar>
  );
}
