"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

// --- INTERFACES ---
interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  is_bot_active: boolean;
  created_at: string;
  platform?: string;
}

interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "admin";
  text: string;
  time: string;
  date: string;
}

const MESSAGES_PER_PAGE = 50; 

export default function LiveChat() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  const [clientId, setClientId] = useState("");
  const [clientSlug, setClientSlug] = useState("");

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false); // [FIX 2]: State loading saat ganti orang
  const [offset, setOffset] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const activePhoneRef = useRef<string | null>(null);
  
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    activePhoneRef.current = activePhone;
  }, [activePhone]);

  // Fungsi helper untuk scroll tanpa bikin layar website lompat (Membunuh bug snapping)
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    let channel: any;

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, slug')
        .eq('id', user.id) 
        .maybeSingle();

      const cId = clientData?.id || user.id; 
      const slug = clientData?.slug || "";

      setClientId(cId);
      setClientSlug(slug);

      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('client_id', cId)
        .order('created_at', { ascending: false });
        
      if (leadsData) setLeads(leadsData);

      if (slug) {
        const channelName = `livechat_${cId}_${Date.now()}`;
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_logs', filter: `client_id=eq.${slug}` },
            (payload) => {
              // 1. Kalau ini chat yang lagi dibuka, tambahkan ke bubble
              if (payload.new.customer_phone === activePhoneRef.current) {
                setChatLogs((prev) => [...prev, payload.new]);
                scrollToBottom(); // [FIX 1]: Ganti scrollIntoView dengan Smart Scroll
              }
              
              // 2. [FIX 3]: AUTO-BUMP KE ATAS! Kalau ada chat baru, geser kontak ke urutan 1
              setLeads((prev) => {
                const targetIndex = prev.findIndex(l => l.customer_phone === payload.new.customer_phone);
                if (targetIndex > 0) { // Kalau bukan urutan pertama, kita srobot ke atas!
                  const newLeads = [...prev];
                  const [bumpedLead] = newLeads.splice(targetIndex, 1);
                  return [bumpedLead, ...newLeads];
                }
                return prev;
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leads', filter: `client_id=eq.${cId}` },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setLeads((prev) => [payload.new as Lead, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                setLeads((prev) => prev.map(lead => lead.id === payload.new.id ? payload.new as Lead : lead));
              }
            }
          )
          .subscribe();
      }
    };

    fetchInitialData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!activePhone || !clientSlug) return;

    const fetchInitialChats = async () => {
      setIsSwitchingChat(true); // Mulai loading ganti chat biar gak nge-flash/lompat
      setOffset(0);
      setHasMore(true);

      const { data } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('client_id', clientSlug)
        .eq('customer_phone', activePhone)
        .order('created_at', { ascending: false }) 
        .range(0, MESSAGES_PER_PAGE - 1);

      if (data) {
        setChatLogs(data.reverse()); 
        setOffset(MESSAGES_PER_PAGE);
        setHasMore(data.length === MESSAGES_PER_PAGE);
        scrollToBottom();
      }
      setIsSwitchingChat(false); // Selesai loading
    };

    fetchInitialChats();
  }, [activePhone, clientSlug, supabase]);

  const handleScroll = async () => {
    if (scrollThrottleRef.current) return; 
    
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null;
    }, 300);

    if (!chatContainerRef.current || !activePhone || !clientSlug || isLoadingMore || !hasMore) return;

    if (chatContainerRef.current.scrollTop === 0) {
      setIsLoadingMore(true);
      const prevScrollHeight = chatContainerRef.current.scrollHeight;

      const { data } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('client_id', clientSlug)
        .eq('customer_phone', activePhone)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (data && data.length > 0) {
        const reversedNewData = data.reverse();
        setChatLogs(prev => [...reversedNewData, ...prev]);
        setOffset(prevOffset => prevOffset + data.length);
        setHasMore(data.length === MESSAGES_PER_PAGE);

        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - prevScrollHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
      setIsLoadingMore(false);
    }
  };

  const activeLead = leads.find(l => l.customer_phone === activePhone);
  const activeMessages: ChatMessage[] = [];

  chatLogs.forEach(log => {
    const dateObj = new Date(log.created_at);
    const time = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); 
    
    if (log.message) {
      activeMessages.push({ id: `${log.id}-in`, sender: 'customer', text: log.message, time, date });
    }
    if (log.response) {
      activeMessages.push({ id: `${log.id}-out`, sender: log.replied_by || 'ai', text: log.response, time, date });
    }
  });

  const toggleAiStatus = async () => {
    if (!activeLead) return;
    const newStatus = !activeLead.is_bot_active;
    setLeads(leads.map(l => l.id === activeLead.id ? { ...l, is_bot_active: newStatus } : l));
    await supabase.from('leads').update({ is_bot_active: newStatus }).eq('id', activeLead.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeLead || !clientSlug) return;

    if (activeLead.is_bot_active) {
      alert("⚠️ Harap 'Take Over Chat' (Matikan AI) terlebih dahulu sebelum membalas pesan pelanggan secara manual!");
      return;
    }

    const sentText = inputText;
    setInputText(""); 

    // [FIX 3]: AUTO-BUMP untuk pesan yang kita kirim sendiri
    setLeads((prev) => {
      const targetIndex = prev.findIndex(l => l.customer_phone === activePhone);
      if (targetIndex > 0) {
        const newLeads = [...prev];
        const [bumpedLead] = newLeads.splice(targetIndex, 1);
        return [bumpedLead, ...newLeads];
      }
      return prev;
    });

    const { error: dbError } = await supabase.from('chat_logs').insert({
        client_id: clientSlug,
        customer_phone: activePhone,
        message: "",
        response: sentText,
        replied_by: "admin",
        platform: activeLead.platform || 'whatsapp'
    });

    if (dbError) {
      console.error("❌ Gagal simpan chat ke DB:", dbError);
      return;
    }

    scrollToBottom();

    try {
      const apiUrl = activeLead.platform === 'instagram' ? '/api/instagram/send-manual' : '/api/whatsapp/send-manual';
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSlug, customerPhone: activePhone, text: sentText })
      });
    } catch (err) {
      console.error("❌ Gagal mengirim pesan ke API Meta:", err);
    }
  };

  return (
    <div className="flex h-[80vh] min-h-[600px] bg-slate-950 rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] text-slate-200">
      
      {/* KIRI: Daftar Kontak / Leads */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-900/50 relative z-20 shadow-xl shadow-black/20">
        <div className="p-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-black italic tracking-tight text-white drop-shadow-md">INBOX LEAD</h2>
          <p className="text-[10px] uppercase tracking-widest text-blue-400 mt-1 font-bold">Live Monitor</p>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
          {leads.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-40">
              <svg className="w-12 h-12 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase italic">Belum ada leads masuk</p>
            </div>
          )}

          {leads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => setActivePhone(lead.customer_phone)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all duration-200 ${activePhone === lead.customer_phone ? 'bg-blue-600/15 border-l-[6px] border-l-blue-500 shadow-inner' : 'border-l-[6px] border-l-transparent hover:bg-slate-800/50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold text-sm truncate ${activePhone === lead.customer_phone ? 'text-white' : 'text-slate-300'}`}>
                  {lead.platform === 'instagram' ? '🟪 ' : '🟩 '}
                  {lead.customer_name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 truncate font-mono tracking-wider">{lead.customer_phone}</p>
              <div className="mt-2 flex">
                <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest font-black shadow-sm ${lead.is_bot_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                  {lead.is_bot_active ? '🤖 AI Active' : '👨‍💻 Human Mode'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KANAN: Area Chat */}
      {activeLead ? (
        <div className="w-2/3 flex flex-col min-h-0 bg-slate-950 relative">
          {/* Background Elegen */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] pointer-events-none z-0"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
          
          <div className="px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex justify-between items-center z-10 shadow-md">
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                {activeLead.platform === 'instagram' ? '🟪' : '🟩'} {activeLead.customer_name}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono tracking-widest mt-0.5">{activeLead.customer_phone}</p>
            </div>

            <button 
              onClick={toggleAiStatus}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                activeLead.is_bot_active 
                ? 'bg-slate-800 text-slate-300 hover:bg-orange-500/20 hover:text-orange-400 border border-slate-700 hover:border-orange-500/50' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              }`}
            >
              <span className="relative flex h-2 w-2">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLead.is_bot_active ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${activeLead.is_bot_active ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
              </span>
              {activeLead.is_bot_active ? 'Take Over Chat' : 'Resume AI System'}
            </button>
          </div>

          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 z-10 custom-scrollbar relative scroll-smooth"
          >
            {/* Animasi Loading Transisi Lembut */}
            {isSwitchingChat && (
               <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-[10px] text-blue-400 font-black tracking-[0.2em] uppercase animate-pulse">Dekripsi Obrolan...</p>
               </div>
            )}

            {isLoadingMore && (
              <div className="flex justify-center my-4">
                 <span className="bg-slate-800/80 text-blue-400 text-[9px] px-4 py-1.5 rounded-full border border-blue-500/30 uppercase font-black tracking-widest animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                   Sinkronisasi Data Lama...
                 </span>
              </div>
            )}

            {!isSwitchingChat && activeMessages.map((msg, index) => {
              const isFirstMsgOfDay = index === 0 || activeMessages[index - 1].date !== msg.date;

              return (
                <React.Fragment key={msg.id}>
                  {isFirstMsgOfDay && (
                    <div className="flex justify-center my-6 sticky top-2 z-20">
                      <span className="bg-slate-900/90 backdrop-blur-sm text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] px-5 py-1.5 rounded-full border border-white/10 shadow-lg">
                        {msg.date}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-4 relative group transition-all duration-300 hover:shadow-lg ${
                      msg.sender === 'customer' 
                        ? 'bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/50' 
                        : msg.sender === 'ai'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-[0_0_20px_rgba(37,99,235,0.15)] border border-blue-500/30'
                        : 'bg-slate-700/80 text-white rounded-tr-sm border border-slate-600 border-l-4 border-l-orange-500' 
                    }`}>
                      <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      <div className={`text-[9px] mt-2 flex items-center justify-end gap-1.5 ${msg.sender === 'customer' ? 'text-slate-400' : 'text-white/70'}`}>
                        <span className="uppercase font-black tracking-widest opacity-80">
                          {msg.sender === 'ai' ? '🤖 AI Node' : msg.sender === 'admin' ? '👨‍💻 Human' : ''}
                        </span>
                        <span>•</span>
                        <span className="font-mono tracking-wider">{msg.time}</span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="p-4 bg-slate-900/95 border-t border-white/10 backdrop-blur-xl z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
            {!activeLead.is_bot_active && (
               <div className="mb-2.5 text-[10px] text-orange-400 font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5 px-2 bg-orange-500/10 w-fit py-1 rounded border border-orange-500/20">
                 ⚠️ AI Node Paused. Manual Override Active.
               </div>
            )}
            <form onSubmit={handleSendMessage} className={`flex gap-3 relative transition-all duration-300 ${activeLead.is_bot_active ? 'opacity-50 grayscale' : 'opacity-100'}`}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeLead.is_bot_active}
                placeholder={activeLead.is_bot_active ? "Sistem AI sedang bekerja. Klik 'Take Over' untuk manual..." : `Ketik balasan untuk ${activeLead.customer_name}...`}
                className={`flex-1 bg-black/40 border border-slate-700/80 rounded-xl px-5 py-3.5 text-sm text-white focus:outline-none transition-all placeholder:text-slate-500 placeholder:font-medium ${!activeLead.is_bot_active ? 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 cursor-text shadow-inner' : 'cursor-not-allowed'}`}
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || activeLead.is_bot_active}
                className="bg-blue-600 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:hover:shadow-none active:scale-95 flex items-center justify-center gap-2"
              >
                Send <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="w-2/3 flex items-center justify-center bg-slate-950 flex-col z-10 opacity-50 relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-20 pointer-events-none"></div>
           <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-5 shadow-2xl">
             <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           </div>
           <h3 className="text-slate-300 font-black text-xl tracking-tight mb-1">TUMBUH RADAR</h3>
           <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase italic">Pilih obrolan dari sebelah kiri untuk memantau</p>
        </div>
      )}
    </div>
  );
}