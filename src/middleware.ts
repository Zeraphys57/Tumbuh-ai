import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 1. Ambil data user secara fresh dari server
  const { data: { user } } = await supabase.auth.getUser();
  const nextUrl = request.nextUrl;
  
  // Ambil metadata
  const role = user?.user_metadata?.role;
  const clientId = user?.user_metadata?.client_id;

  // 2. Jika mencoba akses folder /dashboard tapi belum login sama sekali
  if (!user && nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. LOGIKA REDIRECT SAAT LOGIN (Ini yang krusial buat kamu, Bryan)
  if (user && nextUrl.pathname === "/login") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/leads", request.url));
  }

  // 4. PROTEKSI FOLDER ADMIN
  if (nextUrl.pathname.startsWith("/dashboard/admin")) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard/leads", request.url));
    }
  }

  // 5. PROTEKSI FOLDER LEADS (Hanya klien sah atau super_admin yang boleh lewat)
  if (nextUrl.pathname.startsWith("/dashboard/leads")) {
    if (role !== "super_admin" && !clientId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 6. REDIRECT BASE DASHBOARD: Jika cuma ketik /dashboard tanpa buntut
  if (nextUrl.pathname === "/dashboard") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/leads", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};