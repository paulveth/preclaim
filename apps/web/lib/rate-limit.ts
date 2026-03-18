import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

// Upstash-backed rate limiter (production)
async function upstashRateLimit(identifier: string): Promise<RateLimitResult> {
  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min
  });

  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
  };
}

// Check rate limit — returns null if allowed, Response if blocked
// Gracefully disabled when UPSTASH_REDIS_REST_URL is not set
export async function checkRateLimit(req: NextRequest): Promise<Response | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return null; // Rate limiting not configured, allow all
  }

  const identifier = req.headers.get('authorization')?.slice(7, 15)
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? 'anonymous';

  try {
    const result = await upstashRateLimit(identifier);

    if (!result.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Try again in a minute.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
          },
        },
      );
    }
  } catch {
    // Fail open — rate limit errors should not block requests
    return null;
  }

  return null;
}
