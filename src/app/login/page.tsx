"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email atau password salah. Silakan cek kembali.");
      setLoading(false);
    } else {
      // Redirect ke dashboard leads jika sukses
      router.push("/dashboard/leads");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      
      {/* --- BACKGROUND ORNAMENTS (PREMIUM FEEL) --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* HEADER LOGO */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-900/20 mb-6 border border-slate-700/50 relative group">
            <div className="absolute inset-0 bg-blue-500/20 rounded-[1.25rem] blur-md group-hover:bg-blue-500/40 transition-all"></div>
            <svg className="w-8 h-8 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
            Tumbuh <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-[0.3em]">Intelligent Node Access</p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Klien</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                placeholder="admin@bisnis.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <a 
                  href="https://wa.me/6281351958200?text=Halo%20Tumbuh%20AI,%20saya%20butuh%20bantuan%20karena%20lupa%20password%20dashboard%20klien%20saya." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest italic"
                >
                  Lupa?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium tracking-widest"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4.5 pt-5 pb-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:bg-slate-900 hover:shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Authenticating...
                </>
              ) : (
                "Secure Login"
              )}
            </button>
          </form>

          {/* LINK KE REGISTER
          <div className="mt-8 pt-6 border-t border-slate-100/50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Belum punya node bisnis? <br/>
              <Link href="/register" className="text-blue-600 hover:text-slate-900 transition-colors mt-1 inline-block italic">
                Daftar Sebagai Klien
              </Link>
            </p>
          </div> */}
        </div>
        
        <p className="text-center mt-8 text-[9px] text-slate-400/60 font-black tracking-[0.3em] uppercase">
          &copy; 2026 Tumbuh AI • Enterprise Engine
        </p>
      </div>
    </div>
  );
}