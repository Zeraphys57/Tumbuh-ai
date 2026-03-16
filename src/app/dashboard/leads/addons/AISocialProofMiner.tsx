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

    // UX: Konfirmasi sebelum membuang data lama
    if (testimonials.length > 0) {
      const confirmRegen = confirm("Scan ulang akan menghapus draft testimoni sebelumnya. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AISocialProofMiner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }), // Tidak perlu clientId karena pakai Flash (gratis)
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
    return <div className="h-64 bg-white rounded-[2.5rem] border border-slate-200 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-xl transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(139,92,246,0.15)] mb-10 h-fit flex flex-col group z-10">
      
      {/* Ornamen Bersih (Clean UI) Warna Violet Kreatif */}
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-violet-50 rounded-tl-[100px] pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-110"></div>
      
      <div className="relative z-10 p-8 flex justify-between items-start border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></span>
              Standard Core
            </span>
            <span className="text-violet-500 text-[10px] font-bold uppercase tracking-widest italic">Content Engine</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 italic tracking-tight leading-none mb-1 pr-10">
            Social Proof <span className="text-violet-500">Miner</span>
          </h2>
          <p className="text-slate-500 text-[11px] font-medium mt-1">
            AI mencari pujian dari pelanggan untuk bahan konten media sosial.
          </p>
        </div>

        {/* GABUNGKAN TOMBOL DELETE & ACTION DALAM SATU FLEX CONTAINER */}
        <div className="flex items-center gap-3">
          {testimonials.length > 0 && !isScanning && (
            <button 
              onClick={deleteMinerData}
              className="p-3.5 rounded-[1rem] bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all shadow-sm"
              title="Clear Testimonials"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runSentimentScan}
            disabled={isScanning || leads.length === 0}
            className={`flex-shrink-0 px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 border ${
              isScanning 
                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                : 'bg-violet-500 text-white hover:bg-violet-600 border-transparent hover:shadow-violet-500/30 hover:shadow-lg'
            }`}
          >
            {isScanning ? (
              <><span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span> Harvesting...</>
            ) : testimonials.length > 0 ? (
              <>🔁 Re-Harvest Content</>
            ) : (
              <>📸 Generate Content</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-slate-50/50">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40">
              <div className="relative w-12 h-12 mb-4 text-violet-400">
                <svg className="w-full h-full animate-[spin_3s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <svg className="absolute inset-0 w-6 h-6 m-auto animate-pulse text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse text-violet-500">Mencari Sentimen Positif...</p>
           </div>
        ) : testimonials.length > 0 ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              Ready to Post (Siap Upload)
            </p>
            {testimonials.map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm hover:border-violet-300 transition-all group/card">
                
                <div className="relative bg-gradient-to-br from-violet-50 to-white rounded-xl p-5 border border-violet-100 mb-4">
                   <div className="absolute -top-3 -left-2 text-4xl text-violet-300 opacity-50 font-serif">"</div>
                   <p className="text-slate-700 font-bold text-sm italic leading-relaxed relative z-10">
                     {item.original_praise}
                   </p>
                   <div className="mt-3 flex items-center justify-between">
                      <span className="bg-violet-100 text-violet-700 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-violet-200">
                        {item.customer_initial}
                      </span>
                      <div className="flex text-amber-400">
                         {[...Array(item.rating)].map((_, i) => (
                           <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest italic mb-1 flex items-center gap-1">
                      ✨ AI Generated Caption
                    </p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {item.suggested_caption}
                    </p>
                  </div>
                  <button 
                    onClick={() => copyContent(idx, item.original_praise, item.suggested_caption)}
                    className={`flex-shrink-0 px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                       copiedIndex === idx 
                         ? 'bg-green-50 text-green-600 border-green-200 shadow-none' 
                         : 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-500 hover:text-white hover:shadow-md'
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
            
            <p className="text-[9px] text-center text-slate-400 font-bold mt-4">
              *Copy teks di atas dan gunakan sebagai bahan Canva, WA Status, atau Instagram Story hari ini!
            </p>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40 text-center">
              <svg className="w-12 h-12 mb-3 opacity-30 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-xs font-bold italic text-slate-500">Belum ada testimoni baru.<br/>Semangat! AI akan melacak pujian berikutnya.</p>
           </div>
        )}
      </div>
    </div>
  );
}