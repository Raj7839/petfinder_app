export interface FoundAnimalReport {
  id: string;
  photos: string[]; // base64 data URLs
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  timestamp: string;
  details: {
    type: 'dog' | 'cat' | 'bird' | 'other';
    isPet: boolean;
    breed?: string;
    primaryColor?: string;
    behavior?: string;
    collarDetails?: string;
    notes?: string;
  };
  imageFeatures?: number[]; // AI embeddings from TFJS
  status: 'pending' | 'active' | 'matched' | 'resolved';
  createdAt: string;
  reportedBy: string;
  matchedWith?: string;
}

export interface MissingAnimalReport {
  id: string;
  photos: string[]; // base64 data URLs
  identity: {
    type: 'dog' | 'cat' | 'bird' | 'other';
    name?: string;
    breed?: string;
    primaryColor?: string;
    secondaryColor?: string;
    distinguishingFeatures?: string;
    collarDetails?: string;
  };
  lastSeen: {
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    date: string;
    time?: string;
    circumstances?: string;
  };
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  imageFeatures?: number[][]; // AI embeddings from TFJS for each photo
  status: 'pending' | 'active' | 'matched' | 'resolved';
  createdAt: string;
  reportedBy: string;
  matchedWith?: string;
}

export interface MatchResult {
  id: string;
  foundReportId: string;
  missingReportId: string;
  confidence: number; // 0-100
  matchReasons?: string[];
  timestamp: string;
  status: 'pending' | 'confirmed' | 'dismissed';
}

export interface AppNotification {
  id: string;
  type: 'match' | 'report_update' | 'nearby' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkedMatchId?: string;
  linkedReportId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'public' | 'owner' | 'admin';
  avatar?: string;
  createdAt: string;
}

export type ReportType = 'found' | 'missing';
export type ViewMode = 'grid' | 'list' | 'map';
