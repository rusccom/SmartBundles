import { useEffect, type RefObject } from "react";

export function useBundlePreviewScale(
  viewport: RefObject<HTMLDivElement | null>,
  frame: RefObject<HTMLIFrameElement | null>,
  previewWidth: number,
): void {
  useEffect(() => {
    const viewportNode = viewport.current;
    const frameNode = frame.current;
    if (!viewportNode || !frameNode) return;
    const resize = () => resizePreview(viewportNode, frameNode, previewWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewportNode);
    return () => observer.disconnect();
  }, [frame, previewWidth, viewport]);
}

function resizePreview(
  viewport: HTMLDivElement,
  frame: HTMLIFrameElement,
  previewWidth: number,
): void {
  if (!viewport.clientWidth || !viewport.clientHeight) return;
  const scale = Math.min(viewport.clientWidth / previewWidth, 1);
  const left = Math.max(0, (viewport.clientWidth - previewWidth * scale) / 2);
  frame.style.left = `${left}px`;
  frame.style.width = `${previewWidth}px`;
  frame.style.height = `${viewport.clientHeight / scale}px`;
  frame.style.transform = `scale(${scale})`;
}
