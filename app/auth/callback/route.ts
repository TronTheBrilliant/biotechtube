import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (code) {
    // OAuth callback — exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}/`);
  }

  if (token_hash && type) {
    // Email verification callback
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "recovery" | "email",
    });

    if (!error) {
      // Redirect based on type
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/profile`);
      }
      return NextResponse.redirect(`${origin}/?verified=true`);
    }
  }

  // Fallback — redirect to homepage
  return NextResponse.redirect(`${origin}/`);
}
