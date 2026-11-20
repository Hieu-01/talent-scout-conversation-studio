import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link } from "@tanstack/react-router";
import wave from "@/assets/login-wave.jpg";
import { Logo } from "./logo";
import { LoginBackgroundPicker } from "./login-background-picker";
import {
  pickBackground,
  resetBackground,
  setBackgroundDim,
  useCustomBackground,
} from "@/lib/use-custom-background";

export function LoginScene({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const { custom, dim } = useCustomBackground();
  const reset = resetBackground;

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] bg-gradient-login text-login-foreground md:min-h-[calc(100vh-3rem)] md:rounded-[2.5rem]">
        <AnimatePresence mode="popLayout">
          {custom ? (
            <motion.div
              key={custom.url}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {custom.bg.kind === "video" ? (
                <video
                  src={custom.url}
                  muted
                  loop
                  playsInline
                  autoPlay={!reduceMotion}
                  onError={() => reset()}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={custom.url} alt="" onError={() => reset()} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-background transition-opacity" style={{ opacity: dim }} />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <motion.img
                src={wave}
                alt=""
                width={1920}
                height={1152}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 0.95 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover mix-blend-screen float-slow"
              />
              <div className="absolute inset-0 bg-background transition-opacity" style={{ opacity: dim * 0.6 }} />
            </motion.div>
          )}
        </AnimatePresence>
        <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
          <Link to="/"><Logo /></Link>
          <span className="font-display text-sm tracking-widest opacity-80">CV SCREENING STUDIO</span>
        </header>
        <div className="relative z-10 flex items-center justify-center px-4 pb-20 pt-4 md:pt-10">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass-login w-full max-w-md rounded-[2rem] px-7 py-10 md:px-10"
          >
            {children}
          </motion.div>
        </div>
        <LoginBackgroundPicker custom={custom} dim={dim} onDim={setBackgroundDim} onPick={pickBackground} onReset={resetBackground} />
      </div>
    </div>
  );
}
