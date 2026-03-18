import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Only rate limit API routes
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting if Upstash is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return NextResponse.next();
  }

  const { checkRateLimit } = await import('./lib/rate-limit');
  const blocked = await checkRateLimit(req);
  if (blocked) return blocked;

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
