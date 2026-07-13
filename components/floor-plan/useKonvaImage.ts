"use client";

import { useEffect, useState } from "react";

export function useKonvaImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    const element = new window.Image();
    element.onload = () => setImage(element);
    element.onerror = () => setImage(null);
    element.src = src;

    return () => {
      element.onload = null;
      element.onerror = null;
    };
  }, [src]);

  return image;
}
