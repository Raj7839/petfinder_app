export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTimeAgo(dateString: string): string {
  return formatDate(dateString);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'var(--color-blue-500)';
    case 'pending': return 'var(--color-amber-500)';
    case 'matched': return 'var(--color-emerald-500)';
    case 'resolved': return 'var(--color-text-tertiary)';
    case 'confirmed': return 'var(--color-emerald-500)';
    case 'dismissed': return 'var(--color-red-500)';
    default: return 'var(--color-text-secondary)';
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'var(--color-emerald-500)';
  if (confidence >= 60) return 'var(--color-amber-500)';
  return 'var(--color-red-500)';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 80) return 'High';
  if (confidence >= 70) return 'Good';
  if (confidence >= 60) return 'Moderate';
  return 'Low';
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '…';
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
