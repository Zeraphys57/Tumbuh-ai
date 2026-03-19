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
  const [offset, setOffset] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activePhoneRef = useRef<string | null>(null);
  
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    activePhoneRef.current = activePhone;
  }, [activePhone]);

  useEffect(() => {
    let channel: any;

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, slug')
        .eq('email', user.email)
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
              if (payload.new.customer_phone === activePhoneRef.current) {
                setChatLogs((prev) => [...prev, payload.new]);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              }
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
      setChatLogs([]);
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
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
      }
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

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

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
    // [CSS FIX 1]: Tambahkan min-h-0 di Parent Container & overflow-hidden
    <div className="flex h-[80vh] min-h-[600px] bg-slate-950 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl text-slate-200">
      
      {/* KIRI: Daftar Kontak / Leads */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-900/50">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-black italic tracking-tight text-white">INBOX LEAD</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Live Monitor</p>
        </div>
        
        {/* [CSS FIX 2]: Tambahkan min-h-0 di List Kontak */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide relative">
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
              className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-slate-800/50 ${activePhone === lead.customer_phone ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm truncate">
                  {lead.platform === 'instagram' ? '🟪 ' : '🟩 '}
                  {lead.customer_name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 truncate font-mono">{lead.customer_phone}</p>
              <div className="mt-2 flex">
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${lead.is_bot_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {lead.is_bot_active ? '🤖 AI Active' : '👨‍💻 Human Mode'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KANAN: Area Chat */}
      {activeLead ? (
        // [CSS FIX 3]: Tambahkan min-h-0 di Area Kanan
        <div className="w-2/3 flex flex-col min-h-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
          <div className="absolute inset-0 bg-slate-950/90 pointer-events-none z-0"></div>
          
          <div className="px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex justify-between items-center z-10">
            <div>
              <h2 className="font-bold text-lg text-white">
                {activeLead.platform === 'instagram' ? '🟪 ' : '🟩 '} {activeLead.customer_name}
              </h2>
              <p className="text-xs text-slate-400 font-mono">ID: {activeLead.customer_phone}</p>
            </div>

            <button 
              onClick={toggleAiStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                activeLead.is_bot_active 
                ? 'bg-slate-800 text-slate-300 hover:bg-orange-500/20 hover:text-orange-400 border border-slate-700' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeLead.is_bot_active ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
              {activeLead.is_bot_active ? 'Take Over Chat' : 'Resume AI'}
            </button>
          </div>

          {/* [CSS FIX 4]: Tambahkan min-h-0 di Area Bubble Chat */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 z-10 scrollbar-hide"
          >
            {isLoadingMore && (
              <div className="text-center text-xs text-slate-500 my-2 animate-pulse uppercase tracking-widest font-bold">
                Memuat pesan lama...
              </div>
            )}

            {activeMessages.map((msg, index) => {
              const isFirstMsgOfDay = index === 0 || activeMessages[index - 1].date !== msg.date;

              return (
                <React.Fragment key={msg.id}>
                  {isFirstMsgOfDay && (
                    <div className="flex justify-center my-6">
                      <span className="bg-slate-800/80 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-white/5">
                        {msg.date}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-4 relative group ${
                      msg.sender === 'customer' 
                        ? 'bg-slate-800 text-slate-100 rounded-tl-sm' 
                        : msg.sender === 'ai'
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                        : 'bg-indigo-600 text-white rounded-tr-sm border border-indigo-400/30' 
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      <div className={`text-[9px] mt-2 flex items-center justify-end gap-1 ${msg.sender === 'customer' ? 'text-slate-400' : 'text-white/70'}`}>
                        <span className="uppercase font-bold tracking-widest">
                          {msg.sender === 'ai' ? '🤖 AI' : msg.sender === 'admin' ? '👨‍💻 You' : ''}
                        </span>
                        <span>• {msg.time}</span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900/80 border-t border-white/10 backdrop-blur-md z-10">
            {!activeLead.is_bot_active && (
               <div className="mb-2 text-[10px] text-orange-400 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5 px-2">
                 ⚠️ AI Paused. You are replying manually.
               </div>
            )}
            <form onSubmit={handleSendMessage} className={`flex gap-3 relative transition-all duration-300 ${activeLead.is_bot_active ? 'opacity-50 grayscale' : 'opacity-100'}`}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={activeLead.is_bot_active}
                placeholder={activeLead.is_bot_active ? "Klik 'Take Over Chat' untuk membalas..." : `Ketik balasan untuk pelanggan ${activeLead.platform === 'instagram' ? 'di IG' : 'di WA'}...`}
                className={`flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all ${!activeLead.is_bot_active ? 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-text' : 'cursor-not-allowed'}`}
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || activeLead.is_bot_active}
                className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg disabled:hover:shadow-none"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="w-2/3 flex items-center justify-center bg-slate-950 flex-col z-10 opacity-50 relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-20 pointer-events-none"></div>
           <svg className="w-16 h-16 mb-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
           <p className="text-slate-500 text-sm font-bold tracking-widest uppercase italic">Pilih obrolan untuk mulai memantau</p>
        </div>
      )}
    </div>
  );
}