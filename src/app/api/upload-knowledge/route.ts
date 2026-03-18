import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractText } from "unpdf";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

function smartChunkText(text: string, chunkSize: number = 1000, overlap: number = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientSlug = formData.get("clientId") as string; 

    if (!file || !clientSlug) {
      return NextResponse.json({ error: "File dan Client ID wajib diisi" }, { status: 400 });
    }

    const clientId = clientSlug;
    const fileName = file.name;

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !clientData) {
      return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
    }

    // ========================================================
    // [FIX 2: KRITIKAL] CEGAH DUPLIKAT DOKUMEN
    // ========================================================
    const { data: existingDoc } = await supabase
      .from("client_knowledge")
      .select("id")
      .eq("client_id", clientId)
      .eq("document_name", fileName)
      .limit(1);

    if (existingDoc && existingDoc.length > 0) {
      return NextResponse.json({ 
        error: `File "${fileName}" sudah ada di memori AI. Hapus file lama di tabel jika ingin update versi baru.` 
      }, { status: 409 });
    }

    console.log(`[RAG ENGINE] Memproses: ${fileName} untuk klien: ${clientSlug}`);

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer); 
    
    const extracted: any = await extractText(pdfBuffer);
    
    const fullText: string = Array.isArray(extracted.text) 
      ? extracted.text.join(" ") 
      : String(extracted.text || "");
    
    let rawText = fullText.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    if (!rawText || rawText.length < 50) {
      return NextResponse.json({ error: "Dokumen kosong atau berisi gambar/scan yang tidak bisa dibaca teksnya." }, { status: 400 });
    }

    if (rawText.length < 1500) { 
      return NextResponse.json({ 
        error: "❌ DOKUMEN TERLALU PENDEK! Silakan Copy-Paste isi PDF ini ke kotak 'AI Trainer' di atas agar AI merespon 10x lebih cepat." 
      }, { status: 400 });
    }

    const textChunks = smartChunkText(rawText, 1000, 200);
    console.log(`[RAG ENGINE] PDF dipotong menjadi ${textChunks.length} chunks.`);

    // ========================================================
    // [FIX 4: MASTERPIECE DARI CLAUDE] AUTO-RETRY ANTI-RATE LIMIT
    // ========================================================
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    // Fungsi khusus untuk ngakalin Google API kalau tiba-tiba nolak (Error 429)
    const embedWithRetry = async (chunk: string, retries = 3): Promise<any> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await embeddingModel.embedContent({
            content: { role: "user", parts: [{ text: chunk }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 1536
          } as any);
        } catch (err: any) {
          if (attempt === retries - 1) throw err; // Menyerah kalau udah 3x gagal
          console.warn(`[RAG ENGINE] Rate Limit Google terdeteksi! Sabar... Mencoba lagi dalam ${attempt + 1} detik (Percobaan ${attempt + 1}/${retries})`);
          // Exponential backoff: Makin sering gagal, makin lama nunggunya (1 dtk, 2 dtk, dst)
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    };

    // ========================================================
    // [FIX 1: KRITIKAL] PARALLEL BATCH EMBEDDING (ANTI-TIMEOUT)
    // ========================================================
    const databaseRows: any[] = [];
    const BATCH_SIZE = 5; // Memproses 5 chunks sekaligus

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batchChunks = textChunks.slice(i, i + BATCH_SIZE);
      
      // MENGGUNAKAN FUNGSI RETRY DARI CLAUDE DI SINI!
      const embedPromises = batchChunks.map(chunk => embedWithRetry(chunk));

      const batchResults = await Promise.all(embedPromises);

      batchResults.forEach((result, idx) => {
        databaseRows.push({
          client_id: clientId,
          document_name: fileName,
          content: batchChunks[idx],
          embedding: result.embedding.values
        });
      });

      // Jeda 200ms normal antar batch
      if (i + BATCH_SIZE < textChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // ========================================================
    // [FIX 3: PENTING] BATCH INSERT SUPABASE DENGAN ROLLBACK
    // ========================================================
    const INSERT_BATCH = 20; 
    
    for (let i = 0; i < databaseRows.length; i += INSERT_BATCH) {
      const batchRows = databaseRows.slice(i, i + INSERT_BATCH);
      
      const { error: insertError } = await supabase
        .from("client_knowledge")
        .insert(batchRows);

      if (insertError) {
        console.error(`Gagal insert batch ke-${i/INSERT_BATCH}:`, insertError);
        
        await supabase
          .from("client_knowledge")
          .delete()
          .eq("client_id", clientId)
          .eq("document_name", fileName);

        throw new Error("Gagal menyimpan memori ke database. Perubahan otomatis dibatalkan.");
      }
    }

    console.log(`[RAG ENGINE] Sukses! ${databaseRows.length} vektor tersimpan di Supabase.`);

    return NextResponse.json({ 
      success: true, 
      message: `Dokumen ${fileName} berhasil diproses dengan sangat cepat!`,
      total_chunks: databaseRows.length
    });

  } catch (error: any) {
    console.error("[RAG ENGINE] Error:", error.message);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan internal saat memproses PDF." }, { status: 500 });
  }
}