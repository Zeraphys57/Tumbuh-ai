"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// --- IMPORT KOMPONEN UI ---
import StatsBoard from "./ui/StatsBoard";
import LeadsTable from "./ui/LeadsTable";
import AITrainer from "./ui/AITrainer";
import RefreshEngine from "./ui/RefreshEngine";
import WeeklyAnalyticsChart from "./ui/WeeklyAnalyticsChart";
import LiveChat from "./ui/LiveChat";
import EmergencyContact from "./ui/EmergencyContact"; 
import RAGTrainer from "./ui/RAGTrainer";

// --- IMPORT KOMPONEN ADD-ON FREEMIUM ---
import AITrainingCopilot from "../addons/AITrainingCopilot";
import AISocialProofMiner from "../addons/AISocialProofMiner";
import AIPromptOptimizer from "../addons/AIPromptOptimizer";

// --- IMPORT KOMPONEN ADD-ON PREMIUM ---
import AIAnalyst from "../addons/premium/AIAnalyst";
import AIGhostRecovery from "../addons/premium/AIGhostRecovery";
import AIUpsellEngine from "../addons/premium/AIUpsellEngine";
import AILeadScorer from "../addons/premium/AILeadScorer";
import AIMarketOracle from "../addons/premium/AIMarketOracle";       

// THE APEX TRINITY 👑
import AIBlueOceanNavigator from "../addons/premium/AIBlueOceanNavigator"; 
import AIBlackCardArchitect from "../addons/premium/AIBlackCardArchitect";
import AISyndicateEngine from "../addons/premium/AISyndicateEngine";

export default function DemoDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clientName, setClientName] = useState("");
  
  // STATE UNTUK ADD-ON & KNOWLEDGE
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [dailyInfo, setDailyInfo] = useState("");
  const [isSavingAddon, setIsSavingAddon] = useState(false); 

  // STATE UNTUK KONTAK DARURAT (WA ADMIN)
  const [adminPhone, setAdminPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
         setLoading(false);
         return;
      }

      const userMeta = session.user.user_metadata;
      const id = userMeta?.client_id;
      const name = userMeta?.name || "Admin";
      
      if (!id) {
         setLoading(false);
         return;
      }

      setClientId(id);
      setClientName(name);

      const [leadsRes, clientRes, addonRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, client_id, customer_name, customer_phone, customer_needs, total_people, booking_date, booking_time, is_bot_active, platform, created_at, full_chat") 
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("system_prompt, features").eq("id", id).maybeSingle(),
        supabase.from("client_addons_data").select("content").eq("client_id", id).eq("addon_type", "daily_menu").maybeSingle()
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) {
        setPrompt(clientRes.data.system_prompt || "");
        
        const featuresObj = clientRes.data.features || {};
        setClientFeatures(featuresObj);
        setAdminPhone(featuresObj.admin_whatsapp_number || ""); 
      }
      if (addonRes.data) setDailyInfo(addonRes.data.content || "");

    } catch (err) {
      console.error("Refresh Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => currentLeads.map(lead => lead.id === payload.new.id ? { ...lead, ...payload.new } : lead));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase, clientId]);

  const handleUpdateDailyInfo = async () => {
    if (!clientId) return;
    setIsSavingAddon(true);
    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, addon_type: "daily_menu", content: dailyInfo 
    }, { onConflict: 'client_id,addon_type' });
    setIsSavingAddon(false);
    if (!error) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
  };

  const handleUpdatePrompt = async () => {
    if (!clientId) return;
    setIsSaving(true);
    await supabase.from("clients").update({ system_prompt: prompt }).eq("id", clientId);
    setIsSaving(false);
    setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  };

  const handleUpdateAdminPhone = async () => {
    if (!clientId) return;
    setIsSavingPhone(true);
    
    const updatedFeatures = { 
      ...clientFeatures, 
      admin_whatsapp_number: adminPhone 
    };

    const { error } = await supabase.from("clients").update({ features: updatedFeatures }).eq("id", clientId);
    
    setIsSavingPhone(false);
    if (!error) { 
      setClientFeatures(updatedFeatures);
      setShowToast(true); 
      setTimeout(() => setShowToast(false), 3000); 
    } else {
      console.error("Gagal menyimpan nomor WA", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
           <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>
           <div className="absolute inset-2 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 animate-pulse drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]">Initializing Tumbuh AI System...</p>
      </div>
    );
  }

  return (
    // [UI UPGRADE 1]: Background Hitam Pekat dengan Efek Cahaya Ambient (Cyberpunk Vibe)
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Ambient Glow Effects (Hanya terlihat di layar besar) */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-[0_0_40px_rgba(34,197,94,0.3)] border border-green-500/30 uppercase text-[10px] font-black italic tracking-widest text-center flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            Intelligence Synced!
          </div>
        </div>
      )}

      <div className="relative z-10 p-4 md:p-8">
        {/* HEADER SECTION - HUD Style */}
        <div className="max-w-[1600px] mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase drop-shadow-md flex items-center gap-3">
              Node: 
              {/* [UI UPGRADE 2]: Nama Klien pakai Gradasi Text bersinar */}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 italic filter drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]">
                {clientName}
              </span>
            </h1>
            <p className="text-slate-500 font-bold mt-1 italic text-[10px] uppercase tracking-[0.3em]">Tumbuh AI • Autonomous Agent Controller</p>
          </div>
          <div className="flex items-center gap-3">
            {/* [UI UPGRADE 3]: Logout Button Dark Mode */}
            <button onClick={handleLogout} className="bg-slate-900/50 border-2 border-red-900/30 text-red-500 px-6 py-3 rounded-2xl font-black hover:bg-red-900/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all text-[10px] uppercase italic backdrop-blur-sm active:scale-95">
              Logout Interface
            </button>
            <RefreshEngine onRefresh={fetchData} loading={loading} />
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* KOLOM KIRI: OPERATIONS (8/12) */}
          <div className="lg:col-span-8 space-y-10">
            <StatsBoard totalLeads={leads.length} themeColor="blue" />

            <WeeklyAnalyticsChart leads={leads} />

            <AITrainingCopilot clientId={clientId} leads={leads} />

            <LeadsTable leads={leads} title="Database Leads Terkini" buttonColor="bg-green-500" />

            {/* [UI UPGRADE 4]: TERMINAL CHAT DARK MODE MAKSIMAL */}
            <div className="mt-12 bg-slate-950/60 rounded-[3rem] p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-800/60 backdrop-blur-xl">
               <div className="px-8 py-5 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40 rounded-t-[2.5rem]">
                  <div>
                     <h2 className="text-white text-lg font-black italic tracking-widest uppercase">Communication Terminal</h2>
                     <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">Live Neural Network Interaction</p>
                  </div>
                  <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                     <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">Live</span>
                  </div>
               </div>
               {/* Note: Pastikan Komponen LiveChat di dalamnya juga pakai dark mode kalau bisa! */}
               <div className="bg-slate-900/20 rounded-[2.5rem] overflow-hidden">
                  <LiveChat />
               </div>
            </div>

            <hr className="border-slate-800/60 my-16 border-2 border-dashed" />

            {/* REVENUE & INNOVATION SECTION */}
            <div className="mb-8 mt-16">
                <h2 className="text-3xl font-black italic tracking-tight uppercase text-white drop-shadow-md">Elite Operations</h2>
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">C-Level Artificial Intelligence Suite</p>
            </div>

            <div className="space-y-10">
               <AIAnalyst clientId={clientId} leads={leads}/>
               <AIGhostRecovery clientId={clientId} leads={leads} />
               <AIUpsellEngine clientId={clientId} leads={leads} />
               <AILeadScorer clientId={clientId} leads={leads} />
               <AIMarketOracle clientId={clientId} leads={leads} avgTicketSize={250000} />
               
               <AIBlueOceanNavigator clientId={clientId} leads={leads} />
               <AIBlackCardArchitect clientId={clientId} leads={leads} /> 
               <AISyndicateEngine clientId={clientId} leads={leads} />
            </div>
          </div>

          {/* KOLOM KANAN: BRAIN & ADD-ONS (4/12) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* [UI UPGRADE 5]: KNOWLEDGE NODE (GLASSMORPHISM PREMIUM) */}
            {clientFeatures?.has_addon && (
              <div className="bg-slate-900/60 p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(37,99,235,0.15)] border border-blue-500/20 relative overflow-hidden group backdrop-blur-xl">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none"></div>
                 
                 <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 className="font-black text-xl italic uppercase tracking-tighter text-white drop-shadow-md">
                      {clientFeatures?.addon_label || "Knowledge Node"}
                    </h3>
                 </div>

                 <div className="space-y-6 relative z-10">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 italic flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      Live Context Updates
                    </p>
                    <textarea 
                      className="w-full h-[180px] bg-slate-950/50 rounded-[2rem] p-6 text-xs font-bold border border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-200 leading-relaxed resize-none italic placeholder-slate-600 shadow-inner"
                      value={dailyInfo}
                      onChange={(e) => setDailyInfo(e.target.value)}
                      placeholder={clientFeatures?.addon_placeholder || "Ketik info menu hari ini..."}
                    />
                    <button onClick={handleUpdateDailyInfo} disabled={isSavingAddon} className="w-full bg-blue-600 text-white py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95 italic border border-blue-400/50">
                      {isSavingAddon ? "Syncing Neural Data..." : "Sync Intelligence Now"}
                    </button>
                 </div>
              </div>
            )}

            {/* Kirimkan variabel clientId yang ada di dashboard kamu */}
            <AIPromptOptimizer 
              currentPrompt={prompt} 
              setPrompt={setPrompt} 
              clientId={clientId} 
            />

            <AITrainer 
              prompt={prompt} 
              setPrompt={setPrompt} 
              handleUpdatePrompt={handleUpdatePrompt} 
              isSaving={isSaving} 
              setShowToast={setShowToast} 
            />

            <RAGTrainer clientId={clientId} />

            <EmergencyContact 
               adminPhone={adminPhone}
               setAdminPhone={setAdminPhone}
               handleUpdateAdminPhone={handleUpdateAdminPhone}
               isSavingPhone={isSavingPhone}
            />

            <AISocialProofMiner clientId={clientId} leads={leads} />

            {/* [UI UPGRADE 6]: FOOTER WATERMARK DARK MODE */}
            <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-[3rem] flex flex-col items-center justify-center text-center opacity-70 mt-12 shadow-inner backdrop-blur-sm">
               <div className="text-2xl font-black italic tracking-tighter mb-2 text-white">TUMBUH<span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">.AI</span></div>
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Enterprise Demo Environment v2.5</div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}