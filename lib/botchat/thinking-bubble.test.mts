import test from "node:test";
import assert from "node:assert/strict";
import {
  THINKING_BUBBLE_DOT_CLASSNAMES,
  THINKING_BUBBLE_TEXT,
  getThinkingBubbleMotion,
} from "./thinking-bubble.ts";

test("getThinkingBubbleMotion returns the ordered three-dot jumping contract", () => {
  assert.equal(THINKING_BUBBLE_TEXT, "Thinking...");
  assert.deepEqual(THINKING_BUBBLE_DOT_CLASSNAMES, [
    "thinking-dot-1",
    "thinking-dot-2",
    "thinking-dot-3",
  ]);

  assert.deepEqual(getThinkingBubbleMotion(), {
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
        ease: [0.22, 1, 0.36, 1],
      },
    },
    dotVariants: {
      jump: {
        y: -6,
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatType: "mirror",
          ease: [0.42, 0, 0.58, 1],
        },
      },
    },
    dotsTransition: {
      staggerChildren: -0.16,
      staggerDirection: -1,
    },
  });
});
