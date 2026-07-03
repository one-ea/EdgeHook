export interface RateLimiter {
  isAllowed(key: string, maxRequests: number, windowSeconds: number): boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  isAllowed(key: string, maxRequests: number, windowSeconds: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxRequests - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = Math.floor(elapsed * (maxRequests / windowSeconds));

    if (refill > 0) {
      bucket.tokens = Math.min(bucket.tokens + refill, maxRequests);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  checkLimit(key: string, maxRequests: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxRequests - 1, lastRefill: now };
      this.buckets.set(key, bucket);
      return { allowed: true, remaining: bucket.tokens, resetAt: now + windowSeconds * 1000 };
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = Math.floor(elapsed * (maxRequests / windowSeconds));

    if (refill > 0) {
      bucket.tokens = Math.min(bucket.tokens + refill, maxRequests);
      bucket.lastRefill = now;
    }

    const allowed = bucket.tokens > 0;
    if (allowed) {
      bucket.tokens--;
    }

    return {
      allowed,
      remaining: bucket.tokens,
      resetAt: bucket.lastRefill + windowSeconds * 1000
    };
  }
}

export const globalRateLimiter = new TokenBucketRateLimiter();
