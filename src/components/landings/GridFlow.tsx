"use client";
import { motion } from "framer-motion";

export default function GridFlow() {
  // Solusi TypeScript: Tambahkan ": any" di sini agar TS tidak rewel
  const pathAnim = (delayTime: number): any => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { 
      pathLength: [0, 1], 
      opacity: [0, 0.8, 0.1] 
    },
    transition: {
      duration: 3.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 1,
      delay: delayTime,
    }
  });

  return (
    <div className="absolute inset-0 w-full h-full -z-10 opacity-70 pointer-events-none">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-50"
      >
        <defs>
          <filter id="glow_indigo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
           <filter id="glow_cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g strokeWidth="1.5">
          {/* Garis Horizontal */}
          <motion.path d="M0 150 H1440" stroke="#4f46e5" filter="url(#glow_indigo)" {...pathAnim(0)} />
          <motion.path d="M0 350 H1440" stroke="#06b6d4" filter="url(#glow_cyan)" {...pathAnim(0.4)} />
          <motion.path d="M0 550 H1440" stroke="#4f46e5" filter="url(#glow_indigo)" {...pathAnim(0.8)} />
          <motion.path d="M0 750 H1440" stroke="#4f46e5" filter="url(#glow_indigo)" opacity="0.3" {...pathAnim(1.2)} />

          {/* Garis Vertikal */}
          <motion.path d="M200 0 V900" stroke="#4f46e5" filter="url(#glow_indigo)" {...pathAnim(0.2)} />
          <motion.path d="M500 0 V900" stroke="#06b6d4" filter="url(#glow_cyan)" opacity="0.5" {...pathAnim(0.6)} />
          <motion.path d="M900 0 V900" stroke="#4f46e5" filter="url(#glow_indigo)" {...pathAnim(1.0)} />
          <motion.path d="M1200 0 V900" stroke="#4f46e5" filter="url(#glow_indigo)" opacity="0.2" {...pathAnim(1.4)} />

          {/* Garis Diagonal (Jaringan Syaraf) */}
          <motion.path d="M200 150 L500 350 L900 150 L1200 350" stroke="#06b6d4" filter="url(#glow_cyan)" {...pathAnim(1.5)} />
          <motion.path d="M200 550 L500 350 M900 550 L1200 350" stroke="#4f46e5" filter="url(#glow_indigo)" {...pathAnim(1.8)} />
          <motion.path d="M0 900 L1440 0" stroke="#4f46e5" filter="url(#glow_indigo)" opacity="0.1" {...pathAnim(2.0)} />
        </g>
      </svg>
    </div>
  );
}