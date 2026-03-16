"use client";
import Link from "next/link";

export default function PrivacyPolicy() {
  const lastUpdated = "9 Maret 2026";

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-6 md:px-12 font-sans selection:bg-blue-200">
      <div className="max-w-5xl mx-auto bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100">
        
        <Link href="/register" className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 mb-8 transition-colors uppercase tracking-widest">
          &larr; Kembali ke Pendaftaran
        </Link>

        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">Kebijakan <span className="text-blue-600 italic">Privasi</span></h1>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-12 border-b border-slate-100 pb-8">Pembaruan Terakhir: {lastUpdated} | Kepatuhan: UU PDP No. 27 Tahun 2022</p>

        <div className="prose prose-slate prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 max-w-none text-slate-700 leading-relaxed text-[15px] text-justify">
          
          <p className="font-medium text-slate-500 italic">
            Tumbuh AI berkomitmen penuh untuk melindungi privasi dan keamanan data bisnis Anda. Kebijakan ini menjelaskan dengan transparan bagaimana kami mengumpulkan, memproses, menyimpan, dan melindungi informasi Anda.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">1. Posisi Hukum: Pemroses Data vs. Pengendali Data</h3>
          <p>
            Berdasarkan Undang-Undang Pelindungan Data Pribadi (UU PDP), dalam konteks pengelolaan data pelanggan akhir (<i>End-User</i> seperti pasien klinik atau pelanggan toko Anda), <strong>Anda (Klien) bertindak sebagai Pengendali Data</strong>. Anda yang menentukan tujuan pemrosesan. <strong>Tumbuh AI bertindak secara eksklusif sebagai Pemroses Data</strong> yang memproses instruksi teknis sesuai konfigurasi sistem yang Anda tetapkan.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">2. Data yang Diproses</h3>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Data Administratif Klien:</strong> Nama institusi, email otorisasi, kredensial login (dienkripsi searah via Supabase Auth), dan metadata konfigurasi (<i>system prompts</i>).</li>
            <li><strong>Data Transaksional Pelanggan (Leads):</strong> Nama, nomor kontak (WhatsApp), waktu reservasi, keluhan layanan, dan rekaman log percakapan tekstual (<i>chat logs</i>).</li>
          </ul>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">3. Sub-Pemroses & Pihak Ketiga (Third-Party Sub-processors)</h3>
          <p>
            Untuk menjalankan fitur inti Layanan, Tumbuh AI mengirimkan teks percakapan (dalam bentuk terenkripsi) ke penyedia infrastruktur AI pihak ketiga (API Google Gemini).<br></br>  
            <strong>Penting:</strong> Data percakapan klien Tumbuh AI diproses melalui jalur API Enterprise. Data Anda <strong>TIDAK</strong> digunakan oleh pihak ketiga (Google) untuk melatih model kecerdasan buatan publik mereka. Tumbuh AI tidak menjual, menyewakan, atau menukar data pribadi Anda atau pelanggan Anda kepada pengiklan, pialang data, atau pihak lain yang tidak berkepentingan.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">4. Standar Keamanan dan Isolasi (Row Level Security)</h3>
          <p>
            Infrastruktur basis data Tumbuh AI (didukung oleh Supabase/PostgreSQL) menggunakan sistem <i>Row Level Security (RLS)</i> tingkat arsitektur. Data klien diisolasi secara kriptografis pada tingkat baris. Ini memastikan bahwa sebuah institusi (misal: Klinik A) secara teknis tidak dapat mengakses, melihat, atau mengekstrak data percakapan milik institusi lain (misal: Resto B), meskipun berada di dalam klaster peladen (<i>server</i>) yang sama.
          </p>

          <h3 className="text-xl text-slate-900 mt-10 mb-4 border-l-4 border-blue-600 pl-4">5. Retensi dan Penghapusan Data (Right to be Forgotten)</h3>
          <p>
            Data <i>leads</i> dan riwayat percakapan disimpan selama Klien mempertahankan langganan aktif, untuk keperluan fitur analitik (<i>Executive Summary</i>). Klien berhak sewaktu-waktu mengajukan penghapusan instan seluruh rekam jejak basis data mereka dari peladen Tumbuh AI (<i>Right to Erasure</i>). Setelah akun ditutup secara permanen, seluruh data yang tertaut akan dihapus dari sistem kami selambat-lambatnya dalam waktu 30 hari kerja sesuai dengan standar kepatuhan operasional.
          </p>

        </div>
      </div>
    </div>
  );
}