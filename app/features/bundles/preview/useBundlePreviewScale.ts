import { useEffect, type RefObject } from "react";

const PREVIEW_WIDTH = 800;

export function useBundlePreviewScale(
  viewport: RefObject<HTMLDivElement | null>,
  frame: RefObject<HTMLIFrameElement | null>,
): void {
  useEffect(() => {
    const viewportNode = viewport.current;
    const frameNode = frame.current;
    if (!viewportNode || !frameNode) return;
    const resize = () => resizePreview(viewportNode, frameNode);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewportNode);
    return () => observer.disconnect();
  }, [frame, viewport]);
}

function resizePreview(viewport: HTMLDivElement, frame: HTMLIFrameElement): void {
  if (!viewport.clientWidth || !viewport.clientHeight) return;
  const scale = Math.min(viewport.clientWidth / PREVIEW_WIDTH, 1);
  frame.style.width = `${PREVIEW_WIDTH}px`;
  frame.style.height = `${viewport.clientHeight / scale}px`;
  frame.style.transform = `scale(${scale})`;
}
