import { useAutoText } from "../../core/i18n";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
  type Key,
} from "react";
export interface AutoScrollHandle {
  scrollToIndex(index: number): void;
  reset(): void;
  getStartPos(): number;
  getScrollElement(): HTMLDivElement | null;
  syncStart(index: number): void;
}
export interface AutoScrollProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  height: number;
  rowHeight?: number;
  estimatedRowHeight?: number;
  mode?: "fixed" | "estimated";
  overscan?: number;
  initialOffset?: number;
  onScrollChange?: (event: {
    start: number;
    end: number;
    scrollTop: number;
  }) => void;
  ref?: Ref<AutoScrollHandle>;
}
export function AutoScroll<T>({
  items,
  getKey,
  renderItem,
  height,
  rowHeight = 40,
  estimatedRowHeight = 40,
  mode = "fixed",
  overscan = 5,
  initialOffset,
  onScrollChange,
  ref,
}: AutoScrollProps<T>) {
  const tr = useAutoText();
  const scroll = useRef<HTMLDivElement>(null);
  const silent = useRef(false);
  const virtual = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroll.current,
    getItemKey: (i) => getKey(items[i], i),
    estimateSize: () => (mode === "fixed" ? rowHeight : estimatedRowHeight),
    overscan,
    initialRect: {
      height,
      width: 800,
    },
    initialOffset,
    onChange: (v) => {
      if (!silent.current)
        onScrollChange?.({
          start: v.range?.startIndex ?? 0,
          end: v.range?.endIndex ?? -1,
          scrollTop: v.scrollOffset ?? 0,
        });
      silent.current = false;
    },
  });
  useEffect(() => {
    const el = scroll.current;
    if (el && el.scrollTop > Math.max(0, virtual.getTotalSize() - height))
      el.scrollTop = Math.max(0, virtual.getTotalSize() - height);
  }, [items.length, height, virtual]);
  const go = (index: number) =>
    virtual.scrollToIndex(Math.max(0, Math.min(index, items.length - 1)), {
      align: "start",
    });
  useImperativeHandle(ref, () => ({
    scrollToIndex: go,
    reset: () => virtual.scrollToOffset(0),
    getStartPos: () => virtual.range?.startIndex ?? 0,
    getScrollElement: () => scroll.current,
    syncStart(index) {
      silent.current = true;
      go(index);
    },
  }));
  return (
    <div
      ref={scroll}
      className="auto-root auto-scroll"
      style={{
        height,
        overflow: "auto",
        contain: "strict",
      }}
      tabIndex={0}
      aria-label={tr("滚动列表")}
    >
      <div
        style={{
          height: virtual.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtual.getVirtualItems().map((v) => (
          <div
            key={v.key}
            data-index={v.index}
            ref={mode === "estimated" ? virtual.measureElement : undefined}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: mode === "fixed" ? rowHeight : undefined,
              transform: `translateY(${v.start}px)`,
            }}
          >
            {renderItem(items[v.index], v.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
