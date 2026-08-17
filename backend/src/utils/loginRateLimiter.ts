interface FailedAttemptRecord {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

// In-memory rate limiting store (Key: identifier string e.g. `${ip}:${username}`)
const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

// Cleanup stale entries older than 24 hours every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of failedAttemptsMap.entries()) {
    if (now - record.lastAttempt > 24 * 60 * 60 * 1000) {
      failedAttemptsMap.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Calculates cooldown duration in seconds based on failed attempt count
 * - 1-3 attempts: 0s
 * - 4th attempt: 30s
 * - 5th attempt: 60s (1 min)
 * - 6th attempt: 120s (2 min)
 * - 7th attempt: 240s (4 min)
 * - 8th attempt: 480s (8 min)
 * - 9th attempt: 960s (16 min)
 * - 10th attempt: 1920s (32 min)
 * - ... up to 15 attempts (Permanent Lockout)
 */
export function calculateCooldownSeconds(attemptCount: number): number {
  if (attemptCount <= 3) return 0;
  if (attemptCount === 4) return 30;
  // For attempts 5 to 14: 30 * 2^(attemptCount - 4)
  const multiplier = Math.pow(2, attemptCount - 4);
  return 30 * multiplier;
}

export function formatCooldownTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} วินาที`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} นาที`;
}

/**
 * Check if the user/IP is currently locked out
 */
export function checkLoginRateLimit(key: string): { isLocked: boolean; remainingSeconds: number; attemptCount: number; isPermanentlyLocked: boolean } {
  const now = Date.now();
  const record = failedAttemptsMap.get(key);

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attemptCount: 0, isPermanentlyLocked: false };
  }

  if (record.count >= 15) {
    return { isLocked: true, remainingSeconds: 999999, attemptCount: record.count, isPermanentlyLocked: true };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attemptCount: record.count, isPermanentlyLocked: false };
  }

  return { isLocked: false, remainingSeconds: 0, attemptCount: record.count, isPermanentlyLocked: false };
}

/**
 * Record a failed login attempt and set cooldown if threshold reached
 */
export function recordFailedLogin(key: string): { attemptCount: number; cooldownSeconds: number; isPermanentlyLocked: boolean } {
  const now = Date.now();
  const existing = failedAttemptsMap.get(key) || { count: 0, lockedUntil: null, lastAttempt: now };
  const newCount = existing.count + 1;

  if (newCount >= 15) {
    failedAttemptsMap.set(key, {
      count: newCount,
      lockedUntil: now + 365 * 24 * 60 * 60 * 1000, // Lock indefinitely
      lastAttempt: now,
    });
    return { attemptCount: newCount, cooldownSeconds: 999999, isPermanentlyLocked: true };
  }

  const cooldown = calculateCooldownSeconds(newCount);
  const lockedUntil = cooldown > 0 ? now + cooldown * 1000 : null;

  failedAttemptsMap.set(key, {
    count: newCount,
    lockedUntil,
    lastAttempt: now,
  });

  return { attemptCount: newCount, cooldownSeconds: cooldown, isPermanentlyLocked: false };
}

/**
 * Reset failed login attempts upon successful authentication or admin unlock
 */
export function resetLoginAttempts(key: string): void {
  failedAttemptsMap.delete(key);
}
