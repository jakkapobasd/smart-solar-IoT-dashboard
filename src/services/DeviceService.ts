import api from '../lib/api';

export interface CommandPayload {
  data: string;
  fPort: number;
  fCnt?: number;
  expiresAt?: string;
}

export interface BrightnessPayload {
  brightnessLevel: number;
  duration: number; // in minutes
}

const DeviceService = {
  // Group Commands
  setGroupBrightness: async (groupId: string, payload: BrightnessPayload) => {
    const tenantId = localStorage.getItem('tenantId');
    const applicationId = localStorage.getItem('applicationId');
    const requestPayload = {
      brightnessLevel: payload.brightnessLevel,
      duration: payload.duration
    };
    const headers: Record<string, string> = {};
    if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
      headers['tenant_id'] = tenantId;
    }
    if (applicationId && applicationId !== 'null' && applicationId !== 'undefined') {
      headers['application_id'] = applicationId;
    }
    try {
      return await api.post(`/solar-street-lights/bulk-brightness/${groupId}`, requestPayload, {
        headers
      });
    } catch (error: any) {
      if (error.response) console.error('DeviceService setGroupBrightness error:', error.response.status, error.response.data);
      throw error;
    }
  },

  setGroupSchedules: async (groupId: string, schedules: Array<{ brightness: number; duration: number }>) => {
    const tenantId = localStorage.getItem('tenantId');
    const applicationId = localStorage.getItem('applicationId');
    const payload = {
      schedules: schedules.map((s, idx) => ({
        brightnessLevel: s.brightness,
        duration: s.duration,
        slot: idx + 1
      }))
    };
    const headers: Record<string, string> = {};
    if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
      headers['tenant_id'] = tenantId;
    }
    if (applicationId && applicationId !== 'null' && applicationId !== 'undefined') {
      headers['application_id'] = applicationId;
    }
    try {
      return await api.post(`/solar-street-lights/bulk-schedules/${groupId}`, payload, {
        headers
      });
    } catch (error: any) {
      if (error.response) console.error('DeviceService setGroupSchedules error:', error.response.status, error.response.data);
      throw error;
    }
  },

  setGroupMode: async (groupId: string, mode: number) => {
    // Mode is usually sent as a hex byte on fPort 3
    const data = mode.toString(16).padStart(2, '0').toUpperCase();
    const payload: CommandPayload = {
      data,
      fPort: 3,
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 min expiry
    };
    try {
      return await api.post(`/multicast-groups/${groupId}/queue`, { queueItem: payload });
    } catch (error: any) {
      if (error.response) console.error('DeviceService setGroupMode error:', error.response.status, error.response.data);
      throw error;
    }
  },

  // Individual Device Commands (typically via application queue)
  setDeviceBrightness: async (devEui: string, level: number, duration: number = 600) => {
    const tenantId = localStorage.getItem('tenantId');
    const applicationId = localStorage.getItem('applicationId');
    const payload = {
      brightnessLevel: level,
      duration: duration
    };
    try {
      const headers: Record<string, string> = {};
      if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
        headers['tenant_id'] = tenantId;
      }
      if (applicationId && applicationId !== 'null' && applicationId !== 'undefined') {
        headers['application_id'] = applicationId;
      }
      return await api.post(`/solar-street-lights/${devEui}/brightness`, payload, {
        headers
      });
    } catch (error: any) {
      if (error.response) {
        console.error(`DeviceService setDeviceBrightness error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`DeviceService setDeviceBrightness error: ${error.message}`);
      }
      throw error;
    }
  },

  // Group CRUD
  createGroup: async (applicationId: string, group: any) => {
    return api.post('/multicast-groups', { 
      multicastGroup: { 
        ...group, 
        applicationId 
      } 
    });
  },

  updateGroup: async (groupId: string, group: any) => {
    return api.put(`/multicast-groups/${groupId}`, { 
      multicastGroup: group 
    });
  },

  deleteGroup: async (groupId: string) => {
    return api.delete(`/multicast-groups/${groupId}`);
  },

  addDeviceToGroup: async (groupId: string, devEui: string) => {
    return api.post(`/multicast-groups/${groupId}/devices`, { devEui });
  },

  removeDeviceFromGroup: async (groupId: string, devEui: string) => {
    return api.delete(`/multicast-groups/${groupId}/devices/${devEui}`);
  },

  getDeviceProfiles: async (tenantId: string, limit = 100) => {
    return api.get('/device-profiles', {
      params: { tenantId, limit }
    });
  },

  // Device CRUD
  createDevice: async (device: any) => {
    return await api.post('/devices', { device });
  },

  updateDevice: async (devEui: string, device: any) => {
    return api.put(`/devices/${devEui}`, { device });
  },

  deleteDevice: async (devEui: string) => {
    return api.delete(`/devices/${devEui}`);
  },

  getDeviceLatest: async (devEui: string) => {
    return api.get(`/devices/${devEui}/latest`);
  },

  getDeviceLinkMetrics: async (devEui: string, startTs?: string, endTs?: string) => {
    const params: any = { aggregation: 'DAY' };
    if (startTs) params.start = startTs;
    if (endTs) params.end = endTs;
    return api.get(`/devices/${devEui}/link-metrics`, { params });
  },

  getDeviceRecords: async (devEui: string, startTs?: string, endTs?: string) => {
    return api.get(`/devices/${devEui}/records`, {
      params: {
        startTime: startTs,
        endTime: endTs,
        startTs,
        endTs,
        start_ts: startTs,
        end_ts: endTs,
        limit: 200
      }
    });
  }
};

export default DeviceService;
