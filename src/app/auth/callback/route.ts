import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = request.nextUrl.searchParams.get("next");
  let destination = "/dashboard";
  if (nextPath) {
    const candidate = new URL(nextPath, request.url);
    if (candidate.origin === request.nextUrl.origin) {
      destination = `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
