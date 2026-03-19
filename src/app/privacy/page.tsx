import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Tumbuh AI",
  description: "Kebijakan Privasi Tumbuh AI sesuai standar UU PDP.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30 pb-20 pt-32 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>
        
        <div className="flex items-center gap-4 mb-4">
          <UserCheck className="text-cyan-400 w-12 h-12" />
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Kebijakan <span className="text-cyan-400 italic">Privasi</span></h1>
        </div>
        
        <p className="text-slate-400 mb-12 border-b border-white/10 pb-8">Pembaruan Terakhir: Maret 2026 | Kepatuhan: UU PDP No. 27 Tahun 2022</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-justify">
          
          <p className="font-medium text-slate-400 italic text-lg mb-8">
            Tumbuh AI berkomitmen penuh untuk melindungi privasi dan keamanan data bisnis Anda. Kebijakan ini menjelaskan dengan transparan bagaimana kami mengumpulkan, memproses, menyimpan, dan melindungi informasi Anda.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">1. Posisi Hukum: Pemroses Data vs. Pengendali Data</h2>
            <p>
              Berdasarkan Undang-Undang Pelindungan Data Pribadi (UU PDP), dalam konteks pengelolaan data pelanggan akhir (<em>End-User</em> seperti pasien klinik atau pelanggan toko Anda), <strong>Anda (Klien) bertindak sebagai Pengendali Data</strong>. Anda yang menentukan tujuan pemrosesan. <strong>Tumbuh AI bertindak secara eksklusif sebagai Pemroses Data</strong> yang memproses instruksi teknis sesuai konfigurasi sistem yang Anda tetapkan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">2. Data yang Diproses</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-slate-400">
              <li><strong>Data Administratif Klien:</strong> Nama institusi, email otorisasi, kredensial login (dienkripsi searah via Supabase Auth), dan metadata konfigurasi (<em>system prompts</em>).</li>
              <li><strong>Data Transaksional Pelanggan (Leads):</strong> Nama, nomor kontak (WhatsApp), waktu reservasi, keluhan layanan, dan rekaman log percakapan tekstual (<em>chat logs</em>).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">3. Sub-Pemroses & Pihak Ketiga (Third-Party Sub-processors)</h2>
            <p>
              Untuk menjalankan fitur inti Layanan, Tumbuh AI mengirimkan teks percakapan (dalam bentuk terenkripsi) ke penyedia infrastruktur AI pihak ketiga (API Google Gemini).
            </p>
            <p className="mt-3">
              {/* REVISI API ENTERPRISE MENJADI LEBIH AMAN TAPI TETAP COMPLIANT */}
              <strong>Penting:</strong> Data percakapan klien Tumbuh AI diproses melalui jalur Google Cloud API resmi. Berdasarkan kebijakan privasi penyedia, data Anda <strong>TIDAK</strong> digunakan oleh pihak ketiga (Google) untuk melatih model kecerdasan buatan publik mereka. Tumbuh AI tidak menjual, menyewakan, atau menukar data pribadi Anda atau pelanggan Anda kepada pengiklan, pialang data, atau pihak lain yang tidak berkepentingan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">4. Standar Keamanan dan Isolasi (Row Level Security)</h2>
            <p>
              Infrastruktur basis data Tumbuh AI (didukung oleh Supabase/PostgreSQL) menggunakan sistem <em>Row Level Security (RLS)</em> tingkat arsitektur. Data klien diisolasi secara kriptografis pada tingkat baris. Ini memastikan bahwa sebuah institusi secara teknis tidak dapat mengakses, melihat, atau mengekstrak data percakapan milik institusi lain, meskipun berada di dalam klaster peladen yang sama.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">5. Retensi dan Penghapusan Data (Right to be Forgotten)</h2>
            <p>
              Data <em>leads</em> dan riwayat percakapan disimpan selama Klien mempertahankan langganan aktif, untuk keperluan fitur analitik. Klien berhak sewaktu-waktu mengajukan penghapusan instan seluruh rekam jejak basis data mereka dari peladen Tumbuh AI (<em>Right to Erasure</em>). 
            </p>
            {/* PENAMBAHAN INSTRUKSI PENGHAPUSAN DATA */}
            <p className="mt-3 text-cyan-400 font-medium">
              Pengajuan penghapusan data dapat dilakukan dengan mengirimkan email ke <strong>jacquellinobryan@gmail.com</strong> dengan subjek: <strong>REQUEST DATA DELETION</strong>.
            </p>
            <p className="mt-3">
              Setelah akun ditutup secara permanen dan permintaan divalidasi, seluruh data yang tertaut akan dihapus dari sistem kami selambat-lambatnya dalam waktu 30 hari kerja sesuai dengan standar kepatuhan operasional.
            </p>
          </section>

          {/* PENAMBAHAN KONTAK DPO BARU */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-cyan-500 pl-4">6. Petugas Pelindungan Data (DPO) & Kontak</h2>
            <p>
              Sesuai amanat UU PDP, Tumbuh AI menyediakan jalur komunikasi khusus untuk urusan pelindungan data. Jika Anda memiliki pertanyaan, kekhawatiran, atau keluhan terkait cara kami menangani data Anda, silakan hubungi tim kepatuhan kami melalui email: <strong>jacquellinobryan@gmail.com</strong>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}