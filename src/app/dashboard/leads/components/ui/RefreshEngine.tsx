"use client";

interface RefreshEngineProps {
  onRefresh: () => void;
  loading: boolean;
}

export default function RefreshEngine({ onRefresh, loading }: RefreshEngineProps) {
  return (
    <button 
      onClick={onRefresh} 
      disabled={loading}
      className={`bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all text-[10px] uppercase italic tracking-widest ${
        loading ? 'opacity-70 cursor-not-allowed animate-pulse' : 'hover:-translate-y-1'
      }`}
    >
      {loading ? "Re-calibrating..." : "Refresh Engine"}
    </button>
  );
}