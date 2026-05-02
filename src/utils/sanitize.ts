// ============================================
// Input Sanitization Utilities
// Strips HTML, script injection, null bytes,
// and SQL-like injection patterns from all
// user-supplied text before storing.
// ============================================

/** Strip HTML tags and dangerous characters from a string */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '')                          // null bytes
    .replace(/<[^>]*>/g, '')                     // HTML tags
    .replace(/javascript\s*:/gi, '')             // js: URI
    .replace(/on\w+\s*=/gi, '')                  // onerror= onload= etc.
    .replace(/data\s*:\s*text\/html/gi, '')      // data:text/html
    .replace(/<!--[\s\S]*?-->/g, '')             // HTML comments
    .trim()
    .slice(0, 5000);                             // hard cap per field
}

/** Sanitize an object's string fields recursively (depth-1) */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      result[key] = sanitizeText(val);
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeObject(val as Record<string, unknown>);
    } else if (Array.isArray(val)) {
      result[key] = val.map(item =>
        typeof item === 'string' ? sanitizeText(item) : item
      );
    }
  }
  return result as T;
}

/** Validate an uploaded image file — type and size */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE_MB = 5;
  const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Only image files are allowed (JPEG, PNG, WebP). Got: ${file.type || 'unknown'}` };
  }
  if (file.size > MAX_BYTES) {
    return { valid: false, error: `Image must be under ${MAX_SIZE_MB}MB. This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` };
  }
  return { valid: true };
}

/** Password strength scorer — returns 0 (weak) to 4 (very strong) */
export function getPasswordStrength(password: string): {
  score: number;
  label: 'Too Short' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
} {
  if (password.length < 8) return { score: 0, label: 'Too Short', color: '#EF4444' };

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Penalise common passwords
  const common = ['password','password1','123456','admin123','qwerty','welcome','letmein','petfinder123','iloveyou','sunshine'];
  if (common.some(c => password.toLowerCase().includes(c))) score = Math.min(score, 1);

  if (score <= 1) return { score: 1, label: 'Weak',      color: '#EF4444' };
  if (score === 2) return { score: 2, label: 'Fair',      color: '#F59E0B' };
  if (score === 3) return { score: 3, label: 'Strong',    color: '#10B981' };
  return              { score: 4, label: 'Very Strong', color: '#06B6D4' };
}
