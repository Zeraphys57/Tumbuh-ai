"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ReactMarkdown from "react-markdown";

interface MonthlyInsightAddonProps {
  clientId: string;
  selectedMonth: string;
  leads: any[];
}

export default function MonthlyInsightAddon({ clientId, selectedMonth, leads }: MonthlyInsightAddonProps) {
  const [insight, setInsight] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const addonKey = `ai_insight_${selectedMonth}`;

  // --- LOGIKA SMART DATE LOCK (VERSI ABSOLUT - ANTI BOCOR TOKEN) ---
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const nextMonthFromSelected = new Date(selYear, selMonth, 1);
  const unlockDateStr = `1 ${nextMonthFromSelected.toLocaleDateString('id-ID', { month: 'long' })}`;

  const isLocked = selectedMonth >= currentMonthStr;

  useEffect(() => {
    async function fetchInsight() {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", addonKey)
          .maybeSingle();

        setInsight(data?.content || "");
      } catch (err) {
        console.error("Gagal menarik data insight", err);
      } finally {
        setIsLoading(false); // BUG FIXED: Sekarang ditaruh di finally dengan rapi
      }
    }
    if (clientId && selectedMonth) fetchInsight();
  }, [clientId, selectedMonth, addonKey, supabase]);

  const handleGenerateInsight = async () => {
    if (leads.length === 0) {
      alert("Tidak ada data leads di periode ini untuk dianalisis.");
      return;
    }

    setIsGenerating(true);

    try {
      const needsData = leads
        .map((l, index) => `${index + 1}. ${l.customer_needs || 'General Inquiry'}`)
        .join("\n");

      const response = await fetch("/api/addons-api/generate-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          needs: needsData,
        }),
      });

      // BUG FIXED: Proteksi kalau server API AI nge-hang/down
      if (!response.ok) {
         throw new Error("Server AI Sedang Sibuk");
      }

      const result = await response.json();

      if (result.reply) {
        const aiText = result.reply;
        setInsight(aiText);

        await supabase.from("client_addons_data").upsert({
          client_id: clientId,
          addon_type: addonKey,
          content: aiText
        });
      }
    } catch (error) {
      console.error(error);
      alert("Gagal memproses AI. Coba lagi nanti.");
    } finally {
      setIsGenerating(false); // BUG FIXED: Tidak double call lagi
    }
  };

  const [year, month] = selectedMonth.split('-');
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Loading state dikembalikan ke dark mode
  if (isLoading) return <div className="animate-pulse bg-slate-900/50 h-40 rounded-[2.5rem] mb-8 border border-white/5 shadow-inner"></div>;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl mb-8 border border-indigo-500/20 relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.2)]">
      
      {/* Ornamen Background Premium Dikembalikan */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              Premium Addon
            </span>
            <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest italic">Tumbuh Analytics</span>
          </div>
          <h3 className="font-black text-2xl text-white tracking-tighter italic">AI Executive <span className="text-indigo-400 font-normal">Summary</span></h3>
          <p className="text-indigo-200/60 text-xs font-medium mt-1">Laporan strategis otomatis bulan {monthName}</p>
        </div>

        {/* LOGIKA TOMBOL EKSTRIM */}
        {!insight ? (
          <button 
            onClick={handleGenerateInsight}
            disabled={isGenerating || leads.length === 0 || isLocked}
            className={`flex-shrink-0 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border shadow-xl active:scale-95 ${
              isLocked 
                ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed shadow-none' 
                : 'bg-white text-indigo-900 hover:bg-indigo-50 border-white hover:shadow-indigo-500/20 hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <><span className="w-3 h-3 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin"></span> Processing...</>
            ) : isLocked ? (
              <>⏳ Terbuka Tgl {unlockDateStr}</>
            ) : (
              <>✨ Generate Laporan {monthName.split(' ')[0]}</>
            )}
          </button>
        ) : (
          /* JIKA SUDAH ADA, TOMBOL HILANG - GANTI STATUS FINAL */
          <div className="flex items-center gap-2 bg-indigo-500/10 px-5 py-3 rounded-2xl border border-indigo-500/30">
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
             <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest italic">Report Finalized</span>
          </div>
        )}
      </div>

      {insight && (
        <div className="mt-8 bg-black/30 p-6 md:p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-inner">
          <div className="text-indigo-50 text-[13px] leading-relaxed font-medium prose prose-invert prose-indigo max-w-none prose-a:text-indigo-400">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
             <p className="text-[9px] text-indigo-300/40 uppercase tracking-[0.2em] font-black italic">
               Processed by Tumbuh AI Node
             </p>
             <p className="text-[9px] text-indigo-300/40 uppercase tracking-widest font-bold">
               Ref: {leads.length} Data Points
             </p>
          </div>
        </div>
      )}
    </div>
  );
}