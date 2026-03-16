"use client";
import React from "react";

export default function HyperGrid() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#020617]">
      
      {/* 1. CINEMATIC NOISE TEXTURE (Rahasia tekstur "Mahal" ala Apple/Stripe) */}
      <div 
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay z-10" 
        style={{ 
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" 
        }}
      ></div>

      {/* 2. PREMIUM DOTTED MATRIX (Bukan garis kaku, tapi titik halus ala Linear) */}
      <div 
        className="absolute inset-0 opacity-[0.2] z-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }}
      ></div>

      {/* 3. FLUID AURORA ORBS (Cahaya organik yang melayang sangat lambat) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[130px] mix-blend-screen animate-blob z-0"></div>
      
      <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-cyan-600/15 blur-[130px] mix-blend-screen animate-blob animation-delay-2000 z-0"></div>
      
      <div className="absolute bottom-[-10%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-violet-600/10 blur-[150px] mix-blend-screen animate-blob animation-delay-4000 z-0"></div>

      {/* 4. VIGNETTE SHADOW (Sisi pinggir lebih gelap agar fokus ke tengah tulisan) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-90 z-20"></div>

      {/* CSS Murni untuk Animasi Melayang (Fluid) */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 20s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}