import Link from "next/link";

export default function PaymentErrorPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const orderId = searchParams.order_id || "Tidak ada ID";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center relative z-10">
        {/* Ikon Error */}
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Pembayaran Gagal</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Maaf, transaksi Anda tidak dapat diproses saat ini. Hal ini mungkin terjadi karena penolakan dari pihak bank atau waktu pembayaran telah habis.
        </p>

        <div className="bg-black/40 border border-slate-800 rounded-xl p-4 mb-8 text-left flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Order ID</p>
            <p className="text-slate-300 font-mono text-xs">{orderId}</p>
          </div>
          <span className="text-[9px] bg-red-500/20 text-red-400 font-black uppercase px-2 py-1 rounded border border-red-500/30 tracking-widest">
            FAILED
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/" className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95">
            Coba Metode Lain
          </Link>
          <a href="https://wa.me/6281351958200" target="_blank" rel="noopener noreferrer" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2">
            Hubungi Bantuan <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}