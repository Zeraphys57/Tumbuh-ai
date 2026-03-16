"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function ChatWidget() {
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", content: "Halo! Ada yang bisa kami bantu hari ini?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk Quick Replies Dinamis
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Logic Ambil Config Dinamis (Quick Replies)
  useEffect(() => {
    const fetchSettings = async () => {
      // Mapping manual sementara jika API belum siap
      const configs: Record<string, string[]> = {
        "joy-dental": ["Cek Harga Scaling", "Lokasi Klinik", "Konsultasi WA"],
        "bimbel-smart": ["Jadwal Kelas", "Biaya Kursus", "Daftar Gratis"],
      };
      
      const selectedReplies = configs[slug as string] || ["Tanya Harga", "Lokasi", "Bantuan"];
      setQuickReplies(selectedReplies);
    };

    if (slug) fetchSettings();
  }, [slug]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isLoading]);

  // 2. Logic Kirim Pesan dengan Konteks Memori & MULTI-BUBBLE UX
  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput("");
    setQuickReplies([]); // Sembunyikan setelah interaksi pertama agar rapi
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: textToSend, 
          clientId: slug, // <--- Ini yang menghubungkan ke route.ts AI!
          history: updatedMessages.slice(-6) 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal merespon");

      let fullReply = data.reply || "";

      // ==========================================
      // ✨ THE MAGIC TRICK: HUMANIZED MULTI-CHAT ✨
      // ==========================================
      const splitMessages = fullReply.split(/\n\s*\n/).filter((msg: string) => msg.trim() !== "");

      for (let i = 0; i < splitMessages.length; i++) {
        const msgPart = splitMessages[i];

        // Tambahkan chat ke layar
        setMessages((prev) => [...prev, { role: "ai", content: msgPart.trim() }]);

        // Beri jeda ngetik jika masih ada sisa paragraf
        if (i < splitMessages.length - 1) {
          setIsLoading(true);
          const delay = Math.min(Math.max(msgPart.length * 13, 1500), 3000); 
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { role: "ai", content: "Duh, koneksi terputus. Coba lagi ya!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI PARSER MARKDOWN KHUSUS CHAT BUBBLE ---
  const formatChatMarkdown = (text: string) => {
    if (!text) return { __html: "" };
    
    let formattedText = text.replace(/\\n/g, '\n');
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');
    // Ganti newline dengan <br/> agar rapi
    formattedText = formattedText.replace(/\n/g, '<br/>');

    return { __html: formattedText };
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans pointer-events-none">
      
      {/* Jendela Chat */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 flex h-[580px] w-[380px] flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-300 origin-bottom-right">
          
          {/* Header Premium */}
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center shadow-lg relative z-10">
            <div>
              <h1 className="text-xs font-black uppercase tracking-[0.2em] italic opacity-90">Tumbuh AI Node</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                <span className="text-[10px] font-black uppercase tracking-tighter">System Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all active:scale-90">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Chat Area - Ultra Smooth Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f8fafc] scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-[1.8rem] text-[13px] leading-relaxed shadow-sm ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-none shadow-blue-100 font-medium" 
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-slate-100 font-medium"
                }`}>
                  {/* HAPUS ReactMarkdown, GANTI DENGAN PARSER KITA */}
                  {msg.role === "ai" ? (
                     <div dangerouslySetInnerHTML={formatChatMarkdown(msg.content)} />
                  ) : (
                     msg.content
                  )}
                </div>
              </div>
            ))}
            
            {/* Animasi Mengetik AI */}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white p-4 rounded-[1.8rem] rounded-tl-none border border-slate-100 flex gap-1.5 items-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Footer Area */}
          <div className="p-5 bg-white border-t border-slate-50 relative z-10">
            {/* Quick Replies Dinamis */}
            {quickReplies.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {quickReplies.map((text, i) => (
                  <button 
                    key={i} 
                    onClick={() => sendMessage(text)} 
                    disabled={isLoading}
                    className="whitespace-nowrap px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all active:scale-95 border border-blue-100 shadow-sm disabled:opacity-50"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Input Box Premium */}
            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
                disabled={isLoading}
                placeholder={isLoading ? "Sedang mengetik..." : "Ketik pesan..."} 
                className="flex-1 bg-transparent p-2.5 outline-none text-sm font-semibold ml-2 text-slate-600 disabled:opacity-60" 
              />
              <button 
                onClick={() => sendMessage()} 
                disabled={isLoading || !input.trim()} 
                className="bg-blue-600 text-white p-3 rounded-xl active:scale-90 disabled:bg-slate-300 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            <p className="text-[8px] text-center text-slate-300 mt-4 font-black uppercase tracking-[0.4em] italic">Infrastructure by Tumbuh AI</p>
          </div>
        </div>
      )}

      {/* Tombol Bubble Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all duration-500 hover:scale-110 active:scale-90 ${isOpen ? 'rotate-90 scale-90' : 'rotate-0'}`}
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        )}
      </button>

    </div>
  );
}