export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';

export interface Application {
  id: string;
  companyName: string;
  role: string;
  dateApplied: string; // ISO date string
  status: ApplicationStatus;
  portalLink?: string;
  notes?: string;
  createdAt: number;
}

export * from './neetcode';
