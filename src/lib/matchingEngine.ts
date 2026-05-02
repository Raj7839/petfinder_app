import type { FoundAnimalReport, MissingAnimalReport, MatchResult } from '../types';
import { calculateDistance, generateId, formatDistance } from '../utils/helpers';
import { getMatchPercentage } from './tfjs';

// Base weights for matching (refined for high precision)
const BASE_WEIGHTS: Record<string, number> = {
  type: 0.25,        // Animal type (dog, cat, etc.) - Hard Filter
  visual: 0.40,      // TFJS Image similarity
  breed: 0.15,       // Specific breed matching
  location: 0.10,    // Geolocation proximity (Exponential decay)
  temporal: 0.05,    // Time difference
  description: 0.05, // Distinguishing features (Collar, unique marks)
};

type SignalResult = { score: number; reason?: string; hasData: boolean };

function typeScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const ft = found.details.type?.toLowerCase() || 'other';
  const mt = missing.identity.type?.toLowerCase() || 'other';
  if (ft === mt) {
    return { score: 100, reason: `Type match: ${mt}`, hasData: true };
  }
  return { score: 0, reason: `Type mismatch`, hasData: true };
}

function breedScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const fb = found.details.breed?.toLowerCase().trim();
  const mb = missing.identity.breed?.toLowerCase().trim();
  
  if (!fb || !mb || fb === 'unknown' || mb === 'unknown') {
    return { score: 50, hasData: false };
  }

  if (fb === mb) {
    return { score: 100, reason: `Exact breed match: ${fb}`, hasData: true };
  }

  // Partial match (e.g. "Golden Retriever" vs "Retriever")
  if (fb.includes(mb) || mb.includes(fb)) {
    return { score: 80, reason: `Partial breed match`, hasData: true };
  }

  return { score: 20, hasData: true };
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
  
  if (bestScore > 85) {
    return { score: bestScore, reason: `Strong visual similarity: ${bestScore}%`, hasData: true };
  }
  if (bestScore > 70) {
    return { score: bestScore, reason: `Moderate visual similarity`, hasData: true };
  }
  return { score: bestScore, hasData: true };
}

function proximityScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const fLat = found.location.lat, fLng = found.location.lng;
  const mLat = missing.lastSeen.location.lat, mLng = missing.lastSeen.location.lng;
  if (!fLat || !fLng || !mLat || !mLng) return { score: 50, hasData: false };

  const km = calculateDistance(fLat, fLng, mLat, mLng);
  
  // Exponential decay: e^(-0.2 * distance)
  // At 0km = 100, 5km = ~36, 10km = ~13
  const score = Math.round(100 * Math.exp(-0.25 * km));
  
  if (km <= 1) return { score, reason: 'Found very close to last seen area', hasData: true };
  if (km <= 5) return { score, reason: `Found within ${formatDistance(km)} range`, hasData: true };
  
  return { score, hasData: true };
}

function descriptionScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const fb = found.details.behavior?.toLowerCase() || '';
  const mb = missing.lastSeen.circumstances?.toLowerCase() || '';
  const fc = found.details.collarDetails?.toLowerCase() || '';
  const mc = missing.identity.collarDetails?.toLowerCase() || '';
  
  const foundText = [found.details.primaryColor, found.details.notes, fc, fb].filter(Boolean).join(' ').toLowerCase();
  const missingText = [missing.identity.primaryColor, missing.identity.secondaryColor, missing.identity.distinguishingFeatures, mc, mb].filter(Boolean).join(' ').toLowerCase();

  if (!foundText.trim() || !missingText.trim()) return { score: 50, hasData: false };

  const keywords = ['collar', 'tag', 'microchip', 'scar', 'spot', 'friendly', 'aggressive', 'scared'];
  let boost = 0;
  let matches = 0;

  // Check for unique attributes like collars or microchips
  if (fc && mc && (fc.includes(mc) || mc.includes(fc))) {
    boost += 30;
    matches++;
  }

  const fw = foundText.split(/\s+/).filter(w => w.length >= 3);
  const mw = missingText.split(/\s+/).filter(w => w.length >= 3);
  
  for (const w of mw) {
    if (fw.includes(w)) {
      matches++;
      if (keywords.includes(w)) boost += 10;
    }
  }
  
  const ratio = Math.min(1, matches / (mw.length || 1));
  const score = Math.min(100, Math.round(30 + ratio * 70 + boost));
  
  if (boost > 20) return { score, reason: 'Unique matching features identified', hasData: true };
  return { score, hasData: true };
}

function temporalScore(found: FoundAnimalReport, missing: MissingAnimalReport): SignalResult {
  const ft = new Date(found.timestamp || found.createdAt).getTime();
  const mt = new Date(missing.lastSeen.date || missing.createdAt).getTime();
  if (isNaN(ft) || isNaN(mt)) return { score: 50, hasData: false };

  if (ft < mt) return { score: 0, reason: 'Found before report date', hasData: true };

  const days = (ft - mt) / (24 * 3600000);
  // Decay over time: 100 at 0 days, 50 at 7 days, 10 at 30 days
  const score = Math.round(100 * Math.exp(-0.1 * days));
  
  if (days <= 1) return { score, reason: 'Found shortly after disappearance', hasData: true };
  return { score, hasData: true };
}

export function computeMatchConfidence(
  found: FoundAnimalReport,
  missing: MissingAnimalReport
): { confidence: number; reasons: string[] } {

  const signals: Record<string, SignalResult> = {
    type: typeScore(found, missing),
    breed: breedScore(found, missing),
    visual: visualScore(found, missing),
    location: proximityScore(found, missing),
    description: descriptionScore(found, missing),
    temporal: temporalScore(found, missing),
  };

  // Hard block: different animal types entirely
  if (signals.type.score === 0) return { confidence: 0, reasons: [] };

  let totalScore = 0;
  let activeWeight = 0;

  for (const [key, sig] of Object.entries(signals)) {
    if (sig.hasData) {
      totalScore += sig.score * BASE_WEIGHTS[key];
      activeWeight += BASE_WEIGHTS[key];
    } else {
      // For missing signals, redistribute weight or use a neutral score
      totalScore += 50 * BASE_WEIGHTS[key];
      activeWeight += BASE_WEIGHTS[key];
    }
  }

  const confidence = Math.round(totalScore / activeWeight);
  const reasons: string[] = [];
  for (const sig of Object.values(signals)) {
    if (sig.reason) reasons.push(sig.reason);
  }

  return { confidence: Math.min(100, confidence), reasons };
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
