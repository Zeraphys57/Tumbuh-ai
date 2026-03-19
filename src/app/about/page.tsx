import Link from "next/link";
import { ArrowLeft, Target, Zap, ShieldCheck, Building2, UserCircle, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Tentang Kami | Tumbuh AI",
  description: "Visi, misi, dan cerita di balik Tumbuh AI - Platform Automasi Chatbot AI Cerdas.",
};

export default function AboutUs() {
  const waLink = "https://wa.me/6281351958200?text=Halo%20Tim%20Tumbuh%20AI,%20saya%20tertarik%20untuk%20membangun%20Agen%20AI%20untuk%20bisnis%20saya.%20Bisa%20minta%20info%20lebih%20lanjut?";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 pb-24 pt-32 px-6 relative overflow-hidden">
      
      {/* Efek Cahaya Latar Belakang */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
            Membangun Masa Depan <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 italic">
              Automasi Bisnis.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Tumbuh AI hadir untuk mendemokratisasi teknologi Kecerdasan Buatan (AI) kelas <em>Enterprise</em> agar dapat diakses oleh bisnis dari segala skala di Indonesia. Kami mengubah cara bisnis berinteraksi dengan pelanggan mereka.
          </p>
        </div>

        {/* GRID NILAI INTI (CORE VALUES) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors group">
            <Target className="w-10 h-10 text-cyan-400 mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-3">Visi Kami</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-justify">
              Menjadi tulang punggung intelijen komunikasi untuk setiap bisnis di Asia Tenggara. Kami percaya bahwa tidak ada lagi bisnis yang harus kehilangan potensi pendapatan hanya karena terlambat membalas pesan pelanggan.
            </p>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:bg-white/[0.04] transition-colors group">
            <Zap className="w-10 h-10 text-indigo-400 mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-3">Misi Kami</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-justify">
              Membangun infrastruktur bot AI yang tidak hanya pintar, tetapi juga mudah digunakan, memiliki latensi sangat rendah, dan mampu beradaptasi dengan gaya bahasa <em>brand</em> klien kami secara natural.
            </p>
          </div>
        </div>

        {/* CERITA KAMI */}
        <div className="border-t border-white/10 pt-16 mb-20">
          <div className="flex items-center gap-4 mb-8">
            <Building2 className="text-white w-8 h-8" />
            <h2 className="text-3xl font-bold text-white">Cerita Kami</h2>
          </div>
          
          <div className="space-y-6 text-slate-400 leading-relaxed text-justify">
            <p>
              Berawal dari keresahan melihat banyaknya bisnis lokal dan UMKM yang kewalahan mengelola ratusan pesan pelanggan setiap harinya, <strong>Tumbuh Intelligence Core</strong> didirikan. Kami melihat ada kesenjangan besar: teknologi AI sangat canggih, namun penerapannya untuk bisnis sehari-hari seringkali terlalu teknis, kaku, dan mahal.
            </p>
            <p>
              Oleh karena itu, kami merancang Tumbuh AI dari nol. Bukan sekadar pembalas pesan otomatis, melainkan agen cerdas yang memahami konteks, mampu melakukan penawaran produk (<em>soft-selling</em>), hingga mengeksekusi instruksi rumit layaknya <em>Customer Service</em> manusia kelas atas.
            </p>
            <p>
              Saat ini, infrastruktur kami telah didesain dengan standar keamanan data tingkat tinggi (menggunakan enkripsi modern dan mematuhi UU PDP) agar klien kami dapat tidur nyenyak mengetahui bahwa data mereka dan pelanggan mereka aman bersama kami.
            </p>
          </div>
        </div>

        {/* SECTION BARU: KEPEMIMPINAN / FOUNDER */}
        <div className="bg-gradient-to-br from-indigo-900/20 to-cyan-900/10 border border-white/10 rounded-3xl p-8 md:p-12 mb-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-indigo-400/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <UserCircle className="w-12 h-12 text-slate-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Bryan Jacquellino</h3>
              <p className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-4">Founder & Chief Executive Officer</p>
              <p className="text-slate-400 text-sm leading-relaxed text-justify">
                "Masa depan bisnis bukan tentang siapa yang bekerja paling keras, tapi siapa yang bisa mengotomatisasi dengan paling cerdas. Di Tumbuh AI, kami membangun otak digital untuk bisnis Anda, sehingga Anda bisa fokus pada hal yang benar-benar penting: Inovasi dan Ekspansi."
              </p>
            </div>
          </div>
        </div>

        {/* METRICS / STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/10 mb-20">
          {[
            { label: "Uptime SLA", value: "99.9%" },
            { label: "Data Security", value: "Enterprise" },
            { label: "Operasional", value: "24/7" },
            { label: "Lokasi Server", value: "Global Edge" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-4">
              <div className="text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* SECTION BARU: CALL TO ACTION */}
        <div className="text-center bg-white/[0.02] border border-white/5 rounded-3xl p-10 flex flex-col items-center">
          <MessageSquare className="w-12 h-12 text-cyan-400 mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Siap Membangun AI untuk Bisnis Anda?</h2>
          <p className="text-slate-400 mb-8 max-w-lg">
            Mari diskusikan kebutuhan spesifik bisnis Anda. Tim kami siap membantu Anda merancang arsitektur AI yang tepat sasaran.
          </p>
          <a 
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-full font-bold tracking-wide hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-105 transition-all duration-300"
          >
            Konsultasi Gratis Sekarang
          </a>
        </div>

      </div>
    </div>
  );
}