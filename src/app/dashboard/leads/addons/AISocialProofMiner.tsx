"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AISocialProofProps {
  clientId: string;
  leads: Lead[];
}

interface Testimonial {
  customer_initial: string;
  original_praise: string;
  suggested_caption: string;
  rating: number; 
}

export default function AISocialProofMiner({ clientId, leads }: AISocialProofProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN DARI DATABASE
  useEffect(() => {
    async function loadSavedTestimonials() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "social_proof_miner")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setTestimonials(parsedData);
        }
      } catch (err) {
        console.error("Gagal menarik data Social Proof:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedTestimonials();
  }, [clientId, supabase]);

  // 2. FUNGSI SCAN KE BACKEND AI & SIMPAN KE DB
  const runSentimentScan = async () => {
    if (leads.length === 0) {
      alert("Belum ada data pelanggan untuk digali testimoninya, Bos!");
      return;
    }

    if (testimonials.length > 0) {
      const confirmRegen = confirm("Scan ulang akan menghapus draft testimoni sebelumnya. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AISocialProofMiner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }), 
      });

      if (!response.ok) throw new Error("Gagal mengambil data AI Server");

      const data = await response.json();
      const realTestimonials: Testimonial[] = data.testimonials;

      // Update UI
      setTestimonials(realTestimonials);

      // Simpan persisten ke Supabase (Auto-Save)
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "social_proof_miner",
        content: realTestimonials
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Testimonial Scan failed", error);
      alert("Gagal menggali testimoni. Otak AI sedang sibuk!");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. FUNGSI HAPUS DATA (RESET)
  const deleteMinerData = async () => {
    setTestimonials([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "social_proof_miner");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  const copyContent = (idx: number, quote: string, caption: string) => {
    const textToCopy = `"${quote}"\n\nCaption IG/WA:\n${caption}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-white/5 rounded-[2.5rem] border border-white/10 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a] rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_-15px_rgba(139,92,246,0.3)] transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(139,92,246,0.5)] mb-10 h-fit flex flex-col group z-10">
      
      {/* GLOWING ORB BACKGROUND - VIOLET */}
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-125 group-hover:bg-violet-500/30"></div>
      
      <div className="relative z-10 p-8 flex justify-between items-start border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-violet-500/10 text-violet-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(167,139,250,0.8)]"></span>
              Standard Core
            </span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Content Engine</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-none mb-1 pr-10 drop-shadow-md">
            Social Proof <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-300">Miner</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium mt-1">
            AI mencari pujian dari pelanggan untuk bahan konten media sosial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {testimonials.length > 0 && !isScanning && (
            <button 
              onClick={deleteMinerData}
              className="p-3.5 rounded-[1.2rem] bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all shadow-sm"
              title="Clear Testimonials"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runSentimentScan}
            disabled={isScanning || leads.length === 0}
            className={`flex-shrink-0 px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center gap-2 border ${
              isScanning || leads.length === 0
                ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed' 
                : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-purple-500'
            }`}
          >
            {isScanning ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin"></span> Harvesting...</>
            ) : testimonials.length > 0 ? (
              <>🔁 Re-Harvest Content</>
            ) : (
              <>📸 Generate Content</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-[#060913]/50">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40">
              <div className="relative w-12 h-12 mb-4 text-violet-500 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <svg className="w-full h-full animate-[spin_3s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <svg className="absolute inset-0 w-6 h-6 m-auto animate-pulse text-fuchsia-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse text-violet-400">Mencari Sentimen Positif...</p>
           </div>
        ) : testimonials.length > 0 ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_5px_rgba(236,72,153,0.8)]"></span>
              Ready to Post (Siap Upload)
            </p>
            {testimonials.map((item, idx) => (
              <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 shadow-inner hover:border-violet-400/30 transition-all duration-300 group/card relative overflow-hidden">
                
                {/* Accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-fuchsia-500 opacity-50 group-hover/card:opacity-100 transition-opacity"></div>
                
                {/* QUOTE BOX (Gelap & Elegan) */}
                <div className="relative bg-black/20 rounded-xl p-5 border border-white/5 mb-5">
                   <div className="absolute -top-3 -left-2 text-5xl text-violet-500/20 font-serif leading-none">"</div>
                   <p className="text-slate-200 font-bold text-[13px] italic leading-relaxed relative z-10">
                     {item.original_praise}
                   </p>
                   <div className="mt-4 flex items-center justify-between">
                      <span className="bg-[#0d1322] text-violet-300 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-white/10">
                        {item.customer_initial}
                      </span>
                      <div className="flex text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]">
                         {[...Array(item.rating)].map((_, i) => (
                           <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest italic mb-1 flex items-center gap-1.5">
                      ✨ AI Generated Caption
                    </p>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {item.suggested_caption}
                    </p>
                  </div>
                  <button 
                    onClick={() => copyContent(idx, item.original_praise, item.suggested_caption)}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border ${
                       copiedIndex === idx 
                         ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-none' 
                         : 'bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500 hover:text-white hover:border-violet-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                    }`}
                  >
                    {copiedIndex === idx ? (
                      <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> Copied</span>
                    ) : (
                      "Copy All"
                    )}
                  </button>
                </div>
              </div>
            ))}
            
            <p className="text-[10px] text-center text-slate-500 font-bold mt-4">
              *Copy teks di atas dan gunakan sebagai bahan Canva, WA Status, atau Instagram Story hari ini!
            </p>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-40 text-center group-hover:text-slate-400 transition-colors duration-500">
              <svg className="w-12 h-12 mb-3 opacity-20 text-violet-400 group-hover:opacity-40 transition-opacity duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-xs font-bold italic text-slate-500 leading-relaxed drop-shadow-md">
                Belum ada testimoni baru.<br/>Semangat! AI akan melacak pujian berikutnya.
              </p>
           </div>
        )}
      </div>
    </div>
  );
}