"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AIAnalystProps {
  clientId: string;
  leads: Lead[];
}

export default function AIAnalyst({ clientId, leads }: AIAnalystProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [analysisResult, setAnalysisResult] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN
  useEffect(() => {
    async function loadSavedAnalysis() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "ai_analyst")
          .maybeSingle();

        if (data && data.content) {
          const resultText = typeof data.content === 'object' ? data.content.analysis : data.content;
          setAnalysisResult(resultText || "");
        }
      } catch (err) {
        console.error("Gagal menarik data Analyst:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedAnalysis();
  }, [clientId, supabase]);

  // 2. RUN ANALYSIS
  const runExecutiveAnalysis = async () => {
    if (!leads || leads.length === 0) {
      alert("Belum ada data leads untuk dianalisa!");
      return;
    }

    if (analysisResult) {
      const confirmRegen = confirm("Analisa ulang akan menimpa laporan lama dan memotong kuota premium Anda. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(""); 

    try {
      const res = await fetch("/api/addons-api/AIAnalyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          leads: leads,
          clientId: clientId 
        }),
      });

      const data = await res.json();

      if (res.status === 403) {
        alert(data.error);
        setIsAnalyzing(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || `Server Error: ${res.status}`);

      let aiText = data.analysis || "Data tidak cukup untuk dianalisis saat ini.";
      
      // Update UI langsung
      setAnalysisResult(aiText);

      // Simpan ke Supabase 
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "ai_analyst",
        content: { analysis: aiText }
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysisResult("Maaf, koneksi ke Otak AI terputus. Silakan coba beberapa saat lagi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = async () => {
    setAnalysisResult(""); 
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "ai_analyst");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  // ======================================================================
  // 🌟 THE ULTIMATE MARKDOWN PARSER (ANTI-BUG) 🌟
  // ======================================================================
  const formatMarkdown = (text: string) => {
    let formattedText = text;

    // 1. PENGHANCUR CANGKANG JSON: Jika teks berawalan {"analysis":
    if (formattedText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(formattedText);
        formattedText = parsed.analysis || parsed.text || formattedText;
      } catch (e) {
        // Fallback hapus string JSON kasar
        formattedText = formattedText.replace(/^{"analysis":"/i, '').replace(/"}$/, '');
      }
    }

    // 2. Ubah literal "\n" menjadi karakter newline (Enter) sungguhan
    formattedText = formattedText.replace(/\\n/g, '\n');

    // 3. Ganti BOLD (**teks**)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-300 font-black not-italic">$1</strong>');
    
    // 4. Ganti ITALIC (*teks*) - Mencegah bentrok dengan list bullet
    formattedText = formattedText.replace(/(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)/g, '<i class="text-indigo-200">$1</i>');

    // 5. RENDER BULLET POINTS (* teks atau - teks)
    formattedText = formattedText.replace(/^[\*-]\s+(.*$)/gim, '<li class="ml-4 list-disc marker:text-indigo-500 mb-1">$1</li>');

    // 6. RENDER HEADINGS
    formattedText = formattedText.replace(/^### (.*$)/gim, '<h3 class="text-lg font-black text-white mt-6 mb-2 not-italic border-b border-indigo-500/20 pb-1">$1</h3>');
    formattedText = formattedText.replace(/^#### (.*$)/gim, '<h4 class="text-md font-black text-indigo-400 mt-4 mb-1 not-italic">$1</h4>');

    return { __html: formattedText };
  };

  if (isFetchingDB) {
    return <div className="h-48 bg-slate-900 rounded-[2.5rem] border border-indigo-900/50 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] mb-10 h-fit flex flex-col group">
      
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none"></div>

      <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 border-b border-white/5">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Premium Addon • Gemini Intelligence
          </div>
          
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-tight mb-3">
            AI Business <span className="text-indigo-400">Executive Analyst</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
            Biarkan kecerdasan buatan membaca {leads?.length || 0} data pelanggan Anda untuk merangkum tren, mendeteksi masalah, dan memberikan saran strategi bisnis secara instan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analysisResult && !isAnalyzing && (
            <button 
              onClick={clearAnalysis}
              className="p-3.5 rounded-[1.2rem] bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all shadow-sm"
              title="Hapus Analisis"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runExecutiveAnalysis}
            disabled={isAnalyzing || (!leads || leads?.length === 0)}
            className={`group relative px-6 py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 overflow-hidden shadow-xl border ${
              isAnalyzing 
                ? 'bg-slate-800 text-indigo-400 border-indigo-900/50 cursor-not-allowed'
                : 'bg-white text-slate-900 border-transparent hover:bg-indigo-50 hover:shadow-indigo-500/20'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isAnalyzing ? (
                <><span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span> Processing...</>
              ) : analysisResult ? (
                <>🔁 Re-Analyze Data</>
              ) : (
                <>Generate Insights</>
              )}
            </span>
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="px-8 pb-10 pt-6 animate-in fade-in slide-in-from-top-4 duration-700 relative z-10">
          <div className="bg-slate-950/80 rounded-[2rem] border border-indigo-500/20 p-8 text-slate-300 shadow-inner">
            <div className="max-w-none">
              <div 
                className="text-[13px] font-medium whitespace-pre-wrap opacity-90 leading-relaxed font-sans"
                dangerouslySetInnerHTML={formatMarkdown(analysisResult)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}