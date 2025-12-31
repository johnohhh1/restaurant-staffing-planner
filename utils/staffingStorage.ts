export type StaffingState = {
  [key: string]: {
    shifts: Record<string, { lunch: number; dinner: number }>;
    onHand: number;
    totalShifts: number;
    staffingNeeds: number;
    hiringNeeds: number;
  };
};

export type AppState = {
  staffing: StaffingState;
  volume: number;
};

const STAFFING_STORAGE_KEY = 'staffingData';
const APP_STATE_KEY = 'appState';

export const loadStaffingData = (): StaffingState | null => {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STAFFING_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const saveStaffingData = (staffingData: StaffingState) => {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    localStorage.setItem(STAFFING_STORAGE_KEY, JSON.stringify(staffingData));
  }
};

export const loadAppState = (): AppState | null => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(APP_STATE_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const saveAppState = (appState: AppState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
  }
};