import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Data Security | Tumbuh AI",
  description: "Standar Keamanan Data dan Infrastruktur Tumbuh AI.",
};

export default function DataSecurity() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 pb-20 pt-32 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <ShieldCheck className="text-cyan-400 w-12 h-12" />
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Keamanan Data</h1>
        </div>
        
        {/* Tanggal di-hardcode (Maret 2026) agar tidak membeku saat build */}
        <p className="text-slate-400 mb-12 border-b border-white/10 pb-8">Standar Kepatuhan: UU PDP No. 27 Tahun 2022 & UU ITE | Pembaruan Terakhir: Maret 2026</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Komitmen Privasi & Keamanan</h2>
            <p>
              Tumbuh AI memahami bahwa bot kami menangani percakapan sensitif antara bisnis Anda dan pelanggan Anda. Infrastruktur kami dirancang dengan prinsip <em>Security by Design</em> dan <em>Privacy by Default</em> yang mematuhi kerangka kerja Undang-Undang Pelindungan Data Pribadi (UU PDP) Republik Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Enkripsi Data (Data Encryption)</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong>In-Transit:</strong> Seluruh komunikasi data antara peramban Anda, server kami, dan penyedia API pihak ketiga (seperti Google dan WhatsApp Meta) dienkripsi menggunakan standar industri TLS 1.2 / 1.3.</li>
              <li><strong>At-Rest:</strong> Data kredensial, kunci API (API Keys), dan informasi sensitif lainnya disimpan dalam database (Supabase) dengan algoritma enkripsi modern. Kami mengimplementasikan <em>Row Level Security (RLS)</em> sehingga data satu Klien (Tenant) tidak dapat diakses oleh Klien lainnya.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Pemrosesan Data Percakapan & Retensi (LLM & Chat Logs)</h2>
            <p>
              Kami bertindak sebagai <strong>Pemroses Data (Data Processor)</strong> atas instruksi Anda sebagai <strong>Pengendali Data (Data Controller)</strong>.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-400">
              {/* KLAUSUL BARU: DATA RETENTION 12 BULAN */}
              <li><strong>Kebijakan Retensi:</strong> Data percakapan (Chat Logs) disimpan secara ketat di server cloud kami untuk keperluan analitik di dashboard Anda selama maksimal <strong>12 bulan sejak interaksi terakhir</strong>. Setelah masa retensi habis, data akan dihapus secara permanen atau dianonimkan secara agregat.</li>
              <li><strong>Pemrosesan Pihak Ketiga:</strong> Tumbuh AI mengandalkan infrastruktur AI kelas dunia. Data yang dikirim ke penyedia LLM utama kami <strong>(Google Gemini)</strong> diproses secara terisolasi melalui API Enterprise dan <strong>TIDAK digunakan</strong> oleh Google untuk melatih model AI publik mereka (Sesuai dengan Zero Data Retention Policy on API).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Manajemen Akses & Autentikasi</h2>
            <p>
              Akses ke dashboard Tumbuh AI dikelola menggunakan token sesi aman. Kami sangat menyarankan Pengguna untuk menjaga kerahasiaan kredensial login. Tim internal Tumbuh AI tidak akan pernah meminta kata sandi Anda dan akses internal kami ke data produksi dibatasi hanya untuk teknisi senior atas izin tertulis (berbasis <em>need-to-know</em> untuk keperluan <em>troubleshooting</em>).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Pelaporan Insiden Keamanan (Breach Notification)</h2>
            <p>
              {/* REVISI SLA: DARI 72 JAM MENJADI 7 HARI KERJA */}
              Sesuai dengan regulasi yang berlaku dan praktik kelayakan industri, jika terjadi insiden kebocoran data (Data Breach) yang mengancam kredensial atau percakapan pelanggan Anda, Tumbuh AI akan memberi tahu Klien yang terdampak melalui email terdaftar selambat-lambatnya <strong>7 hari kerja</strong> setelah insiden diverifikasi oleh tim mitigasi kami.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}