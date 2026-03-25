import { createClient } from "@supabase/supabase-js";

// Wajib gunakan Service Role Key untuk bypass RLS di Backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fungsi untuk mengecek dan memotong kuota Global Wallet klien secara ATOMIC (Anti Race-Condition)
 */
export async function checkAndDeductQuota(clientId: string, deductAmount: number = 1) {
  if (!clientId) {
    return { allowed: false, error: "Client ID diperlukan", status: 400 };
  }

  // Panggil fungsi RPC yang dieksekusi langsung di dalam mesin Database
  const { data: newQuota, error } = await supabaseAdmin.rpc('safe_deduct_quota', { 
    p_client_id: clientId, 
    p_amount: deductAmount 
  });

  if (error) {
    console.error("❌ RPC Error:", error);
    return { allowed: false, error: "Gagal memverifikasi kuota sistem.", status: 500 };
  }

  // Jika fungsi mengembalikan -1, berarti saldo tidak cukup
  if (newQuota === -1) {
    return { 
      allowed: false, 
      error: "Kuota Premium AI habis. Silakan hubungi admin Tumbuh.ai untuk upgrade paket!", 
      status: 403 
    };
  }

  return { allowed: true, remainingQuota: newQuota };
}

/**
 * Fungsi CCTV Telemetry untuk mencatat pemakaian Token & Latency.
 */
export async function logAiUsage(params: {
  clientId: string;
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  status: 'success' | 'error';
}) {
  try {
    await supabaseAdmin.from("usage_logs").insert({
      client_id: params.clientId,
      model_used: params.modelUsed,
      tokens_input: params.promptTokens || 0,
      tokens_output: params.completionTokens || 0,
      total_tokens: params.totalTokens || 0,
      latency_ms: params.latencyMs,
      status: params.status
    });
  } catch (error) {
    console.error("❌ Gagal mencatat log telemetry:", error);
  }
}