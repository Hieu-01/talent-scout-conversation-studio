import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { resetBackground, useCustomBackground } from "@/lib/use-custom-background";

/** The device's chosen background, shown behind every signed-in screen. */
export function AppBackground() {
  const { custom, dim } = useCustomBackground();
  const reduceMotion = useReducedMotion();
  // Signed-in screens carry dense text, so keep the picture at least half-darkened.
  const overlay = Math.max(dim, 0.5);

  return (
    <AnimatePresence>
      {custom && (
        <motion.div
          key={custom.url}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none fixed inset-0 -z-10"
        >
          {custom.bg.kind === "video" ? (
            <video
              src={custom.url}
              muted
              loop
              playsInline
              autoPlay={!reduceMotion}
              onError={() => resetBackground()}
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={custom.url} alt="" onError={() => resetBackground()} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-background" style={{ opacity: overlay }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
