import React, { useEffect, useState } from "react";

interface RainDrop {
  id: string;
  left: number; // percentage (0-100)
  duration: number; // seconds (0.8 - 1.8)
  delay: number; // seconds (0 - 2.5)
  height: number; // pixels (40 - 80)
  opacity: number; // 0.2 - 0.7
  width: number; // 1 - 2px for depth
}

interface RainBackgroundProps {
  dropCount?: number;
}

export const RainBackground: React.FC<RainBackgroundProps> = ({ dropCount = 70 }) => {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMotionChange);

    // Generate rain drops with deterministic properties
    const generatedDrops: RainDrop[] = Array.from({ length: dropCount }, (_, index) => ({
      id: `drop-${index}-${Math.random().toString(36).substring(2, 9)}`,
      left: Math.random() * 100,
      duration: 0.8 + Math.random() * 1.0, // 0.8s to 1.8s
      delay: Math.random() * 2.5, // 0s to 2.5s
      height: 40 + Math.random() * 40, // 40px to 80px
      opacity: 0.2 + Math.random() * 0.5, // Depth blur effect
      width: Math.random() > 0.6 ? 1.5 : 1, // Slight depth variation
    }));

    setDrops(generatedDrops);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, [dropCount]);

  if (reducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden" />
    );
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none"
      aria-hidden="true"
    >
      {/* Subtle ambient lighting effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Rain drops container */}
      <div className="relative w-full h-full">
        {drops.map((drop) => (
          <div
            key={drop.id}
            className="absolute top-0 rounded-full bg-gradient-to-b from-transparent via-blue-200/50 to-blue-100/90 animate-rain-fall"
            style={{
              left: `${drop.left}%`,
              height: `${drop.height}px`,
              width: `${drop.width}px`,
              opacity: drop.opacity,
              animationDuration: `${drop.duration}s`,
              animationDelay: `${drop.delay}s`,
              filter: drop.width === 1 ? "blur(0.4px)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default RainBackground;
