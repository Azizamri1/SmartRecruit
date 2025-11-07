import { useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";
// import bgAnim from "../../assets/animations/background.json"; // <-- put your file here
import "./BackgroundAnimation.css";

type BackgroundAnimationProps = {
  /** Optional: slow down animation (1 = normal). Defaults to 1. */
  speed?: number;
  /** Optional: extra class for custom theming */
  className?: string;
};

export default function BackgroundAnimation({
  speed = 1,
  className = "",
}: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let anim: AnimationItem | null = null;

    if (containerRef.current) {
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: !prefersReduced,
        animationData: null, // Replace with imported JSON when available
        rendererSettings: {
          preserveAspectRatio: "xMidYMid slice",
          progressiveLoad: true,
          hideOnTransparent: true,
        },
      });

      // Handle reduced motion
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) anim.setSpeed(0.5);

      anim.setSpeed(Math.max(0.1, speed));

      // Pause when tab is not visible to save CPU
      const onVisibility = () => {
        if (!anim) return;
        if (document.hidden) anim.pause();
        else if (!prefersReduced) anim.play();
      };
      document.addEventListener("visibilitychange", onVisibility);

      // If reduced motion, stop at first frame
      if (prefersReduced) {
        anim.addEventListener("DOMLoaded", () => {
          anim?.goToAndStop(0, true);
        });
      }

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        anim?.destroy();
      };
    }
  }, [speed]);

  return <div className={`bg-anim ${className}`} aria-hidden="true" ref={containerRef} />;
}

