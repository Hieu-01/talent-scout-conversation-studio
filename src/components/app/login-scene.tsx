import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import wave from "@/assets/login-wave.jpg";
import { Logo } from "./logo";

export function LoginScene({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] bg-gradient-login text-login-foreground md:min-h-[calc(100vh-3rem)] md:rounded-[2.5rem]">
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
        <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
          <Link to="/"><Logo /></Link>
          <span className="font-display text-sm tracking-widest opacity-80">CV SCREENING STUDIO</span>
        </header>
        <div className="relative z-10 flex items-center justify-center px-4 pb-16 pt-4 md:pt-10">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass-login w-full max-w-md rounded-[2rem] px-7 py-10 md:px-10"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
