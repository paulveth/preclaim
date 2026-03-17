import { NextRequest, NextResponse } from 'next/server';

// GET /api/v1/auth/callback — OAuth callback (redirect from Supabase Auth)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const cliPort = req.nextUrl.searchParams.get('cli_port');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url));
  }

  // If CLI login, redirect to local CLI server with code
  if (cliPort) {
    const cliCallback = `http://localhost:${cliPort}/callback?code=${code}`;
    return NextResponse.redirect(cliCallback);
  }

  // Web login — redirect to dashboard
  return NextResponse.redirect(new URL(`/dashboard?code=${code}`, req.url));
}
