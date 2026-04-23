import { useState, useEffect } from "react";

export function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    let raf: number;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handler);
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(raf); };
  }, []);

  return {
    width,
    // Sidebar collapses below this width — show top picker instead
    narrowLayout: width < 780,
    // Very narrow — hide non-essential columns in ROM list
    mobileLayout:  width < 600,
  };
}
