import type { Variants } from "motion/react";

export const THINKING_BUBBLE_TEXT = "Thinking...";
export const THINKING_BUBBLE_DOT_CLASSNAMES = [
  "thinking-dot-1",
  "thinking-dot-2",
  "thinking-dot-3",
] as const;
const SOFT_ENTRANCE_EASING = [0.22, 1, 0.36, 1] as [number, number, number, number];
const SOFT_BOUNCE_EASING = [0.42, 0, 0.58, 1] as [number, number, number, number];

export function getThinkingBubbleMotion() {
  return {
    container: {
      initial: {
        opacity: 0,
        y: 10,
      },
      animate: {
        opacity: 1,
        y: 0,
      },
      exit: {
        opacity: 0,
        y: 6,
      },
      transition: {
        duration: 0.3,
        ease: SOFT_ENTRANCE_EASING,
      },
    },
    dotVariants: {
      jump: {
        y: -6,
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatType: "mirror",
          ease: SOFT_BOUNCE_EASING,
        },
      },
    } satisfies Variants,
    dotsTransition: {
      staggerChildren: -0.16,
      staggerDirection: -1 as const,
    },
  };
}
