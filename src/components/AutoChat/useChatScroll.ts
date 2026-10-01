import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** DOM anchoring also handles images and custom renderers resizing after commit. */
export function useChatScroll(autoFollow: boolean, virtual = false) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(autoFollow);
  const anchor = useRef<{ id: string; top: number } | null>(null);
  const [showLatest, setShowLatest] = useState(false);

  const remember = useCallback(() => {
    const el = viewport.current;
    if (virtual || !el || !content.current) return;
    const top = el.getBoundingClientRect().top;
    const row = Array.from(content.current.children).find(
      (child) => child.getBoundingClientRect().bottom > top,
    ) as HTMLElement | undefined;
    anchor.current = row
      ? { id: row.dataset.chatId!, top: row.getBoundingClientRect().top - top }
      : null;
  }, [virtual]);

  const scrollToBottom = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    following.current = true;
    el.scrollTop = el.scrollHeight;
    setShowLatest(false);
    remember();
  }, [remember]);

  const reconcile = useCallback(() => {
    const el = viewport.current;
    if (!el || el.clientHeight === 0) return;
    if (autoFollow && following.current) {
      el.scrollTop = el.scrollHeight;
    } else if (!virtual && anchor.current) {
      const saved = anchor.current;
      const row = Array.from(content.current?.children ?? []).find(
        (child) => (child as HTMLElement).dataset.chatId === saved.id,
      );
      if (row)
        el.scrollTop +=
          row.getBoundingClientRect().top -
          el.getBoundingClientRect().top -
          saved.top;
    }
    setShowLatest(el.scrollHeight - el.scrollTop - el.clientHeight > 48);
    remember();
  }, [autoFollow, remember, virtual]);

  // Run after every host render, including streamed updates to an existing row.
  useLayoutEffect(reconcile);
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(reconcile);
    });
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reconcile]);

  const onScroll = () => {
    const el = viewport.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 48;
    following.current = atBottom;
    setShowLatest(!atBottom);
    remember();
  };
  const pause = () => {
    following.current = false;
    remember();
  };
  return {
    viewport,
    content,
    following,
    showLatest,
    scrollToBottom,
    onScroll,
    pause,
  };
}
