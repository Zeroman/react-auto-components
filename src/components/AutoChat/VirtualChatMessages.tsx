"use no memo";
// The virtualizer instance is mutable TanStack state; memoizing its calls
// (React Compiler) returns stale window measurements — the paused-viewport
// drift in the large-history e2e. Opt the file out.
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useLayoutEffect,
  useImperativeHandle,
  type Ref,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { AutoChatMessage } from "./types";

export interface VirtualChatHandle {
  scrollToIndex(index: number): void;
}

export function VirtualChatMessages<T extends AutoChatMessage>({
  messages,
  viewport,
  content,
  following,
  autoFollow,
  estimate,
  overscan,
  renderRow,
  ref,
}: {
  messages: readonly T[];
  viewport: RefObject<HTMLDivElement | null>;
  content: RefObject<HTMLDivElement | null>;
  following: RefObject<boolean>;
  autoFollow: boolean;
  estimate: number;
  overscan: number;
  renderRow: (message: T, index: number) => ReactNode;
  ref?: Ref<VirtualChatHandle>;
}) {
  const [margin, setMargin] = useState(0);
  const getItemKey = useCallback(
    (index: number) => messages[index].id,
    [messages],
  );
  const virtual = useVirtualizer({
    count: messages.length,
    getScrollElement: () => viewport.current,
    getItemKey,
    estimateSize: () => estimate,
    overscan,
    useAnimationFrameWithResizeObserver: true,
    anchorTo: "end",
    followOnAppend: false,
    scrollEndThreshold: autoFollow && following.current ? 1 : -1,
    scrollMargin: margin,
    initialRect: { width: 800, height: 600 },
    initialOffset: () =>
      autoFollow
        ? Math.max(
            0,
            messages.length * estimate -
              (viewport.current?.clientHeight || 600),
          )
        : 0,
  });
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index) => virtual.scrollToIndex(index, { align: "start" }),
  }));
  const previous = useRef({
    count: messages.length,
    following: following.current,
  });
  useLayoutEffect(() => {
    const el = viewport.current;
    const root = content.current;
    if (el && root) {
      const next =
        root.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop;
      if (Math.abs(next - margin) > 0.5) setMargin(next);
    }
    const before = previous.current;
    if (before.following && !following.current && el)
      virtual.scrollToOffset(el.scrollTop);
    if (
      autoFollow &&
      following.current &&
      messages.length &&
      before.count !== messages.length
    )
      virtual.scrollToEnd();
    previous.current = { count: messages.length, following: following.current };
  });
  return (
    <div
      ref={content}
      className="auto-chat-messages"
      data-virtualized="true"
      style={{
        height: virtual.getTotalSize(),
        position: "relative",
        display: "block",
        overflowAnchor: "none",
      }}
    >
      {virtual.getVirtualItems().map((row) => (
        <div
          key={row.key}
          data-index={row.index}
          ref={virtual.measureElement}
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${row.start - margin}px)`,
            paddingBottom: "var(--auto-chat-gap, 16px)",
          }}
        >
          {renderRow(messages[row.index], row.index)}
        </div>
      ))}
    </div>
  );
}
