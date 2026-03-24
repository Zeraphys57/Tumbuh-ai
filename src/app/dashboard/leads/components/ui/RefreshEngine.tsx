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
      className={`relative overflow-hidden px-6 py-3 rounded-2xl font-black text-[10px] uppercase italic tracking-widest transition-all duration-300 border flex items-center gap-2.5 group ${
        loading 
          ? 'bg-blue-900/30 text-blue-400 border-blue-800/50 cursor-not-allowed shadow-inner backdrop-blur-sm' 
          : 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:bg-blue-600 hover:text-white hover:border-blue-400 active:scale-95 backdrop-blur-md'
      }`}
    >
      {/* Efek Cahaya Lewat (Shine/Glint) saat di-Hover */}
      {!loading && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none"></div>
      )}
      
      {/* Ikon Sync Canggih */}
      <svg 
        className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : 'group-hover:rotate-180 transition-transform duration-700 ease-in-out'}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>

      <span className="relative z-10">
        {loading ? "Re-calibrating..." : "Sync Engine"}
      </span>
    </button>
  );
}