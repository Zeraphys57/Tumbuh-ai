"use client";
import React, { useState, useEffect, useRef } from "react";
import { Send, Bot } from "lucide-react";

export default function PreviewDemoPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Halo! Saya asisten AI dari Tumbuh.ai. Ada yang bisa saya bantu?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Jangan izinkan user ngetik kalau AI masih "Typing" balasannya
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          clientId: "akun-demo", 
          history: messages 
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Gagal mengambil respon");

      let fullReply = data.reply || "";

      // ==========================================
      // ✨ THE MAGIC TRICK: HUMANIZED MULTI-CHAT ✨
      // ==========================================
      
      // 1. Pecah teks panjang berdasarkan enter ganda (paragraf)
      // Jika teks pendek, dia tetap jadi 1 array.
      const splitMessages = fullReply.split(/\n\s*\n/).filter((msg: string) => msg.trim() !== "");

      // 2. Looping untuk memunculkan pesan satu per satu
      for (let i = 0; i < splitMessages.length; i++) {
        const msgPart = splitMessages[i];

        // Tambahkan bagian pesan ini ke layar
        setMessages((prev) => [...prev, { role: "assistant", content: msgPart.trim() }]);

        // Jika MASIH ADA pesan berikutnya, beri jeda (animasi typing)
        if (i < splitMessages.length - 1) {
          setIsTyping(true);
          
          // Hitung waktu jeda dinamis: Makin panjang teks, ngetiknya makin lama (1.5s sampai 3s)
          const delay = Math.min(Math.max(msgPart.length * 15, 1500), 3000); 
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

    } catch (err) {
      console.error("Chat Error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Maaf, koneksi ke otak AI terputus. Coba lagi ya!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- FUNGSI PARSER MARKDOWN KHUSUS CHAT BUBBLE ---
  const formatChatMarkdown = (text: string) => {
    if (!text) return { __html: "" };
    
    // 1. Ubah literal \n menjadi newline
    let formattedText = text.replace(/\\n/g, '\n');
    
    // 2. Ganti **Teks** menjadi <strong> (Huruf Tebal)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Ganti *Teks* menjadi <i> (Huruf Miring)
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');
    
    // 4. Ubah newline tunggal (\n) menjadi <br/> agar tulisan bisa turun ke baris bawah
    // (Karena enter ganda sudah dipecah jadi bubble baru di atas)
    formattedText = formattedText.replace(/\n/g, '<br/>');

    return { __html: formattedText };
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans pt-12">
      {/* HEADER CHAT */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-10 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
          <Bot size={16} />
        </div>
        <div>
          <p className="text-[12px] font-black text-slate-800 leading-none">Tumbuh AI Agent</p>
          <p className="text-[10px] text-green-500 font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
          </p>
        </div>
      </div>

      {/* AREA PESAN */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] font-medium shadow-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
            }`}>
              
              {/* RENDER PESAN DENGAN HTML YANG SUDAH DI-PARSING */}
              {msg.role === "assistant" ? (
                 <div dangerouslySetInnerHTML={formatChatMarkdown(msg.content)} />
              ) : (
                 msg.content
              )}
              
            </div>
          </div>
        ))}
        
        {/* ANIMASI MENGETIK */}
        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-200">
             <div className="bg-white border border-slate-100 p-3.5 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
               <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
               <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
             </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 pb-8">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? "AI sedang mengetik..." : "Ketik pesan demo..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-3.5 px-5 pr-12 text-[13px] font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isTyping}
            className="absolute right-2 w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-90 transition-all disabled:bg-slate-300 disabled:shadow-none"
          >
            <Send size={15} className="ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}