"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import DailyMenuAddon from "../addons/DailyMenuAddon";
import PromoBannerAddon from "../addons/PromoBannerAddon";
import ServiceScheduleAddon from "../addons/ServiceScheduleAddon";



export default function RestoDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [prompt, setPrompt] = useState("");
  const [dailyInfo, setDailyInfo] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAddon, setIsSavingAddon] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("System Synced!");
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FUNGSI FETCH DATA (REFRESH ENGINE)
 // 1. FUNGSI FETCH DATA (DENGAN PENANGANAN NULL)
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
        supabase.from("leads").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("clients").select("system_prompt, features").eq("id", id).maybeSingle(),
        supabase.from("client_addons_data").select("content").eq("client_id", id).eq("addon_type", "daily_menu").maybeSingle()
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) {
        setPrompt(clientRes.data.system_prompt || "");
        setClientFeatures(clientRes.data.features || {});
      }
      if (addonRes.data) setDailyInfo(addonRes.data.content || "");

    } catch (err) {
      console.error("Refresh Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. REAL-TIME SUBSCRIPTION
  useEffect(() => {
    fetchData();
    if (!clientId) return;

    const channel = supabase
      .channel(`realtime-leads-${clientId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => [payload.new, ...currentLeads]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase, clientId]);

  // 3. FUNGSI FILE UPLOAD (PERBAIKAN ERROR TERMINAL)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPrompt((prev) => `${prev}\n\n[Data TXT]:\n${ev.target?.result}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      };
      reader.readAsText(file);
    } 
    else if (file.type === "application/pdf") {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
        }
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setPrompt((prev) => `${prev}\n\n[Data PDF]:\n${fullText}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        alert("Gagal membaca PDF. Pastikan file berbasis teks.");
      }
    }
  };

  // 4. FUNGSI UPDATE DATA
  const handleUpdateDailyInfo = async () => {
    if (!clientId) return;
    setIsSavingAddon(true);
    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, addon_type: "daily_menu", content: dailyInfo 
    }, { onConflict: 'client_id,addon_type' });
    setIsSavingAddon(false);
    if (!error) {
      setToastMessage("Menu Harian Berhasil Di-Broadcast!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      console.error("Update Error:", error);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const interactionData = [
    { day: 'Sen', chats: leads.filter(l => new Date(l.created_at).getDay() === 1).length || 0 },
    { day: 'Sel', chats: leads.filter(l => new Date(l.created_at).getDay() === 2).length || 0 },
    { day: 'Rab', chats: leads.filter(l => new Date(l.created_at).getDay() === 3).length || 0 },
    { day: 'Kam', chats: leads.filter(l => new Date(l.created_at).getDay() === 4).length || 0 },
    { day: 'Jum', chats: leads.filter(l => new Date(l.created_at).getDay() === 5).length || 0 },
    { day: 'Sab', chats: leads.filter(l => new Date(l.created_at).getDay() === 6).length || 0 },
    { day: 'Min', chats: leads.filter(l => new Date(l.created_at).getDay() === 0).length || 0 },
  ];


  return (
    <div className="min-h-screen bg-orange-50/50 p-8 font-sans">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white px-8 py-4 rounded-3xl shadow-2xl font-black italic uppercase text-[10px]">
          {toastMessage}
        </div>
      )}
      
      <header className="max-w-7xl mx-auto mb-12 border-b-4 border-orange-200 pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Kitchen <span className="text-orange-600">Resto Sedap</span></h1>
          <p className="text-orange-500 font-bold tracking-[0.3em] text-xs mt-2 uppercase italic">Babarsari Intelligence Node</p>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchData} className={`bg-white text-orange-600 px-8 py-4 rounded-2xl font-black border-2 border-orange-100 uppercase italic text-[10px] hover:bg-orange-50 transition-all ${loading ? 'animate-pulse' : ''}`}>
            {loading ? 'Syncing...' : 'Refresh Kitchen'}
          </button>
          <button onClick={handleLogout} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-[10px] hover:bg-red-600 transition-all">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto mb-12">
       {clientId && (
         <PromoBannerAddon 
           clientId={clientId} 
           addonType="promo_banner" 
           label="Promo Blast" 
         />
       )}
    </div>

    <ServiceScheduleAddon clientId={clientId} label="Jadwal Praktik Dokter" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border-t-8 border-orange-500 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Order Leads</p>
               <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic">{leads.length}</h2>
            </div>
            <div className="bg-orange-600 p-8 rounded-[3rem] shadow-xl text-white text-center">
               <p className="text-[10px] font-black opacity-60 uppercase mb-2">Engagements</p>
               <h2 className="text-6xl font-black tracking-tighter italic">16</h2>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-slate-800 text-xl uppercase italic tracking-widest">Active Table Reservations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-white p-8 rounded-[3rem] shadow-lg border border-orange-100 hover:rotate-1 transition-transform">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-14 w-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black italic">{lead.customer_name?.[0] || 'T'}</div>
                    <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-[10px] font-black uppercase italic">Ready</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-1">{lead.customer_name}</h4>
                  <p className="text-orange-500 font-bold mb-4">{lead.customer_phone}</p>
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Booking Info:</p>
                    <p className="text-sm font-bold italic text-slate-700">
                       {lead.total_people} Kursi | {lead.booking_time || lead.booking_date}
                    </p>
                  </div>
                  <a href={`https://wa.me/${lead.customer_phone}`} className="block text-center bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-colors">Confirm Table</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-4 border-orange-500">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 text-2xl font-black italic">B</div>
               <h3 className="font-black text-xl uppercase italic text-slate-900 tracking-tighter">Kitchen Sync</h3>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest leading-none">Daily Menu Info</p>
             <textarea 
                className="w-full h-32 bg-slate-50 rounded-[2rem] p-6 text-xs font-bold italic outline-none border-2 border-transparent focus:border-orange-500 transition-all mb-6"
                value={dailyInfo}
                onChange={(e) => setDailyInfo(e.target.value)}
                placeholder="Kepiting Rica, Ayam Goreng..."
              />
             <button onClick={handleUpdateDailyInfo} disabled={isSavingAddon} className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black uppercase italic shadow-xl shadow-orange-200 hover:scale-105 active:scale-95 transition-all">
               {isSavingAddon ? "Syncing..." : "Broadcast Menu"}
             </button>
          </div>

          <div className="space-y-4">
            {/* Add-on Utama */}
            <DailyMenuAddon clientId={clientId} addonType="daily_menu" label="Menu Harian" />
            <DailyMenuAddon clientId={clientId} addonType="promo_weekend" label="Promo Akhir Pekan" />
          </div>

          <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-xl italic uppercase tracking-widest">AI Trainer</h3>
              <label className="cursor-pointer bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-orange-600 transition-all">
                <input type="file" onChange={handleFileUpload} className="hidden" />
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </label>
            </div>
            <textarea 
              className="w-full h-64 bg-white/5 rounded-[2.5rem] p-8 text-xs font-bold text-orange-50 italic outline-none border border-white/10 focus:border-orange-500 transition-all mb-6"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button onClick={handleUpdatePrompt} disabled={isSaving} className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black uppercase italic hover:bg-white hover:text-orange-600 transition-all">
              {isSaving ? "Syncing Brain..." : "Update Intelligence"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}