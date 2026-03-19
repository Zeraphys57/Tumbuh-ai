"use client";
import React, { useState, useEffect, useRef } from "react";
import { Send, Bot } from "lucide-react";
import DOMPurify from "dompurify";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  isLocal?: boolean; 
}

export default function PreviewDemoPage() {
  // 1. [FIX HYDRATION]: Tambahkan state isMounted
  const [isMounted, setIsMounted] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: "init-1", 
      role: "assistant", 
      content: "Halo! 👋 Saya **Tumbuh AI** — asisten yang sedang Anda ajak bicara ini adalah demo langsung teknologi kami.\n\nBisnis apa yang sedang Anda jalankan saat ini? 🚀",
      isLocal: true 
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 2. [FIX HYDRATION]: Beritahu React kalau komponen sudah masuk ke Browser
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isTyping || input.length > 2000) return;

    const userMessage = input;
    const userMsgId = `user-${Date.now()}`; 

    const cleanHistory = messages
      .filter(m => !m.isLocal) 
      .slice(-50) 
      .map(m => ({ role: m.role, content: m.content })); 
    
    setInput("");
    
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage, 
          clientId: "akun-demo", 
          history: cleanHistory 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengambil respon");

      let fullReply = data.reply || "";
      const splitMessages = fullReply.split(/\n\s*\n/).filter((msg: string) => msg.trim() !== "");

      setIsTyping(false); 

      for (let i = 0; i < splitMessages.length; i++) {
        const msgPart = splitMessages[i];
        
        if (i > 0) {
          setIsTyping(true);
          const delay = Math.min(Math.max(msgPart.length * 10, 800), 1800); 
          await new Promise(resolve => setTimeout(resolve, delay));
          setIsTyping(false);
        }

        setMessages((prev) => [
          ...prev, 
          { id: `ai-${Date.now()}-${i}`, role: "assistant", content: msgPart.trim() }
        ]);
      }

    } catch (err) {
      console.error("Chat Error:", err);
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "Maaf, koneksi ke otak AI terputus. Coba lagi ya!", isLocal: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatChatMarkdown = (text: string) => {
    if (!text) return { __html: "" };
    
    let htmlContent = text
      .replace(/&/g, "&amp;") 
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\\n/g, '\n')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

    // 3. [FIX HYDRATION]: Gunakan isMounted sebagai pengganti 'typeof window'
    const cleanHtml = isMounted
      ? DOMPurify.sanitize(htmlContent, {
          ALLOWED_TAGS: ['strong', 'em', 'br', 'b', 'i'],
          ALLOWED_ATTR: [] 
        })
      : ""; 

    return { __html: cleanHtml };
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
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
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 px-2 py-1 rounded-md">Live Demo</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC] scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] font-medium shadow-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
            }`}>
              {msg.role === "assistant" ? (
                 <div dangerouslySetInnerHTML={formatChatMarkdown(msg.content)} />
              ) : (
                 msg.content
              )}
            </div>
          </div>
        ))}
        
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

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 pb-10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            maxLength={2000} 
            placeholder={isTyping ? "AI sedang mengetik..." : "Ketik pesan demo..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-3.5 px-5 pr-12 text-[13px] font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isTyping || !input.trim()}
            className="absolute right-2 w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-90 transition-all disabled:bg-slate-300 disabled:shadow-none"
          >
            <Send size={15} className="ml-0.5" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-4 px-2">
           <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Powered by Tumbuh AI Neural Engine</p>
           <p className={`text-[8px] font-bold ${input.length > 1800 ? 'text-red-400' : 'text-slate-300'}`}>
              {input.length}/2000
           </p>
        </div>
      </form>
    </div>
  );
}