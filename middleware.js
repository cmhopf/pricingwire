import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// ── Rate limiter — 4 requests per 2-hour sliding window per IP ────────────────
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '2 h'),
  analytics: false,
});

export async function middleware(request) {
  // ── Identify requester IP ─────────────────────────────────────────────────
  const ip =
    request.ip ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'anonymous';

  // ── Check rate limit ──────────────────────────────────────────────────────
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'You have reached the limit of 4 assessments per 2 hours. Please try again later.' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

// ── Apply middleware to analyze endpoint only ─────────────────────────────────
export const config = {
  matcher: '/api/analyze',
};
