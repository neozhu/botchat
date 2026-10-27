"use client";

import type { ComponentProps } from "react";
import type { ExtraProps } from "streamdown";
import { ResponseActions } from "@/components/botchat/response-actions";
import { getBlockquoteText } from "@/lib/botchat/blockquote-text";
import { cn } from "@/lib/utils";

export function AssistantBlockquote({ children, node, className, ...props }: ComponentProps<"blockquote"> & ExtraProps) {
  const text = getBlockquoteText(node);

  return (
    <blockquote {...props} data-streamdown="blockquote"
      className={cn("group/quote relative my-4 min-w-20 border-l-4 border-white/45 pl-4", className)}>
      <div data-quote-content className="min-w-0">{children}</div>
      <ResponseActions text={text} target="quote"
        className="absolute right-2 bottom-2 opacity-0 pointer-events-none transition-opacity group-hover/quote:opacity-100 group-hover/quote:pointer-events-auto group-focus-within/quote:opacity-100 group-focus-within/quote:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto" />
    </blockquote>
  );
}
