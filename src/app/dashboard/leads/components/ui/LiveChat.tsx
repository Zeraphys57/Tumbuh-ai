"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import toast from "react-hot-toast";

// --- INTERFACES ---
interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  is_bot_active: boolean;
  created_at: string;
  platform?: string;
  live_preview?: string;
  has_new_activity?: boolean; 
}

interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "admin";
  text: string;
  time: string;
  date: string;
}

const MESSAGES_PER_PAGE = 50;

// ==========================================================
// Fungsi Helper untuk Mengubah Markdown menjadi HTML (Aman XSS)
// ==========================================================
const formatChatMessage = (text: string) => {
  if (!text) return "";
  let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  safe = safe.replace(/(?:\*\*|\*)(.*?)(?:\*\*|\*)/g, '<strong class="text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.5)]">$1</strong>');
  safe = safe.replace(/_(.*?)_/g, '<em class="text-slate-300 italic">$1</em>');
  safe = safe.replace(/\n/g, '<br />');
  return safe;
};

const safeSlice = (text: string, length: number) => {
  if (!text) return "";
  return Array.from(text).slice(0, length).join("");
};

export default function LiveChat() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  const [clientSlug, setClientSlug] = useState("");

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false); 
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
    
    if (activePhone) {
      setLeads(prev => prev.map(l => l.customer_phone === activePhone ? { ...l, has_new_activity: false } : l));
    }
  }, [activePhone]);

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
              const isCurrentlyOpen = payload.new.customer_phone === activePhoneRef.current;

              if (isCurrentlyOpen) {
                setChatLogs((prev) => {
                  if (prev.some(msg => msg.id === payload.new.id)) return prev;
                  return [...prev, payload.new];
                });
                scrollToBottom(); 
              }
              
              setLeads((prev) => {
                const targetIndex = prev.findIndex(l => l.customer_phone === payload.new.customer_phone);
                
                if (targetIndex > -1) { 
                  const leadToUpdate = prev[targetIndex];

                  const rawResponse = payload.new.response || "";
                  const rawMessage = payload.new.message || "";
                  const isAi = payload.new.replied_by !== 'admin';

                  let snippet = "";
                  if (rawResponse.trim() !== "") {
                    snippet = `${isAi ? '🤖' : '👨‍💻'} ${safeSlice(rawResponse, 35)}...`;
                  } else if (rawMessage.trim() !== "") {
                    snippet = `👤 ${safeSlice(rawMessage, 35)}...`;
                  }

                  const updatedLead = {
                    ...leadToUpdate,
                    live_preview: snippet || leadToUpdate.live_preview,
                    has_new_activity: !isCurrentlyOpen 
                  };

                  const newLeads = [...prev];
                  
                  if (targetIndex === 0) {
                    newLeads[0] = updatedLead; 
                    return newLeads;
                  } else {
                    newLeads.splice(targetIndex, 1); 
                    return [updatedLead, ...newLeads]; 
                  }
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
                setLeads((prev) => [{ ...(payload.new as Lead), has_new_activity: true }, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                setLeads((prev) => prev.map(lead => lead.id === payload.new.id ? { ...lead, ...payload.new } : lead));
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
      setIsSwitchingChat(true); 
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
      setIsSwitchingChat(false); 
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
    
    const { error } = await supabase.from('leads').update({ is_bot_active: newStatus }).eq('id', activeLead.id);
    
    if (error) {
       toast.error("Gagal mengubah status AI. Silakan coba lagi.");
       setLeads(leads.map(l => l.id === activeLead.id ? { ...l, is_bot_active: !newStatus } : l));
    } else {
       toast.success(newStatus ? "Sistem AI dilanjutkan." : "AI dihentikan sementara. Mode manual aktif.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeLead || !clientSlug) return;

    if (activeLead.is_bot_active) {
      toast.error("Harap 'Take Over Chat' (Matikan AI) terlebih dahulu sebelum membalas manual!");
      return;
    }

    if (inputText.trim().length > 2000) {
      toast.error("Pesan terlalu panjang! Maksimal 2000 karakter per pesan.");
      return;
    }

    const sentText = inputText;
    setInputText(""); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      client_id: clientSlug,
      customer_phone: activePhone,
      message: "",
      response: sentText,
      replied_by: "admin",
      platform: activeLead.platform || 'whatsapp',
      created_at: new Date().toISOString()
    };

    setChatLogs(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    setLeads((prev) => {
      const targetIndex = prev.findIndex(l => l.customer_phone === activePhone);
      if (targetIndex > -1) {
        const newLeads = [...prev];
        const [bumpedLead] = newLeads.splice(targetIndex, 1);
        bumpedLead.live_preview = `👨‍💻 ${safeSlice(sentText, 35)}...`; 
        return [bumpedLead, ...newLeads];
      }
      return prev;
    });

    const { data: dbData, error: dbError } = await supabase.from('chat_logs').insert({
        client_id: clientSlug,
        customer_phone: activePhone,
        message: "",
        response: sentText,
        replied_by: "admin",
        platform: activeLead.platform || 'whatsapp'
    }).select().single();

    if (dbError) {
      setChatLogs(prev => prev.filter(msg => msg.id !== tempId));
      toast.error("Gagal menyimpan pesan ke database. Silakan coba lagi.");
      return; 
    } else if (dbData) {
      setChatLogs(prev => prev.map(msg => msg.id === tempId ? dbData : msg));
    }

    try {
      const apiUrl = activeLead.platform === 'instagram' ? '/api/webhook/instagram/send-manual' : '/api/webhook/whatsapp/send-manual';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSlug, customerPhone: activePhone, text: sentText })
      });
      
      if (!response.ok) throw new Error("API Meta Error");
      
    } catch (err) {
      console.error("❌ Gagal mengirim pesan ke API Meta:", err);
      toast.error(`Pesan gagal diteruskan ke ${activeLead.platform === 'instagram' ? 'Instagram' : 'WhatsApp'}.`);
    }
  };

  return (
    <div className="flex h-[80vh] min-h-[600px] bg-[#0a0f1a] rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_50px_-15px_rgba(59,130,246,0.15)] text-slate-200 z-10 relative">
      
      {/* ====================================================================== */}
      {/* KIRI: Daftar Kontak / Leads (MOBILE FRIENDLY) */}
      {/* ====================================================================== */}
      <div className={`w-full md:w-1/3 border-r border-white/10 flex flex-col bg-[#060913]/50 relative z-20 transition-all duration-300 ${activePhone ? 'hidden md:flex' : 'flex'}`}>
        
        {/* SIDEBAR HEADER */}
        <div className="p-5 md:p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-10 flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-black italic tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">INBOX LEAD</h2>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 mt-1 font-bold drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">Live Monitor</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="text-[8px] md:text-[9px] uppercase font-black text-emerald-400 tracking-widest hidden sm:inline drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">RADAR ON</span>
          </div>
        </div>
        
        {/* LEADS LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
          {leads.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-40">
              <svg className="w-10 h-10 md:w-12 md:h-12 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-widest uppercase italic">Belum ada leads masuk</p>
            </div>
          )}

          {leads.map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => setActivePhone(lead.customer_phone)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-all duration-300 relative overflow-hidden group/lead ${
                activePhone === lead.customer_phone 
                  ? 'bg-blue-500/10 border-l-[4px] md:border-l-[6px] border-l-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' 
                  : lead.has_new_activity
                  ? 'bg-white/[0.03] border-l-[4px] md:border-l-[6px] border-l-blue-400/50 hover:bg-white/[0.05]'
                  : 'border-l-[4px] md:border-l-[6px] border-l-transparent hover:bg-white/[0.02]'
              }`}
            >
              {lead.has_new_activity && activePhone !== lead.customer_phone && (
                 <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-blue-500/10 to-transparent skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]"></div>
              )}

              <div className="flex justify-between items-start mb-1 relative z-10">
                <h3 className={`font-bold text-xs md:text-sm truncate flex items-center gap-1.5 transition-colors ${
                  activePhone === lead.customer_phone ? 'text-blue-100' : lead.has_new_activity ? 'text-white' : 'text-slate-300 group-hover/lead:text-slate-200'
                }`}>
                  <span className="opacity-80">{lead.platform === 'instagram' ? '🟪' : '🟩'}</span> 
                  {lead.customer_name}
                </h3>
                
                {lead.has_new_activity && activePhone !== lead.customer_phone && (
                  <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5 mt-1 mr-1 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between relative z-10">
                <p className="text-[9px] md:text-[10px] text-slate-500 truncate font-mono tracking-wider">{lead.customer_phone}</p>
              </div>

              {lead.live_preview && (
                 <p className={`text-[10px] md:text-[11px] mt-2 truncate relative z-10 ${lead.has_new_activity ? 'text-blue-300/90 font-medium' : 'text-slate-500 italic group-hover/lead:text-slate-400 transition-colors'}`}>
                   {lead.live_preview}
                 </p>
              )}

              <div className="mt-2 md:mt-2.5 flex relative z-10">
                <span className={`text-[7px] md:text-[8px] px-1.5 md:px-2 py-0.5 rounded-md uppercase tracking-widest font-black shadow-sm flex items-center gap-1 border ${
                    lead.is_bot_active 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_5px_rgba(16,185,129,0.1)]' 
                    : 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_5px_rgba(249,115,22,0.1)]'
                }`}>
                  {lead.is_bot_active ? (
                    <>
                      <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]"></span>
                      AI Active
                    </>
                  ) : '👨‍💻 Human Mode'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* KANAN: Area Chat */}
      {/* ====================================================================== */}
      {activeLead ? (
        <div className={`w-full md:w-2/3 flex flex-col min-h-0 relative transition-all duration-300 ${activePhone ? 'flex' : 'hidden md:flex'}`}>
          {/* BACKGROUND ORBS CHAT */}
          <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
          <div className="absolute bottom-1/4 left-0 w-[250px] h-[250px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
          
          {/* HEADER CHAT */}
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl flex justify-between items-center z-20">
            <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
              <button 
                onClick={() => setActivePhone(null)}
                className="md:hidden p-1.5 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>

              <div className="truncate">
                <h2 className="font-bold text-base md:text-lg text-white tracking-tight flex items-center gap-1.5 md:gap-2 truncate drop-shadow-md">
                  <span className="flex-shrink-0 opacity-80">{activeLead.platform === 'instagram' ? '🟪' : '🟩'}</span> 
                  <span className="truncate">{activeLead.customer_name}</span>
                </h2>
                <p className="text-[9px] md:text-[11px] text-slate-400 font-mono tracking-widest mt-0.5 truncate">{activeLead.customer_phone}</p>
              </div>
            </div>

            <button 
              onClick={toggleAiStatus}
              className={`flex items-center flex-shrink-0 gap-1.5 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 whitespace-nowrap border ${
                activeLead.is_bot_active 
                ? 'bg-white/5 text-slate-400 hover:bg-orange-500/10 hover:text-orange-400 border-white/10 hover:border-orange-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              }`}
            >
              <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLead.is_bot_active ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                 <span className={`relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 ${activeLead.is_bot_active ? 'bg-orange-500' : 'bg-emerald-500 shadow-[0_0_5px_rgba(52,211,153,0.8)]'}`}></span>
              </span>
              <span className="hidden sm:inline">{activeLead.is_bot_active ? 'Take Over Chat' : 'Resume AI System'}</span>
              <span className="sm:hidden">{activeLead.is_bot_active ? 'Take Over' : 'Resume AI'}</span>
            </button>
          </div>

          {/* BUBBLE CHAT */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-5 z-10 custom-scrollbar relative scroll-smooth bg-[#060913]/30"
          >
            {isSwitchingChat && (
               <div className="absolute inset-0 bg-[#0a0f1a]/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                  <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-blue-500/20 border-t-blue-400 rounded-full animate-spin mb-3 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]"></div>
                  <p className="text-[9px] md:text-[10px] text-blue-400 font-black tracking-[0.2em] uppercase animate-pulse">Dekripsi Obrolan...</p>
               </div>
            )}

            {isLoadingMore && (
              <div className="flex justify-center my-4">
                 <span className="bg-white/5 backdrop-blur-md text-blue-400 text-[8px] md:text-[9px] px-3 md:px-4 py-1.5 rounded-full border border-blue-500/20 uppercase font-black tracking-widest animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                   Sinkronisasi Data Lama...
                 </span>
              </div>
            )}

            {!isSwitchingChat && activeMessages.map((msg, index) => {
              const isFirstMsgOfDay = index === 0 || activeMessages[index - 1].date !== msg.date;

              return (
                <React.Fragment key={msg.id}>
                  {isFirstMsgOfDay && (
                    <div className="flex justify-center my-5 md:my-6 sticky top-2 z-20">
                      <span className="bg-[#0d1322]/80 backdrop-blur-md text-slate-400 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] px-4 md:px-5 py-1.5 rounded-full border border-white/5 shadow-md">
                        {msg.date}
                      </span>
                    </div>
                  )}

                  <div className={`flex w-full ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] rounded-[1.2rem] p-3 md:p-4 relative group transition-all duration-300 break-words whitespace-pre-wrap overflow-hidden ${
                      msg.sender === 'customer' 
                        ? 'bg-white/[0.03] text-slate-200 rounded-tl-sm border border-white/5 shadow-sm' 
                        : msg.sender === 'ai'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-[0_0_20px_rgba(37,99,235,0.2)] border border-blue-500/30'
                        : 'bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-tr-sm shadow-[0_0_20px_rgba(249,115,22,0.2)] border border-orange-500/30' 
                    }`}>
                      <p 
                        className="text-[12px] md:text-[13px] leading-relaxed break-words w-full" 
                        dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.text) }} 
                      />
                      <div className={`text-[8px] md:text-[9px] mt-2.5 flex items-center justify-end gap-1.5 ${msg.sender === 'customer' ? 'text-slate-500' : 'text-white/70'}`}>
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

          {/* INPUT AREA */}
          <div className="p-3 md:p-4 bg-[#0a0f1a] border-t border-white/5 z-20 relative">
            {!activeLead.is_bot_active && (
               <div className="mb-2.5 text-[8px] md:text-[9px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1.5 px-2.5 bg-orange-500/10 w-fit py-1.5 rounded-md border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                 <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping"></span>
                 Manual Override Active
               </div>
            )}
            <form onSubmit={handleSendMessage} className={`flex gap-2 md:gap-3 relative transition-all duration-300 w-full ${activeLead.is_bot_active ? 'opacity-50 grayscale' : 'opacity-100'}`}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeLead.is_bot_active}
                placeholder={activeLead.is_bot_active ? "Sistem AI sedang bekerja..." : `Ketik pesan...`}
                className={`flex-1 w-full min-w-0 bg-white/[0.02] border border-white/10 rounded-xl px-4 md:px-5 py-3 md:py-3.5 text-xs md:text-sm text-white focus:outline-none transition-all duration-300 placeholder:text-slate-600 placeholder:font-medium placeholder:truncate ${!activeLead.is_bot_active ? 'focus:bg-white/[0.04] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 cursor-text shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]' : 'cursor-not-allowed'}`}
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || activeLead.is_bot_active}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 md:px-8 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:hover:shadow-none active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 flex-shrink-0 border border-white/10"
              >
                <span className="hidden md:inline">Send</span>
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>

        </div>
      ) : (
        /* ====================================================================== */
        /* KANAN: EMPTY STATE */
        /* ====================================================================== */
        <div className="hidden md:flex w-2/3 items-center justify-center bg-[#060913]/30 flex-col z-10 relative">
           <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full w-[400px] h-[400px] m-auto pointer-events-none"></div>
           <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-5 shadow-2xl backdrop-blur-sm relative">
             <div className="absolute inset-0 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-[pulse_3s_ease-in-out_infinite]"></div>
             <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           </div>
           <h3 className="text-white font-black text-lg md:text-xl tracking-tight mb-2 drop-shadow-md">TUMBUH RADAR</h3>
           <p className="text-slate-500 text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase italic text-center px-4">Pilih obrolan dari sebelah kiri untuk memantau</p>
        </div>
      )}
    </div>
  );
}