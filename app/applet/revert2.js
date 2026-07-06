const fs = require('fs');

let code = fs.readFileSync('src/pages/DeviceDetail.tsx', 'utf8');

const oldTelemetry = `const createTelemetryForDevice = (devEuiStr: string, startStr: string, endStr: string, liveMetrics?: any): TelemetryHistory => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

  const labels: string[] = [];
  const voltage: (number | null)[] = [];
  const soc: (number | null)[] = [];
  const brightness: (number | null)[] = [];
  const temp: (number | null)[] = [];
  const ledCurrent: (number | null)[] = [];
  const panelCurrent: (number | null)[] = [];
  const batteryCurrent: (number | null)[] = [];

  // Compute a seed based on both the devEui and startStr so it is highly specific to this device and date
  const devEuiSeed = (devEuiStr || '0e0b894ac6e1fa28').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const dateSeed = startStr.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rawSeed = devEuiSeed + dateSeed;
  const seedVal = (rawSeed % 100) / 100; // 0.00-0.99

  // Pull direct dynamic live values from cloud/controller
  const liveTemp = liveMetrics?.controllerTemp !== undefined ? Number(liveMetrics.controllerTemp) : 42.0;
  const liveLedCur = liveMetrics?.ledCurrent !== undefined ? Number(liveMetrics.ledCurrent) : 0.0;
  const livePanelCur = liveMetrics?.panelCurrent !== undefined ? Number(liveMetrics.panelCurrent) : 0.0;
  const liveBatteryCur = liveMetrics?.batteryCurrent !== undefined ? Number(liveMetrics.batteryCurrent) : 0.0;

  const todayStr = getTodayStr();
  const isTodaySelected = (startStr === todayStr && endStr === todayStr);

  const liveVoltsVal = liveMetrics?.batteryVoltage !== undefined ? Number(liveMetrics.batteryVoltage) : 25.8;
  const is12V = liveVoltsVal < 18;

  if (diffDays === 1) {
    const nowObj = new Date();
    const currentHour = nowObj.getHours();
    const currentMinute = nowObj.getMinutes();
    const shortDatePrefix = formatThaiDateShort(startStr);

    // Precalculate lastNonNullIndex for today, which represents the current actual time slot
    let lastNonNullIndex = -1;
    const intervalMins = 15;
    const totalSlots = 96;
    for (let i = 0; i < totalSlots; i++) {
      const elapsedMinutesTotal = i * intervalMins;
      const h = Math.floor(elapsedMinutesTotal / 60);
      const m = elapsedMinutesTotal % 60;
      const isFuture = isTodaySelected && (
        h > currentHour || 
        (h === currentHour && m > currentMinute)
      );
      if (!isFuture) {
        lastNonNullIndex = i;
      }
    }

    // Generate intervals up to the current time for today, or 72 for a full past day
    const maxIntervals = isTodaySelected ? (lastNonNullIndex >= 0 ? lastNonNullIndex + 1 : 1) : totalSlots;
    for (let i = 0; i < maxIntervals; i++) {
      const elapsedMinutesTotal = i * intervalMins;
      const h = Math.floor(elapsedMinutesTotal / 60);
      const m = elapsedMinutesTotal % 60;
      const labelStr = \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`;
      labels.push(\`\${shortDatePrefix} \${labelStr}\`);

      const isFuture = isTodaySelected && (
        h > currentHour || 
        (h === currentHour && m > currentMinute)
      );

      if (isFuture) {
        voltage.push(null);
        soc.push(null);
        brightness.push(null);
        temp.push(null);
        ledCurrent.push(null);
        panelCurrent.push(null);
        batteryCurrent.push(null);
        continue;
      }

      // Physics-based base curves matching user's exact uploaded graph
      let baseBrightness = 0;
      const isNight = h >= 18 || h < 6;

      if (isNight) {
        const schedulesList = getSchedulesForDevice(devEuiStr, liveMetrics);
        // Calculate elapsed minutes since Sunset (18:00)
        let elapsedMins = 0;
        if (h >= 18) {
          elapsedMins = (h - 18) * 60 + m;
        } else {
          elapsedMins = (h + 6) * 60 + m;
        }

        let cumulativeMax = 0;
        for (const slot of schedulesList) {
          if (elapsedMins >= cumulativeMax && elapsedMins < cumulativeMax + slot.duration) {
            baseBrightness = slot.brightness;
            break;
          }
          cumulativeMax += slot.duration;
        }
      } else {
        baseBrightness = 0; // Daytime is always off by default
      }

      // Check for any overridden brightness level from historical/active tests in local storage
      const parts = startStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const slotStart = new Date(year, month, day, h, m, 0).getTime();
      const slotEnd = slotStart + intervalMins * 60 * 1000;

      const testOverride = getOverriddenBrightnessForSlot(devEuiStr, slotStart, slotEnd);
      if (testOverride !== null) {
        baseBrightness = testOverride;
      }

      // Apply seed shift to keep individual devices slightly unique but structural
      const seedFactor = seedVal - 0.5; // -0.5 to +0.5

      // 2. LED Current (A) - high when light is dynamically/scheduled ON, proportional to dimming settings
      let baseLedCurrent = 0;
      if (baseBrightness > 0) {
        const peakLedCurrent = 1.75 + (seedFactor * 0.1) + (((i % 3) - 1) * 0.02);
        baseLedCurrent = Number((peakLedCurrent * (baseBrightness / 100)).toFixed(2));
      } else if (testOverride !== null && testOverride > 0) {
        baseLedCurrent = Number((1.75 * (testOverride / 100)).toFixed(2));
      }

      // 3. Panel Current (A) - 0 at night, peaks during midday
      let basePanelCurrent = 0;
      if (h >= 6 && h <= 17) {
        const hProgress = (h - 6 + (m / 60)) / 11; // 0 to 1 over daytime
        const curve = Math.sin(hProgress * Math.PI);
        // Deterministic noise using \`i\`
        const deterministicNoise = (((i * 7) % 11) - 5) * 0.3; 
        basePanelCurrent = Math.max(0, Number(((curve * 4.5) + deterministicNoise + (seedFactor * 0.5)).toFixed(2)));
      }

      // 4. Battery Current (A) - follows panel current closely during day
      let baseBatteryCurrent = 0;
      if (h >= 6 && h <= 17) {
        const deterministicNoise = (((i * 3) % 7) - 3) * 0.4;
        baseBatteryCurrent = Math.max(0, Number((basePanelCurrent + 0.5 + deterministicNoise).toFixed(2)));
      }

      // 5. State of Charge (SOC %)
      // Drops slowly during discharge (18:00 to 05:00) from 100% to ~63%
      // Climbs back during charging (06:00 to 14:00) to 100%
      let baseSoc = 100;
      if (h >= 18 || h <= 5) {
        let hoursSinceSunset = h >= 18 ? (h - 18 + (m / 60)) : (h + 6 + (m / 60));
        baseSoc = Math.max(30, Math.round(100 - hoursSinceSunset * 3.2));
      } else {
        if (h >= 6 && h <= 14) {
          let hoursCharging = (h - 5.68) + (m / 60);
          baseSoc = Math.min(100, Math.round(63 + hoursCharging * 4.4));
        } else {
          baseSoc = 100;
        }
      }

      if (testOverride !== null && testOverride > 0 && h >= 6 && h <= 17) {
        // Daytime override: decrease state of charge slightly based on active LED current load
        baseSoc = Math.max(20, baseSoc - 15);
      }

      baseSoc = Math.max(10, Math.min(100, Math.round(baseSoc + seedFactor * 4)));

      // 6. Battery Voltage (V) - matching ~25.7V to 26.8V
      let baseVolts = 26.2;
      if (h >= 18 || h <= 5) {
        let hoursSinceSunset = h >= 18 ? (h - 18 + (m / 60)) : (h + 6 + (m / 60));
        baseVolts = Number((26.35 - hoursSinceSunset * 0.05 + seedFactor * 0.2).toFixed(2));
      } else {
        if (h >= 6 && h <= 14) {
          let chargeProgress = (h - 5.68) / 8.32;
          baseVolts = Number((25.7 + chargeProgress * 1.1 + seedFactor * 0.2).toFixed(2));
        } else {
          baseVolts = Number((26.8 - (h - 14) * 0.04 + seedFactor * 0.2).toFixed(2));
        }
      }

      if (is12V) {
        baseVolts = Number((baseVolts / 2).toFixed(2));
      }

      if (testOverride !== null && testOverride > 0) {
        // Voltage sag under active LED load (scale sag for 12V)
        baseVolts = Number((baseVolts - (is12V ? 0.22 : 0.45)).toFixed(2));
      }

      // 7. Controller Temp (°C) - drops at night (~28-30), rises during day (~45-50)
      let baseTemp = 30;
      if (h >= 6 && h <= 18) {
        const hProgress = (h - 6 + (m / 60)) / 12; // 0 to 1
        const curve = Math.sin(hProgress * Math.PI);
        baseTemp = 30 + (curve * 18);
      } else if (h > 18) {
        const hProgress = (h - 18 + (m / 60)) / 6; // 0 to 1
        baseTemp = 48 - (hProgress * 15);
      } else {
        const hProgress = (h + (m / 60)) / 6; // 0 to 1
        baseTemp = 33 - (hProgress * 3);
      }
      baseTemp = Number((baseTemp + ((i % 5) - 2) * 0.5 + seedFactor * 2).toFixed(1));

      // 8. Blend / Smoothly interpolate to ending live metrics at index lastNonNullIndex
      let finalVolt = baseVolts;
      let finalSoc = baseSoc;
      let finalBrightness = baseBrightness;
      let finalTemp = baseTemp;
      let finalLedCurrent = baseLedCurrent;
      let finalPanelCurrent = basePanelCurrent;
      let finalBatteryCurrent = baseBatteryCurrent;

      if (isTodaySelected && liveMetrics && lastNonNullIndex >= 0) {
        // Blend dynamically starting 6 points prior up to lastNonNullIndex to keep curves connected and elegant
        const blendStart = Math.max(0, lastNonNullIndex - 6);
        if (i >= blendStart) {
          const factor = (i - blendStart) / (lastNonNullIndex - blendStart || 1);
          
          const liveVolts = liveMetrics.batteryVoltage !== undefined ? liveMetrics.batteryVoltage : baseVolts;
          const liveSoc = liveMetrics.soc !== undefined ? liveMetrics.soc : baseSoc;
          const liveBrightness = liveMetrics.brightnessLevel !== undefined ? liveMetrics.brightnessLevel : baseBrightness;
          const liveTemp = liveMetrics.controllerTemp !== undefined ? liveMetrics.controllerTemp : baseTemp;
          const liveLedCurrent = liveMetrics.ledCurrent !== undefined ? liveMetrics.ledCurrent : baseLedCurrent;
          const livePanelCurrent = liveMetrics.panelCurrent !== undefined ? liveMetrics.panelCurrent : basePanelCurrent;
          const liveBatteryCurrent = liveMetrics.batteryCurrent !== undefined ? liveMetrics.batteryCurrent : baseBatteryCurrent;

          finalVolt = Number(((1 - factor) * baseVolts + factor * liveVolts).toFixed(2));
          finalSoc = Math.max(0, Math.min(100, Math.round((1 - factor) * baseSoc + factor * liveSoc)));
          if (i === lastNonNullIndex) {
            finalBrightness = liveBrightness;
          }
          finalTemp = Number(((1 - factor) * baseTemp + factor * liveTemp).toFixed(1));
          finalLedCurrent = Number(((1 - factor) * baseLedCurrent + factor * liveLedCurrent).toFixed(2));
          finalPanelCurrent = Number(((1 - factor) * basePanelCurrent + factor * livePanelCurrent).toFixed(2));
          finalBatteryCurrent = Number(((1 - factor) * baseBatteryCurrent + factor * liveBatteryCurrent).toFixed(2));
        }
      }

      voltage.push(finalVolt);
      soc.push(finalSoc);
      brightness.push(finalBrightness);
      temp.push(finalTemp);
      ledCurrent.push(finalLedCurrent);
      panelCurrent.push(finalPanelCurrent);
      batteryCurrent.push(finalBatteryCurrent);
    }
  } else {
    const maxPts = Math.min(30, diffDays);
    for (let i = 0; i < maxPts; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + Math.round((i * (diffDays - 1)) / (maxPts - 1 || 1)));
      
      const curYear = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      labels.push(formatThaiDateShort(\`\${curYear}-\${month}-\${day}\`));

      const seedFactor = (currentDate.getDate() % 10) / 10;

      let vVal = Number((25.5 + seedFactor * 0.82 + seedVal * 0.2).toFixed(1));
      if (is12V) {
        vVal = Number((vVal / 2).toFixed(1));
      }
      let sVal = Math.min(100, Math.round(82 + seedFactor * 13 + seedVal * 5));

      // Calculate daily average brightness dynamically based on configured street lamp schedule durations
      const schedulesList = getSchedulesForDevice(devEuiStr, liveMetrics);
      let totalMins = 0;
      let totalWeightedBrightness = 0;
      schedulesList.forEach(slot => {
        totalMins += slot.duration;
        totalWeightedBrightness += slot.brightness * slot.duration;
      });
      const dailyAvgBrightness = totalMins > 0 ? Number((totalWeightedBrightness / 1440).toFixed(1)) : 12.5;
      let bVal = Math.round(dailyAvgBrightness + seedFactor * 3 + seedVal * 2);

      // Mock daily average/peak values
      const tempNoise = (seedFactor * 4) + (((i % 7) - 3) * 1.5);
      let tVal = Number((40 + tempNoise).toFixed(1)); // Daily avg temp ~40

      let ledCurrVal = Number((1.75 + (seedFactor * 0.1)).toFixed(2)); // avg night LED current
      let panelCurrVal = Number((3.5 + (seedFactor * 0.5)).toFixed(2)); // avg day Panel current
      let batteryCurrVal = Number((3.8 + (seedFactor * 0.5)).toFixed(2)); // avg day Battery current

      // If last point corresponds to today, blend with live metrics
      const isPointToday = (currentDate.toDateString() === new Date().toDateString());
      if (isPointToday && liveMetrics) {
        vVal = liveMetrics.batteryVoltage !== undefined ? liveMetrics.batteryVoltage : vVal;
        sVal = liveMetrics.soc !== undefined ? liveMetrics.soc : sVal;
        bVal = liveMetrics.brightnessLevel !== undefined ? liveMetrics.brightnessLevel : bVal;
        tVal = liveMetrics.controllerTemp !== undefined ? liveMetrics.controllerTemp : tVal;
        ledCurrVal = liveMetrics.ledCurrent !== undefined ? liveMetrics.ledCurrent : ledCurrVal;
        panelCurrVal = liveMetrics.panelCurrent !== undefined ? liveMetrics.panelCurrent : panelCurrVal;
        batteryCurrVal = liveMetrics.batteryCurrent !== undefined ? liveMetrics.batteryCurrent : batteryCurrVal;
      }

      voltage.push(vVal);
      soc.push(sVal);
      brightness.push(bVal);
      temp.push(tVal);
      ledCurrent.push(ledCurrVal);
      panelCurrent.push(panelCurrVal);
      batteryCurrent.push(batteryCurrVal);
    }
  }

  return { labels, voltage, soc, brightness, temp, ledCurrent, batteryCurrent, panelCurrent };
};`;

const newTelemetryStr = code.substring(code.indexOf('const createTelemetryForDevice ='), code.indexOf('return { labels, voltage, soc, brightness, temp, ledCurrent, batteryCurrent, panelCurrent };') + 96);
code = code.replace(newTelemetryStr, oldTelemetry);


const oldRecordsBlock = `        const baseTelemetry = createTelemetryForDevice(devEui || "0e0b894ac6e1fa28", startStr, endStr, currentDevice);

        const nextLabels = [...baseTelemetry.labels];
        const nextTemp = [...baseTelemetry.temp];
        const nextBatCurr = [...baseTelemetry.batteryCurrent];
        const nextPanCurr = [...baseTelemetry.panelCurrent];
        const nextLedCurr = [...baseTelemetry.ledCurrent];
        const nextVolts = [...baseTelemetry.voltage];
        const nextSoc = [...baseTelemetry.soc];
        const nextBright = [...baseTelemetry.brightness];

        // Safely extract parameter fields and overlay on top of the matching 40-minute interval indices
        records.forEach(r => {
          const dt = new Date(r.time || r.createdAt || r.timestamp);
          if (isNaN(dt.getTime())) return;
          
          const hours = dt.getHours();
          const minutes = dt.getMinutes();
          // Find closest of the 96 slots (each slot is 15 mins)
          const minutesVal = hours * 60 + minutes;
          const nearest15Mins = Math.round(minutesVal / 15) * 15;
          const slotIdx = Math.min(95, Math.max(0, Math.floor(nearest15Mins / 15)));
          if (slotIdx >= nextLabels.length) return; // Keep overlay within the bounds of today's current time range
          
          const v = getRecordVal(r, ['batteryVoltage', 'battery_voltage', 'voltage', 'battery_voltage_v']);
          if (v !== null && v !== undefined) nextVolts[slotIdx] = Number(v);

          const s = getRecordVal(r, ['soc', 'batterySoc', 'battery_soc', 'batteryLevel', 'battery_level', 'level']);
          if (s !== null && s !== undefined) nextSoc[slotIdx] = Number(s);

          const b = getRecordVal(r, ['brightnessLevel', 'brightness_level', 'brightness', 'brightnessPercent', 'brightness_percent']);
          if (b !== null && b !== undefined) nextBright[slotIdx] = Number(b);

          const t = getRecordVal(r, ['controllerTemperature', 'controllerTemp', 'temperature', 'controller_temperature', 'controller_temp', 'temp', 'temperatureC', 'temperature_c']);
          if (t !== null && t !== undefined) nextTemp[slotIdx] = Number(t);

          const lc = getRecordVal(r, ['ledCurrent', 'led_current', 'ledCurrentA', 'led_current_a', 'led_current_amp']);
          if (lc !== null && lc !== undefined) nextLedCurr[slotIdx] = Number(lc);

          const bc = getRecordVal(r, ['batteryCurrent', 'battery_current', 'batteryCurrentA', 'battery_current_a', 'battery_current_amp']);
          if (bc !== null && bc !== undefined) nextBatCurr[slotIdx] = Number(bc);

          const pc = getRecordVal(r, ['panelCurrent', 'panel_current', 'panelCurrentA', 'panel_current_a', 'panel_current_amp']);
          if (pc !== null && pc !== undefined) nextPanCurr[slotIdx] = Number(pc);
        });

        // Ensure the last-seen / current live values are seamlessly appended/updated to the latest active past index in the list!
        // This makes sure the line graph ends precisely at the latest updated status
        let lastNonNullIdx = -1;
        for (let i = nextLabels.length - 1; i >= 0; i--) {
          if (baseTelemetry.labels[i] && i < nextVolts.length) {
            if (nextVolts[i] !== null || nextSoc[i] !== null || nextTemp[i] !== null) {
              lastNonNullIdx = i;
              break;
            }
          }
        }

        // If we found the latest active past/present point of today, bind it to current live device metrics
        if (lastNonNullIdx !== -1 && currentDevice) {
          if (currentDevice.batteryVoltage !== undefined && currentDevice.batteryVoltage !== null) {
            nextVolts[lastNonNullIdx] = Number(currentDevice.batteryVoltage);
          }
          if (currentDevice.soc !== undefined && currentDevice.soc !== null) {
            nextSoc[lastNonNullIdx] = Number(currentDevice.soc);
          }
          if (currentDevice.brightnessLevel !== undefined && currentDevice.brightnessLevel !== null) {
            nextBright[lastNonNullIdx] = Number(currentDevice.brightnessLevel);
          }
          if (currentDevice.controllerTemp !== undefined && currentDevice.controllerTemp !== null) {
            nextTemp[lastNonNullIdx] = Number(currentDevice.controllerTemp);
          }
          if (currentDevice.ledCurrent !== undefined && currentDevice.ledCurrent !== null) {
            nextLedCurr[lastNonNullIdx] = Number(currentDevice.ledCurrent);
          }
        }`;

const newRecordsStart = '        const baseTelemetry = createTelemetryForDevice(devEui || "0e0b894ac6e1fa28", startStr, endStr, currentDevice);';
const newRecordsEnd = '        if (lastNonNullIdx !== -1 && currentDevice) {\n          if (currentDevice.batteryVoltage !== undefined && currentDevice.batteryVoltage !== null) {\n            nextVolts[lastNonNullIdx] = Number(currentDevice.batteryVoltage);\n          }\n          if (currentDevice.soc !== undefined && currentDevice.soc !== null) {\n            nextSoc[lastNonNullIdx] = Number(currentDevice.soc);\n          }\n          if (currentDevice.brightnessLevel !== undefined && currentDevice.brightnessLevel !== null) {\n            nextBright[lastNonNullIdx] = Number(currentDevice.brightnessLevel);\n          }\n          if (currentDevice.controllerTemp !== undefined && currentDevice.controllerTemp !== null) {\n            nextTemp[lastNonNullIdx] = Number(currentDevice.controllerTemp);\n          }\n          if (currentDevice.ledCurrent !== undefined && currentDevice.ledCurrent !== null) {\n            nextLedCurr[lastNonNullIdx] = Number(currentDevice.ledCurrent);\n          }\n          if (currentDevice.batteryCurrent !== undefined && currentDevice.batteryCurrent !== null) {\n            nextBatCurr[lastNonNullIdx] = Number(currentDevice.batteryCurrent);\n          }\n          if (currentDevice.panelCurrent !== undefined && currentDevice.panelCurrent !== null) {\n            nextPanCurr[lastNonNullIdx] = Number(currentDevice.panelCurrent);\n          }\n        }';
const newRecordsStr = code.substring(code.indexOf(newRecordsStart), code.indexOf(newRecordsEnd) + newRecordsEnd.length);
code = code.replace(newRecordsStr, oldRecordsBlock);

fs.writeFileSync('src/pages/DeviceDetail.tsx', code);
console.log('Reverted script executed!');
