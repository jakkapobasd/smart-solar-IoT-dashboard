const ACTIVE_TEST_KEY = 'activeDiagnosticTest';
const HISTORY_KEY = 'diagnosticTestHistory';
const MAX_HISTORY_ITEMS = 200; // Keep a reasonable number of historical tests

interface TestRecord {
  id: number; // Use timestamp as a unique ID
  deviceEuis: string[];
  level: number;
  duration: number; // in seconds
  description: string;
  type: 'on' | 'off';
  startTime: number;
}

// Helper to get and parse history
const getHistory = (): TestRecord[] => {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return [];
  try {
    const history = JSON.parse(stored);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error("Failed to parse diagnostic test history", e);
    return [];
  }
};

// Helper to save history
const saveHistory = (history: TestRecord[]) => {
  // Prune old entries if history is too long
  if (history.length > MAX_HISTORY_ITEMS) {
    history.sort((a, b) => b.startTime - a.startTime); // Sort descending by time
    history.splice(MAX_HISTORY_ITEMS); // Keep the newest items
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const recordTestStart = (deviceEuis: string[], level: number, duration: number, description: string, type: 'on' | 'off') => {
  const now = Date.now();
  const testData: TestRecord = {
    id: now,
    deviceEuis,
    level,
    duration,
    description,
    type,
    startTime: now,
  };

  // 1. Set the active test for live UI components (maintains original behavior)
  localStorage.setItem(ACTIVE_TEST_KEY, JSON.stringify(testData));

  // 2. Add to the persistent history for graphing
  const history = getHistory();
  // Avoid duplicates if called in quick succession
  if (!history.find(r => r.id === testData.id)) {
    history.push(testData);
    saveHistory(history);
  }
};

export const recordTestStop = (deviceEuis: string[]) => {
  // This function's only job is to clear the LIVE test indicator for the UI.
  // It does NOT remove the entry from the persistent history, fulfilling the user's request.
  localStorage.removeItem(ACTIVE_TEST_KEY);
};

export const getOverriddenBrightnessForSlot = (devEui: string, slotStart: number, slotEnd: number): number | null => {
  const history = getHistory();
  if (history.length === 0) return null;

  // Find the latest test in history that overlaps with the given time slot
  const applicableOverrides = history.filter(record => 
    record.deviceEuis?.includes(devEui) &&
    record.startTime < slotEnd &&
    (record.startTime + record.duration * 1000) > slotStart
  );

  if (applicableOverrides.length === 0) return null;

  // If multiple overrides match, the one that started most recently wins.
  applicableOverrides.sort((a, b) => b.startTime - a.startTime);

  return applicableOverrides[0].level;
};