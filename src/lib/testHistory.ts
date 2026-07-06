export interface TestHistoryEntry {
  id: string;
  deviceEuis: string[];
  startTime: number;
  endTime: number;
  level: number;
  label: string;
  type?: 'on' | 'off';
}

export const getSavedTests = (): TestHistoryEntry[] => {
  try {
    const stored = localStorage.getItem('solar_brightness_test_history');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to read solar_brightness_test_history", e);
    return [];
  }
};

export const saveTests = (tests: TestHistoryEntry[]) => {
  try {
    localStorage.setItem('solar_brightness_test_history', JSON.stringify(tests));
  } catch (e) {
    console.error("Failed to save solar_brightness_test_history", e);
  }
};

export const recordTestStart = (
  deviceEuis: string[],
  level: number,
  durationSeconds: number,
  label: string = 'Manual Override',
  type?: 'on' | 'off'
) => {
  const tests = getSavedTests();
  const startTime = Date.now();
  // Safe bounds: if duration is 0 or manual, default to 1 hour (3600 seconds) which can be stopped early
  const durationMs = (durationSeconds > 0 ? durationSeconds : 3600) * 1000;
  const endTime = startTime + durationMs;

  const newEntry: TestHistoryEntry = {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    deviceEuis,
    startTime,
    endTime,
    level,
    label,
    type
  };

  tests.push(newEntry);
  saveTests(tests);
  return newEntry;
};

export const recordTestStop = (deviceEuis: string[]) => {
  const tests = getSavedTests();
  const now = Date.now();
  let updated = false;

  const newTests = tests.map(t => {
    // Check if there is any overlap in device EUIs and the test is still theoretically active or recently generated
    const hasOverlap = t.deviceEuis.some(eui => deviceEuis.includes(eui));
    if (hasOverlap && t.endTime > now && t.startTime <= now) {
      updated = true;
      return {
        ...t,
        endTime: now // Cap the test at current time
      };
    }
    return t;
  });

  if (updated) {
    saveTests(newTests);
  }
};

export const getOverriddenBrightnessForSlot = (
  devEui: string,
  slotStartTime: number,
  slotEndTime: number
): number | null => {
  const tests = getSavedTests();

  // Filter overlapping entries
  const overlapping = tests.filter(t => {
    const isTargetDevice = t.deviceEuis.includes(devEui) || t.deviceEuis.includes('all');
    if (!isTargetDevice) return false;

    // Check of overlapping interval
    return t.startTime < slotEndTime && t.endTime > slotStartTime;
  });

  if (overlapping.length > 0) {
    // Return the level of the most recent overlapping entry
    const sorted = [...overlapping].sort((a, b) => b.startTime - a.startTime);
    return sorted[0].level;
  }

  return null;
};
