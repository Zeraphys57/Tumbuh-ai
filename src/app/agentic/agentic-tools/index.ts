// ============================================================================
// IMPORT SEMUA 10 SENJATA AGENTIC TUMBUH.AI
// ============================================================================
import { checkStockSchema, executeCheckStock } from "./toolCheckStock";
import { buatPesananSchema, executeBuatPesanan } from "./toolMakeOrder"; // Menggunakan nama file baru dari Bos
import { calculateShippingSchema, executeCalculateShipping } from "./toolCalculateShipping";
import { checkScheduleSchema, executeCheckSchedule } from "./toolCheckSchedule";
import { makeBookingSchema, executeMakeBooking } from "./toolMakeBooking";
import { calculateCustomPriceSchema, executeCalculateCustomPrice } from "./toolCalculateCustomPrice";
import { checkOrderStatusSchema, executeCheckOrderStatus } from "./toolCheckOrderStatus";
import { registerMemberSchema, executeRegisterMember } from "./toolRegisterMember";
import { checkPointsSchema, executeCheckPoints } from "./toolCheckPoints";
import { panggilAdminSchema, executePanggilAdmin } from "./toolPanggilAdmin";

// ============================================================================
// 📚 REGISTRY ALAT AGENTIC (THE MASTER CATALOG)
// ============================================================================
export const AgenticToolRegistry: Record<string, { schema: any, execute: Function }> = {
  // --- Kategori 1: Transaksi & Gudang ---
  "check_stock": { schema: checkStockSchema, execute: executeCheckStock },
  "buat_pesanan": { schema: buatPesananSchema, execute: executeBuatPesanan },
  "calculate_shipping": { schema: calculateShippingSchema, execute: executeCalculateShipping },
  
  // --- Kategori 2: Jadwal & Jasa Kustom ---
  "check_schedule": { schema: checkScheduleSchema, execute: executeCheckSchedule },
  "make_booking": { schema: makeBookingSchema, execute: executeMakeBooking },
  "calculate_custom_price": { schema: calculateCustomPriceSchema, execute: executeCalculateCustomPrice },
  
  // --- Kategori 3: Customer Service & Member ---
  "check_order_status": { schema: checkOrderStatusSchema, execute: executeCheckOrderStatus },
  "register_member": { schema: registerMemberSchema, execute: executeRegisterMember },
  "check_points": { schema: checkPointsSchema, execute: executeCheckPoints },
  
  // --- Kategori 4: Eskalasi ---
  "panggil_admin": { schema: panggilAdminSchema, execute: executePanggilAdmin }
};

// ============================================================================
// FUNGSI HELPER UNTUK ROUTE.TS (DYNAMIC LOADING)
// ============================================================================
export function getGeminiToolsConfig(activeToolNames: string[]) {
  const functionDeclarations = activeToolNames
    .filter(name => AgenticToolRegistry[name]) 
    .map(name => AgenticToolRegistry[name].schema);

  if (functionDeclarations.length === 0) return undefined;

  return [{ functionDeclarations }];
}

export async function executeAgenticCall(callName: string, callArgs: any, clientConfig: any) {
  const tool = AgenticToolRegistry[callName];
  if (!tool) {
    throw new Error(`Tool ${callName} tidak terdaftar di sistem Tumbuh.ai.`);
  }
  
  // Eksekusi fungsi dan kembalikan hasilnya ke Gemini
  return await tool.execute(callArgs, clientConfig);
}