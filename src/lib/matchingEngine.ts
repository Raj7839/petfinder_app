import type { FoundAnimalReport, MissingAnimalReport, MatchResult } from '../types';
import { calculateDistance, generateId, formatDistance } from '../utils/helpers';
import { getMatchPercentage } from './tfjs';

// Base weights for matching (sum = 1.0 when all signals have data)
const BASE_WEIGHTS: Record<string, number> = {
  type: 0.20,        // Animal type (dog, cat, etc.)
  visual: 0.45,      // TFJS Image similarity - primary signal
  location: 0.20,    // Geolocation proximity
  temporal: 0.10,    // Time difference
  description: 0.05, // Textual metadata (breed, color, etc.)
};

type SignalResult = { score: number; reason?: string; hasData: boolean };

function typeScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const ft = found.details.type || 'other';
  const mt = missing.identity.type || 'other';
  if (ft === mt) {
    return { score: 100, reason: `Type match: ${mt}`, hasData: true };
  }
  return { score: 0, reason: `Type mismatch`, hasData: true };
}

function visualScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  if (!found.imageFeatures || !missing.imageFeatures || missing.imageFeatures.length === 0) {
    return { score: 50, hasData: false };
  }
  
  let bestScore = 0;
  for (const mFeature of missing.imageFeatures) {
    const score = getMatchPercentage(found.imageFeatures, mFeature);
    if (score > bestScore) bestScore = score;
  }
  
  if (bestScore > 80) {
    return { score: bestScore, reason: `Visual match: ${bestScore}%`, hasData: true };
  }
  return { score: bestScore, hasData: true };
}

function proximityScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const fLat = found.location.lat, fLng = found.location.lng;
  const mLat = missing.lastSeen.location.lat, mLng = missing.lastSeen.location.lng;
  if (!fLat || !fLng || !mLat || !mLng) return { score: 30, hasData: false };

  const km = calculateDistance(fLat, fLng, mLat, mLng);
  const distStr = formatDistance(km);

  if (km <= 2)  return { score: 100, reason: `Found ${distStr} from last seen`, hasData: true };
  if (km <= 5)  return { score: 95,  reason: `Found ${distStr} from last seen`, hasData: true };
  if (km <= 10) return { score: 80,  reason: `Found ${distStr} from last seen`, hasData: true };
  if (km <= 25) return { score: 60,  reason: `Found ${distStr} away`, hasData: true };
  if (km <= 50) return { score: 40,  reason: `Found ${distStr} away`, hasData: true };
  return { score: 10, hasData: true };
}

function descriptionScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const foundText = [found.details.breed, found.details.primaryColor, found.details.collarDetails, found.details.behavior, found.details.notes].filter(Boolean).join(' ').toLowerCase();
  const missingText = [missing.identity.breed, missing.identity.primaryColor, missing.identity.secondaryColor, missing.identity.collarDetails, missing.identity.distinguishingFeatures, missing.lastSeen.circumstances].filter(Boolean).join(' ').toLowerCase();

  if (!foundText.trim() || !missingText.trim()) return { score: 40, hasData: false };

  const fw = foundText.split(/\s+/).filter(w => w.length >= 3);
  const mw = missingText.split(/\s+/).filter(w => w.length >= 3);
  
  if (!fw.length || !mw.length) return { score: 40, hasData: false };

  let matches = 0;
  for (const w of mw) {
    if (fw.includes(w)) matches++;
  }
  
  const ratio = Math.min(1, matches / mw.length);
  const score = Math.round(25 + ratio * 75);
  return { score, hasData: true };
}

function temporalScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const ft = new Date(found.timestamp || found.createdAt).getTime();
  const mt = new Date(missing.lastSeen.date || missing.createdAt).getTime();
  if (isNaN(ft) || isNaN(mt)) return { score: 50, hasData: false };

  if (ft < mt) {
    return { score: 10, hasData: true }; // Found before lost makes no sense
  }
  const h = (ft - mt) / 3600000;
  if (h <= 24)  return { score: 100, reason: 'Found within 24 hours', hasData: true };
  if (h <= 72)  return { score: 90,  reason: 'Found within 3 days', hasData: true };
  if (h <= 168) return { score: 75,  reason: 'Found within 1 week', hasData: true };
  if (h <= 720) return { score: 50,  hasData: true };
  return { score: 30, hasData: true };
}

export function computeMatchConfidence(
  found: FoundAnimalReport,
  missing: MissingAnimalReport
): { confidence: number; reasons: string[] } {

  const signals: Record<string, SignalResult> = {
    type: typeScore(found, missing),
    visual: visualScore(found, missing),
    location: proximityScore(found, missing),
    description: descriptionScore(found, missing),
    temporal: temporalScore(found, missing),
  };

  // Hard block: different animal types entirely
  if (signals.type.score === 0) return { confidence: 0, reasons: [] };

  let activeWeight = 0;
  for (const [key, sig] of Object.entries(signals)) {
    if (sig.hasData) activeWeight += BASE_WEIGHTS[key];
  }

  let raw = 0;
  if (activeWeight === 0) {
    raw = Object.values(signals).reduce((sum, s) => sum + s.score, 0) / Object.keys(signals).length;
  } else {
    for (const [key, sig] of Object.entries(signals)) {
      const effectiveWeight = sig.hasData ? BASE_WEIGHTS[key] / activeWeight : 0;
      raw += sig.score * effectiveWeight;
    }
  }

  const reasons: string[] = [];
  for (const sig of Object.values(signals)) {
    if (sig.reason) reasons.push(sig.reason);
  }

  return { confidence: Math.round(Math.min(100, raw)), reasons };
}

const MATCH_THRESHOLD = 50;
const NOTIFY_THRESHOLD = 85; // Set higher for animals
const MAX_MATCHES_PER_REPORT = 8;

export interface MatchingResult {
  matches: MatchResult[];
  notifications: Array<{
    id: string; type: 'match'; title: string;
    message: string; timestamp: string; read: boolean; linkedMatchId: string;
  }>;
}

function buildMatchingResult(
  pairs: Array<{ foundId: string; missingId: string; missingName?: string; foundAddr?: string; missingAddr?: string; confidence: number; reasons: string[] }>
): MatchingResult {
  const now = new Date().toISOString();
  const matches: MatchResult[] = [];
  const notifications: MatchingResult['notifications'] = [];

  for (const p of pairs) {
    const matchId = generateId();
    matches.push({
      id: matchId, foundReportId: p.foundId, missingReportId: p.missingId,
      confidence: p.confidence, matchReasons: p.reasons, timestamp: now, status: 'pending',
    });
    if (p.confidence >= NOTIFY_THRESHOLD) {
      const urgency = p.confidence >= 90 ? '🚨 EXACT MATCH' : '⚠️ Potential Match';
      notifications.push({
        id: generateId(), type: 'match',
        title: `${urgency} Found!`,
        message: `${p.missingName ? `Your pet ${p.missingName}` : 'A lost pet'} (${p.confidence}% match)${p.missingAddr ? ` — last seen near ${p.missingAddr}` : ''}`,
        timestamp: now, read: false, linkedMatchId: matchId,
      });
    }
  }
  return { matches, notifications };
}

export function runMatchingForFoundReport(
  found: FoundAnimalReport,
  allMissing: MissingAnimalReport[]
): MatchingResult {
  const active = allMissing.filter(m => m.status === 'active' || m.status === 'pending');
  const scored = active
    .map(m => { const { confidence, reasons } = computeMatchConfidence(found, m); return { m, confidence, reasons }; })
    .filter(x => x.confidence >= MATCH_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_MATCHES_PER_REPORT);

  return buildMatchingResult(scored.map(x => ({
    foundId: found.id, missingId: x.m.id,
    missingName: x.m.identity.name, missingAddr: x.m.lastSeen.location.address,
    confidence: x.confidence, reasons: x.reasons,
  })));
}

export function runMatchingForMissingReport(
  missing: MissingAnimalReport,
  allFound: FoundAnimalReport[]
): MatchingResult {
  const active = allFound.filter(f => f.status === 'active' || f.status === 'pending');
  const scored = active
    .map(f => { const { confidence, reasons } = computeMatchConfidence(f, missing); return { f, confidence, reasons }; })
    .filter(x => x.confidence >= MATCH_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_MATCHES_PER_REPORT);

  return buildMatchingResult(scored.map(x => ({
    foundId: x.f.id, missingId: missing.id,
    missingName: missing.identity.name, foundAddr: x.f.location.address,
    confidence: x.confidence, reasons: x.reasons,
  })));
}

export function runFullRematching(
  foundReports: FoundAnimalReport[],
  missingReports: MissingAnimalReport[],
  existingMatches: MatchResult[]
): MatchingResult {
  const existingPairs = new Set(existingMatches.map(m => `${m.foundReportId}|${m.missingReportId}`));
  const activeFound = foundReports.filter(f => f.status === 'active' || f.status === 'pending');
  const activeMissing = missingReports.filter(m => m.status === 'active' || m.status === 'pending');

  const newPairs: Parameters<typeof buildMatchingResult>[0] = [];

  for (const found of activeFound) {
    for (const missing of activeMissing) {
      const key = `${found.id}|${missing.id}`;
      if (existingPairs.has(key)) continue;

      const { confidence, reasons } = computeMatchConfidence(found, missing);
      if (confidence >= MATCH_THRESHOLD) {
        newPairs.push({
          foundId: found.id, missingId: missing.id,
          missingName: missing.identity.name, missingAddr: missing.lastSeen.location.address,
          confidence, reasons,
        });
      }
    }
  }

  newPairs.sort((a, b) => b.confidence - a.confidence);
  return buildMatchingResult(newPairs.slice(0, 20));
}
