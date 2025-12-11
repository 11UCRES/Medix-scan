import React from 'react';

export type Language = 'en' | 'bn';

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  purpose: string;
  warnings: string;
  confidence?: 'HIGH' | 'LOW';
  note?: string;
}

export interface ReportFinding {
  parameter: string;
  value: string;
  status: 'Normal' | 'Abnormal' | 'Critical' | 'Unknown';
}

export interface PatientAdvice {
  dietaryAllowed: string[];
  dietaryAvoid: string[];
  lifestyleTips: string[];
}

export interface ExtractionResult {
  type: 'PRESCRIPTION' | 'REPORT' | 'OTHER';
  medicines: Medicine[];
  summary?: string;
  reportFindings?: ReportFinding[];
  patientAdvice?: PatientAdvice;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 string
  timestamp: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export interface MedicineDetails {
  found: boolean;
  name?: string;
  genericName?: string;
  suggestions?: string[]; // If not found, suggest these
  uses?: string[];
  dosageByAge?: {
    child: string;
    adult: string;
    elderly: string;
  };
  sideEffects?: string[];
  advantages?: string[];
  warnings?: string;
}