"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import ServiceScheduleAddon from "../addons/ServiceScheduleAddon";

export default function ClinicDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [clinicAddonData, setClinicAddonData] = useState(""); // Ganti nama agar tidak 'daily'
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FUNGSI FETCH DATA
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const id = user?.user_metadata?.client_id;
      const name = user?.user_metadata?.name || "Admin";
      
      if (!id) return;

      setClientId(id);
      setClientName(name);

      const [leadsRes, clientRes, addonRes] = await Promise.all([
        // Ambil Leads
        supabase.from("leads").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        
        // Ambil System Prompt
        supabase.from("clients").select("system_prompt").eq("id", id).maybeSingle(),
        
        // Ambil Data Addon Promo Banner
        supabase.from("client_addons_data")
          .select("content")
          .eq("client_id", id)
          .eq("addon_type", "promo_banner")
          .maybeSingle()
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) setPrompt(clientRes.data.system_prompt || "");
      if (addonRes.data) setClinicAddonData(addonRes.data.content || "");
      else setClinicAddonData("");

    } catch (err) { 
      console.error("Refresh Failed:", err); 
    } finally { 
      setLoading(false); 
    }
  }, [supabase]);

  // 2. REAL-TIME SUBSCRIPTION (Pasang kembali agar pasien muncul otomatis)
  useEffect(() => {
    fetchData();
    if (!clientId) return;

    const channel = supabase
      .channel(`realtime-clinic-leads-${clientId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, clientId, supabase]);

  // 3. FUNGSI UPDATE DATA
  const handleUpdateClinicInfo = async () => {
    if (!clientId) return;
    setIsSaving(true);

    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, 
      addon_type: "promo_banner", 
      content: clinicAddonData 
    }, { onConflict: 'client_id,addon_type' });

    setIsSaving(false);
    if (!error) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      alert("Gagal update: " + error.message);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!clientId) return;
    setIsSaving(true);
    await supabase.from("clients").update({ system_prompt: prompt }).eq("id", clientId);
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPrompt((prev) => `${prev}\n\n[Data Medis]:\n${ev.target?.result}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-8 py-4 rounded-3xl shadow-2xl border border-emerald-50 font-black italic uppercase text-[10px]">
          Medical Node Synced!
        </div>
      )}

      <div className="max-w-7xl mx-auto flex justify-between items-center mb-16">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-200 text-2xl font-black italic">
              K
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Medical Node: <span className="text-emerald-600">{clientName}</span></h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sterile AI Control Environment</p>
           </div>
        </div>
        <button onClick={() => fetchData()} className="bg-slate-900 text-white px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all">
          {loading ? "Syncing..." : "Refresh System"}
        </button>
      </div>

      <ServiceScheduleAddon clientId={clientId} label="Jadwal Praktik Dokter" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
           <div className="bg-white rounded-[3rem] shadow-2xl border border-emerald-50 overflow-hidden">
              <div className="p-10 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/20">
                 <h3 className="font-black text-emerald-900 text-sm uppercase italic tracking-widest underline decoration-4 decoration-emerald-200">Patient Queue Status</h3>
              </div>
              <table className="w-full">
                 <thead>
                    <tr className="text-left text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50/50">
                       <th className="px-10 py-6">Patient Name</th>
                       <th className="px-10 py-6">Symptoms</th>
                       <th className="px-10 py-6 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-emerald-50">
                    {leads.map((lead) => (
                       <tr key={lead.id} className="hover:bg-emerald-50/30 transition-all">
                          <td className="px-10 py-8">
                             <p className="font-black text-slate-800 uppercase tracking-tighter text-lg">{lead.customer_name}</p>
                             <p className="text-[10px] font-bold text-slate-400 italic">{lead.customer_phone}</p>
                          </td>
                          <td className="px-10 py-8">
                             <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold inline-block border border-emerald-100">
                                {lead.customer_needs || "Check-up Umum"}
                             </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                             <a href={`https://wa.me/${lead.customer_phone}`} target="_blank" className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase italic shadow-lg shadow-emerald-100">Call Patient</a>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
           <div className="bg-emerald-900 p-12 rounded-[4rem] text-white shadow-3xl shadow-emerald-200">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-10">Doctor <span className="text-emerald-400 underline">Schedule</span></h3>
              <p className="text-[10px] font-black text-emerald-300 uppercase mb-4 opacity-70">Update Daily Availability</p>
              <textarea 
                 className="w-full h-40 bg-white/10 rounded-[2.5rem] p-8 text-xs font-bold border border-emerald-800 focus:border-emerald-400 outline-none transition-all italic text-emerald-50 mb-10"
                 value={clinicAddonData}
                 onChange={(e) => setClinicAddonData(e.target.value)}
                 placeholder="Input dokter yang bertugas..."
              />
              <button onClick={handleUpdateClinicInfo} className="w-full bg-emerald-500 text-white py-6 rounded-[2rem] font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-950/40">
                {isSaving ? "Syncing..." : "Sync Medical Schedule"}
              </button>
           </div>

           <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xl italic uppercase tracking-widest">Medical Brain</h3>
                <label className="cursor-pointer bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-emerald-600 transition-all">
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
              </div>
              <textarea 
                className="w-full h-64 bg-white/5 rounded-[2.5rem] p-8 text-xs font-bold text-emerald-50 italic outline-none border border-white/10 focus:border-emerald-500 transition-all mb-6"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button onClick={handleUpdatePrompt} disabled={isSaving} className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase italic hover:bg-white hover:text-emerald-600 transition-all">
                {isSaving ? "Syncing..." : "Update Intelligence"}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}