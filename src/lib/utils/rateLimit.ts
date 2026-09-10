type RateLimitBucket = {
  attempts: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { attempts: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: maxAttempts - 1,
    };
  }

  if (current.attempts >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
      remainingAttempts: 0,
    };
  }

  current.attempts += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: maxAttempts - current.attempts,
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

