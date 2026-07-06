import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export interface AlertItem {
  id: string;
  devEui: string;
  deviceName: string;
  type: 'battery' | 'light_off' | 'offline' | 'system';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  details: string;
}

interface AlertsContextType {
  alerts: AlertItem[];
  unreadCount: number;
  loading: boolean;
  isAlertsModalOpen: boolean;
  setAlertsModalOpen: (open: boolean) => void;
  fetchAndAnalyzeAlerts: () => Promise<void>;
  markAllAsRead: () => void;
}

const AlertsContext = createContext<AlertsContextType | null>(null);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAlertsModalOpen, setAlertsModalOpen] = useState(false);

  const fetchAndAnalyzeAlerts = useCallback(async () => {
    if (!user?.tenantId || !user?.applicationId) return;
    setLoading(true);

    try {
      const res = await api.get('/devices', {
        params: { applicationId: user.applicationId, limit: 100 }
      });
      const deviceList = res.data?.result || [];
      const analyzedAlerts: AlertItem[] = [];

      // Check time logic (Night hour check between 18:00 and 06:00 local time)
      const currentHour = new Date().getHours();
      const isNightByHour = currentHour >= 18 || currentHour < 6;

      deviceList.forEach((dev: any) => {
        const isOnline = dev.lastSeenAt && (Date.now() - new Date(dev.lastSeenAt).getTime()) / 3600000 <= 1;
        const name = dev.name || 'Unknown Device';
        const eui = dev.devEui;
        const variables = dev.variables || {};

        // 1. Off-line alert
        if (!isOnline) {
          analyzedAlerts.push({
            id: `offline-${eui}`,
            devEui: eui,
            deviceName: name,
            type: 'offline',
            severity: 'high',
            message: `Device Offline: ${name}`,
            timestamp: dev.lastSeenAt || new Date().toISOString(),
            details: `Device has lost connection. Last seen: ${dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString() : 'Never'}`
          });
        } else {
          // ONLINE alerts only
          const soc = variables.batterySoc ?? variables.batteryLevel ?? variables.soc;
          const batteryVoltage = variables.batteryVoltage;
          const brightness = variables.brightnessLevel ?? variables.brightness ?? 0;
          const panelVoltage = variables.panelVoltage ?? 0;

          // 2. Battery Low alert
          if (soc !== undefined && soc <= 20) {
            analyzedAlerts.push({
              id: `battery-soc-${eui}`,
              devEui: eui,
              deviceName: name,
              type: 'battery',
              severity: 'high',
              message: `Low Battery (SOC ${soc}%)`,
              timestamp: new Date().toISOString(),
              details: `Battery capacity is critical at ${soc}%. Charging via Solar Panel is recommended.`
            });
          } else if (batteryVoltage !== undefined && batteryVoltage < 12.0) {
            analyzedAlerts.push({
              id: `battery-volt-${eui}`,
              devEui: eui,
              deviceName: name,
              type: 'battery',
              severity: 'medium',
              message: `Low Voltage (${batteryVoltage.toFixed(1)}V)`,
              timestamp: new Date().toISOString(),
              details: `Battery voltage is low at ${batteryVoltage.toFixed(1)}V, currently requiring solar charging.`
            });
          }

          // 3. Nighttime anomaly: lamp is not turned on (OFF / brightness = 0)
          // Heuristic Night: Either night by local hours, OR solar panel voltage is extremely low (< 5.0 V) which confirms dark conditions
          const confirmDarkness = panelVoltage < 5.0 || isNightByHour;
          
          if (confirmDarkness && brightness === 0) {
            analyzedAlerts.push({
              id: `night-off-${eui}`,
              devEui: eui,
              deviceName: name,
              type: 'light_off',
              severity: 'high',
              message: `Day-Night Anomaly: Lamp is OFF`,
              timestamp: new Date().toISOString(),
              details: `It is currently dark/nighttime (Solar Panel Voltage: ${panelVoltage.toFixed(1)}V), but LED brightness is 0%. Please verify light control configuration.`
            });
          }
        }
      });

      // Let's sort alerts: high severity first, then offline / backup
      analyzedAlerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setAlerts(analyzedAlerts);
      setUnreadCount(analyzedAlerts.length);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        console.warn("Alerts analysis unauthorized (401). Session likely expired.");
      } else {
        console.error("Alerts analysis failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    if (user?.tenantId && user?.applicationId) {
      fetchAndAnalyzeAlerts();
      const interval = setInterval(fetchAndAnalyzeAlerts, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [user, fetchAndAnalyzeAlerts]);

  return (
    <AlertsContext.Provider value={{
      alerts,
      unreadCount,
      loading,
      isAlertsModalOpen,
      setAlertsModalOpen,
      fetchAndAnalyzeAlerts,
      markAllAsRead
    }}>
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) throw new Error('useAlerts must be used within an AlertsProvider');
  return context;
};
