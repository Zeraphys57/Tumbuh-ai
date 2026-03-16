"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface ScheduleProps {
  clientId: string;
  label?: string; // Default: "Jadwal Layanan"
}

export default function ServiceScheduleAddon({ clientId, label = "Jadwal Layanan" }: ScheduleProps) {
  const [schedule, setSchedule] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // Pengganti alert()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadSchedule() {
      if (!clientId) return;
      const { data } = await supabase
        .from("client_addons_data")
        .select("content")
        .eq("client_id", clientId)
        .eq("addon_type", "service_schedule")
        .maybeSingle();

      if (data) setSchedule(data.content || "");
    }
    loadSchedule();
  }, [clientId, supabase]);

  const handleSync = async () => {
    if (!clientId) return;
    setIsSyncing(true);

    const { error } = await supabase.from("client_addons_data").upsert(
      { 
        client_id: clientId, 
        addon_type: "service_schedule", 
        content: schedule 
      }, 
      { onConflict: 'client_id,addon_type' }
    );

    setIsSyncing(false);
    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      console.error("Gagal update jadwal:", error.message);
    }
  };

  return (
    <div className="bg-emerald-50/50 border-2 border-emerald-100 p-6 md:p-8 rounded-[2.5rem] shadow-sm transition-all hover:shadow-emerald-500/10 hover:border-emerald-200 flex flex-col h-full">
      <div className="flex items-center gap-4 mb-5">
        <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-inner flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
           <h3 className="font-black uppercase text-sm text-emerald-950 tracking-tighter italic leading-none mb-1">{label}</h3>
           <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">Time Sync Node</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-end">
        <textarea 
          className="w-full h-[120px] bg-white border border-emerald-100 rounded-[1.5rem] p-5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all mb-4 resize-none leading-relaxed placeholder:text-emerald-900/20"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="Contoh: Senin-Jumat (08:00 - 17:00), Sabtu (Tutup)..."
        />

        <button 
          onClick={handleSync} 
          disabled={isSyncing} 
          className={`w-full py-4 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 italic ${
            showSuccess 
              ? 'bg-emerald-100 text-emerald-700 shadow-none cursor-default' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isSyncing ? "Syncing Time..." : showSuccess ? "Schedule Updated!" : "Update Schedule"}
        </button>
      </div>
    </div>
  );
}