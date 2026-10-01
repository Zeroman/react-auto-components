import { useLayoutEffect, useRef, useState } from "react";

export function useViewportHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(420);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setHeight(Math.max(1, Math.floor(element.clientHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, height };
}
