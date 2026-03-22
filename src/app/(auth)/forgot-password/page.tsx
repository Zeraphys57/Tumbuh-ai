"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Lempar ke halaman ganti password
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Link reset password telah dikirim ke email Anda!" });
      setEmail("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal mengirim link reset." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-[420px] relative z-10">
        
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Reset <span className="text-blue-600">Password</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Masukkan email node Anda</p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleResetRequest} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Klien</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                placeholder="admin@bisnis.com"
              />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-4.5 pt-5 pb-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50">
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors">
              &larr; Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}