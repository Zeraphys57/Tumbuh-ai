"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Fungsi ini otomatis mengupdate password user yang sedang aktif dari link reset
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Password berhasil diubah! Mengalihkan..." });
      
      // Lempar kembali ke login setelah sukses
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal mengubah password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-[420px] relative z-10">
        
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">New <span className="text-blue-600">Password</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Amankan kembali node Anda</p>
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl text-center font-bold text-xs uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
              <input
                type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 tracking-widest"
                placeholder="••••••••"
              />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-4.5 pt-5 pb-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan & Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}