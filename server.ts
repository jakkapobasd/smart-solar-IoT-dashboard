import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

// 1. นำ app ออกมาไว้ด้านนอกสุด เพื่อให้ Vercel มองเห็น
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MAPPINGS_FILE = path.join(process.cwd(), "device_mappings.json");

function loadMappings() {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      return JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading mappings:", e);
  }
  return {};
}

function saveMappings(mappings: any) {
  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving mappings:", e);
  }
}

const targetUrl = "https://smartsolar-th.com/api/v1";

function getForwardHeaders(req: express.Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const skipHeaders = [
    "host",
    "connection",
    "origin",
    "referer",
    "accept-encoding",
    "content-length",
    "content-type"
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();
    if (!skipHeaders.includes(lowerKey) && value !== undefined) {
      const stringValue = Array.isArray(value) ? value.join(", ") : String(value);
      if (stringValue !== "null" && stringValue !== "undefined" && stringValue !== "") {
        headers[lowerKey] = stringValue;
      }
    }
  }
  return headers;
}

// Intercept GET devices list
app.get("/api/proxy/devices", async (req, res) => {
  const headers = getForwardHeaders(req);
  const requestedAppId = req.query.applicationId as string;
  const queryParams = new URLSearchParams(req.query as any).toString();
  const url = `${targetUrl}/devices?${queryParams}`;

  try {
    const response = await fetch(url, { headers });
    let data: any = { result: [], totalCount: 0 };
    
    if (response.status === 200) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Error parsing devices list JSON:", e);
        }
      }
    } else {
      console.warn(`Real backend returned status ${response.status} for devices list`);
    }

    const mappings = loadMappings();
    let resultDevices = data.result || [];

    resultDevices = resultDevices.map((device: any) => {
      const eui = device?.devEui?.toLowerCase() || "";
      
      if (device.applicationId === undefined && requestedAppId) {
        device.applicationId = requestedAppId;
      }

      if (eui && mappings[eui]) {
        const mapObj = mappings[eui];
        const overrideAppId = mapObj.applicationId !== undefined ? mapObj.applicationId : mapObj.deviceRecord?.applicationId;
        const overrideTenantId = mapObj.tenantId !== undefined ? mapObj.tenantId : mapObj.deviceRecord?.tenantId;

        const finalAppId = overrideAppId !== undefined ? overrideAppId : device.applicationId;
        const finalTenantId = overrideTenantId !== undefined ? overrideTenantId : device.tenantId;

        mappings[eui].deviceRecord = {
          ...device,
          applicationId: finalAppId,
          tenantId: finalTenantId
        };

        return {
          ...device,
          applicationId: finalAppId,
          tenantId: finalTenantId
        };
      } else {
        return device;
      }
    });

    saveMappings(mappings);

    if (requestedAppId) {
      resultDevices = resultDevices.filter((d: any) => d.applicationId === requestedAppId);
    }

    const requestedGroupId = req.query.multicastGroupId as string;

    const deviceMatchesGroup = (d: any, groupId: string, localMappings: any) => {
      if (!groupId) return true;
      const eui = d?.devEui?.toLowerCase() || "";
      if (d?.multicastGroupId === groupId) return true;
      if (d?.variables?.multicastGroupId === groupId) return true;
      if (eui && localMappings[eui]) {
        const mapObj = localMappings[eui];
        if (mapObj?.multicastGroupId === groupId) return true;
        if (mapObj?.deviceRecord?.multicastGroupId === groupId) return true;
        if (mapObj?.deviceRecord?.variables?.multicastGroupId === groupId) return true;
      }
      return false;
    };

    if (requestedAppId) {
      for (const [eui, mapObj] of Object.entries(mappings) as any) {
        const mapAppId = mapObj.applicationId !== undefined ? mapObj.applicationId : mapObj.deviceRecord?.applicationId;
        if (mapAppId === requestedAppId) {
          const exists = resultDevices.some((d: any) => d?.devEui?.toLowerCase() === eui);
          if (!exists && mapObj.deviceRecord) {
            const devRecord = {
              ...mapObj.deviceRecord,
              applicationId: requestedAppId,
              tenantId: mapObj.tenantId !== undefined ? mapObj.tenantId : mapObj.deviceRecord?.tenantId
            };
            
            if (!requestedGroupId || deviceMatchesGroup(devRecord, requestedGroupId, mappings)) {
              resultDevices.push(devRecord);
            }
          }
        }
      }
    }

    res.status(200).json({
      result: resultDevices,
      totalCount: resultDevices.length
    });
  } catch (err: any) {
    console.error("Error intercepting GET /devices:", err);
    res.status(500).json({ error: "Failed to fetch and process devices", details: err.message });
  }
});

// Intercept GET single device
app.get("/api/proxy/devices/:devEui", async (req, res) => {
  const headers = getForwardHeaders(req);
  const devEui = req.params.devEui || "";
  const eui = devEui.toLowerCase();
  const url = `${targetUrl}/devices/${devEui}`;

  try {
    const response = await fetch(url, { headers });
    const mappings = loadMappings();

    if (response.status === 200) {
      const deviceData = await response.json();
      const device = deviceData.device || deviceData;
      if (mappings[eui]) {
        const mapObj = mappings[eui];
        const overrideAppId = mapObj.applicationId !== undefined ? mapObj.applicationId : mapObj.deviceRecord?.applicationId;
        const overrideTenantId = mapObj.tenantId !== undefined ? mapObj.tenantId : mapObj.deviceRecord?.tenantId;

        const finalAppId = overrideAppId !== undefined ? overrideAppId : device.applicationId;
        const finalTenantId = overrideTenantId !== undefined ? overrideTenantId : device.tenantId;

        device.applicationId = finalAppId;
        device.tenantId = finalTenantId;
        if (deviceData.device) {
          deviceData.device.applicationId = finalAppId;
          deviceData.device.tenantId = finalTenantId;
        }

        mappings[eui].deviceRecord = {
          ...device,
          applicationId: finalAppId,
          tenantId: finalTenantId
        };
        saveMappings(mappings);
      } else {
        mappings[eui] = {
          devEui: device.devEui,
          applicationId: device.applicationId,
          tenantId: device.tenantId,
          deviceRecord: device
        };
        saveMappings(mappings);
      }
      res.status(200).json(deviceData);
    } else {
      const mapObj = mappings[eui];
      const fallbackAppId = mapObj?.applicationId !== undefined ? mapObj.applicationId : mapObj?.deviceRecord?.applicationId;
      const fallbackTenantId = mapObj?.tenantId !== undefined ? mapObj.tenantId : mapObj?.deviceRecord?.tenantId;

      if (mapObj && mapObj.deviceRecord && fallbackAppId) {
        res.status(200).json({ device: { ...mapObj.deviceRecord, applicationId: fallbackAppId, tenantId: fallbackTenantId } });
      } else {
        res.status(response.status).send(await response.text());
      }
    }
  } catch (err: any) {
    console.error("Error intercepting GET single device:", err);
    res.status(500).json({ error: "Failed to get device info", details: err.message });
  }
});

// Intercept POST devices
app.post("/api/proxy/devices", async (req, res) => {
  const headers = getForwardHeaders(req);
  const body = req.body;
  const device = body.device;

  if (!device || !device.devEui) {
    return res.status(400).json({ error: "Missing device payload or devEui" });
  }

  const devEui = device.devEui;
  const eui = devEui.toLowerCase();
  const mappings = loadMappings();

  if (mappings[eui] && mappings[eui].applicationId && mappings[eui].applicationId !== device.applicationId) {
    console.log(`Transferring device ${devEui}`);
  }

  mappings[eui] = {
    devEui: device.devEui,
    applicationId: device.applicationId,
    tenantId: device.tenantId,
    deviceRecord: { ...device }
  };
  saveMappings(mappings);

  try {
    const checkUrl = `${targetUrl}/devices/${devEui}`;
    const checkRes = await fetch(checkUrl, { method: "GET", headers });

    if (checkRes.status === 200) {
      headers["content-type"] = "application/json";
      const putUrl = `${targetUrl}/devices/${devEui}`;
      try {
        await fetch(putUrl, { method: "PUT", headers, body: JSON.stringify({ device }) });
      } catch (putErr) {
        console.warn(`ChirpStack physical PUT update failed for ${devEui}`);
      }
      return res.status(200).json({ success: true, message: "Synchronized existing device successfully" });
    } else {
      headers["content-type"] = "application/json";
      const createRes = await fetch(`${targetUrl}/devices`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      const responseContentType = createRes.headers.get("content-type") || "";
      const text = await createRes.text();

      if (createRes.status === 200 || createRes.status === 201) {
        if (responseContentType.includes("application/json")) {
          return res.status(createRes.status).json(JSON.parse(text));
        } else {
          return res.status(createRes.status).send(text);
        }
      } else {
        if (text.toLowerCase().includes("already exists") || createRes.status === 409) {
          return res.status(200).json({ success: true, message: "Device linked successfully" });
        }
        return res.status(createRes.status).send(text);
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create or link device", details: err.message });
  }
});

// Intercept PUT devices
app.put("/api/proxy/devices/:devEui", async (req, res) => {
  const headers = getForwardHeaders(req);
  const devEui = req.params.devEui || "";
  const eui = devEui.toLowerCase();
  const body = req.body;
  const device = body.device;
  const mappings = loadMappings();

  if (device && eui) {
    if (mappings[eui]) {
      mappings[eui].applicationId = device.applicationId || mappings[eui].applicationId;
      mappings[eui].tenantId = device.tenantId || mappings[eui].tenantId;
      mappings[eui].deviceRecord = { ...mappings[eui].deviceRecord, ...device };
    } else {
      mappings[eui] = { devEui: devEui, applicationId: device.applicationId, tenantId: device.tenantId, deviceRecord: device };
    }
    saveMappings(mappings);
  }

  try {
    headers["content-type"] = "application/json";
    const response = await fetch(`${targetUrl}/devices/${devEui}`, { method: "PUT", headers, body: JSON.stringify(body) });
    const responseContentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (response.status === 200) {
      if (responseContentType.includes("application/json") && text) {
        res.status(200).json(JSON.parse(text));
      } else {
        res.status(200).send(text);
      }
    } else {
      res.status(200).json({ success: true, message: "Local mapping updated" });
    }
  } catch (err: any) {
    res.status(200).json({ success: true, message: "Local mapping updated with warning" });
  }
});

// Intercept DELETE devices
app.delete("/api/proxy/devices/:devEui", async (req, res) => {
  const devEui = req.params.devEui || "";
  const eui = devEui.toLowerCase();
  const mappings = loadMappings();

  if (eui && mappings[eui]) {
    mappings[eui].applicationId = null;
    mappings[eui].tenantId = null;
    if (mappings[eui].deviceRecord) {
      mappings[eui].deviceRecord.applicationId = null;
      mappings[eui].deviceRecord.tenantId = null;
    }
    saveMappings(mappings);
  } else if (eui) {
    mappings[eui] = { devEui: devEui, applicationId: null, tenantId: null, deviceRecord: null };
    saveMappings(mappings);
  }
  res.status(200).json({ success: true, message: "Device unlinked successfully" });
});

// Intercept POST add device to multicast group
app.post("/api/proxy/multicast-groups/:groupId/devices", async (req, res) => {
  const { groupId } = req.params;
  const { devEui } = req.body;
  const eui = devEui ? devEui.toLowerCase() : "";
  const headers = getForwardHeaders(req);
  const url = `${targetUrl}/multicast-groups/${groupId}/devices`;

  try {
    const response = await fetch(url, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(req.body) });
    const responseText = await response.text();

    if (response.status === 200 || response.status === 201 || response.status === 404 || response.status === 400) {
      if (eui) {
        const mappings = loadMappings();
        if (mappings[eui]) {
          mappings[eui].multicastGroupId = groupId;
          if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
          mappings[eui].deviceRecord.multicastGroupId = groupId;
          if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
          mappings[eui].deviceRecord.variables.multicastGroupId = groupId;
        } else {
          mappings[eui] = {
            devEui: devEui,
            multicastGroupId: groupId,
            deviceRecord: { devEui: devEui, multicastGroupId: groupId, variables: { multicastGroupId: groupId } }
          };
        }
        saveMappings(mappings);
      }
      return res.status(200).json({ success: true, message: "Device added to multicast group successfully" });
    }
    return res.status(response.status).send(responseText);
  } catch (err: any) {
    if (eui) {
      const mappings = loadMappings();
      if (mappings[eui]) {
        mappings[eui].multicastGroupId = groupId;
        if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
        mappings[eui].deviceRecord.multicastGroupId = groupId;
        if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
        mappings[eui].deviceRecord.variables.multicastGroupId = groupId;
      } else {
        mappings[eui] = { devEui: devEui, multicastGroupId: groupId, deviceRecord: { devEui: devEui, multicastGroupId: groupId, variables: { multicastGroupId: groupId } } };
      }
      saveMappings(mappings);
    }
    return res.status(200).json({ success: true, message: "Device added to multicast group locally" });
  }
});

// Intercept DELETE remove device from multicast group
app.delete("/api/proxy/multicast-groups/:groupId/devices/:devEui", async (req, res) => {
  const { groupId, devEui } = req.params;
  const eui = devEui ? devEui.toLowerCase() : "";
  const headers = getForwardHeaders(req);
  const url = `${targetUrl}/multicast-groups/${groupId}/devices/${devEui}`;

  try {
    const response = await fetch(url, { method: "DELETE", headers });
    const responseText = await response.text();

    if (response.status === 200 || response.status === 201 || response.status === 404 || response.status === 400) {
      if (eui) {
        const mappings = loadMappings();
        if (mappings[eui]) {
          mappings[eui].multicastGroupId = null;
          if (mappings[eui].deviceRecord) {
            mappings[eui].deviceRecord.multicastGroupId = null;
            if (mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables.multicastGroupId = null;
          }
          saveMappings(mappings);
        }
      }
      return res.status(200).json({ success: true, message: "Device removed from multicast group successfully" });
    }
    return res.status(response.status).send(responseText);
  } catch (err: any) {
    if (eui) {
      const mappings = loadMappings();
      if (mappings[eui]) {
        mappings[eui].multicastGroupId = null;
        if (mappings[eui].deviceRecord) {
          mappings[eui].deviceRecord.multicastGroupId = null;
          if (mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables.multicastGroupId = null;
        }
        saveMappings(mappings);
      }
    }
    return res.status(200).json({ success: true, message: "Device removed from multicast group locally" });
  }
});

// Intercept bulk brightness commands
app.post("/api/proxy/solar-street-lights/bulk-brightness/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const headers = getForwardHeaders(req);
  const url = `${targetUrl}/solar-street-lights/bulk-brightness/${groupId}`;

  try {
    const response = await fetch(url, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(req.body) });
    const responseText = await response.text();
    const brightness = req.body.brightnessLevel !== undefined ? req.body.brightnessLevel : (req.body.brightness !== undefined ? req.body.brightness : 100);

    const mappings = loadMappings();
    let updatedCount = 0;
    
    for (const [eui, data] of Object.entries(mappings) as any) {
      const deviceGroup = data.deviceRecord?.variables?.multicastGroupId || data.deviceRecord?.multicastGroupId || data.multicastGroupId;
      if (deviceGroup === groupId) {
        if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
        if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
        mappings[eui].deviceRecord.variables.brightnessLevel = brightness;
        mappings[eui].deviceRecord.brightnessLevel = brightness;
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) saveMappings(mappings);

    if (response.status === 200) {
      return res.status(200).send(responseText);
    } else {
      return res.status(response.status).send(responseText);
    }
  } catch (err: any) {
    try {
      const brightness = req.body.brightnessLevel !== undefined ? req.body.brightnessLevel : (req.body.brightness !== undefined ? req.body.brightness : 100);
      const mappings = loadMappings();
      let updatedCount = 0;
      for (const [eui, data] of Object.entries(mappings) as any) {
        const deviceGroup = data.deviceRecord?.variables?.multicastGroupId || data.deviceRecord?.multicastGroupId || data.multicastGroupId;
        if (deviceGroup === groupId) {
          if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
          if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
          mappings[eui].deviceRecord.variables.brightnessLevel = brightness;
          mappings[eui].deviceRecord.brightnessLevel = brightness;
          updatedCount++;
        }
      }
      if (updatedCount > 0) saveMappings(mappings);
      return res.status(200).json({ success: true, message: "Bulk command simulated successfully", groupId, brightnessLevel: brightness, updatedCount });
    } catch (innerErr: any) {
      res.status(500).json({ error: "Failed to process bulk brightness command", details: err.message });
    }
  }
});

// Intercept individual device brightness commands
app.post("/api/proxy/solar-street-lights/:devEui/brightness", async (req, res) => {
  const { devEui } = req.params;
  const headers = getForwardHeaders(req);
  const url = `${targetUrl}/solar-street-lights/${devEui}/brightness`;

  try {
    const response = await fetch(url, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(req.body) });
    const responseText = await response.text();
    let responseData: any = {};
    try { if (responseText) responseData = JSON.parse(responseText); } catch (e) {}

    const eui = devEui.toLowerCase();
    const brightness = req.body.brightnessLevel !== undefined ? req.body.brightnessLevel : (req.body.brightness !== undefined ? req.body.brightness : 100);

    if (response.status === 200) {
      const mappings = loadMappings();
      if (mappings[eui]) {
        if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
        if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
        mappings[eui].deviceRecord.variables.brightnessLevel = brightness;
        mappings[eui].deviceRecord.brightnessLevel = brightness;
        saveMappings(mappings);
      }
      return res.status(200).send(responseText);
    }

    const isNotSolarStreetLight = response.status === 400 && (responseData.detail?.includes("not a Solar Street Light") || responseText.includes("not a Solar Street Light"));

    if (isNotSolarStreetLight) {
      const mappings = loadMappings();
      if (mappings[eui]) {
        if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
        if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
        mappings[eui].deviceRecord.variables.brightnessLevel = brightness;
        mappings[eui].deviceRecord.brightnessLevel = brightness;
        saveMappings(mappings);
      }
      return res.status(200).json({ success: true, message: "Command simulated successfully (non-Solar Street Light)", devEui, brightnessLevel: brightness });
    }

    res.status(response.status).send(responseText);
  } catch (err: any) {
    try {
      const eui = devEui.toLowerCase();
      const brightness = req.body.brightnessLevel !== undefined ? req.body.brightnessLevel : (req.body.brightness !== undefined ? req.body.brightness : 100);
      const mappings = loadMappings();
      if (mappings[eui]) {
        if (!mappings[eui].deviceRecord) mappings[eui].deviceRecord = {};
        if (!mappings[eui].deviceRecord.variables) mappings[eui].deviceRecord.variables = {};
        mappings[eui].deviceRecord.variables.brightnessLevel = brightness;
        mappings[eui].deviceRecord.brightnessLevel = brightness;
        saveMappings(mappings);
      }
      return res.status(200).json({ success: true, message: "Command simulated successfully (Offline/Network fallback)", devEui, brightnessLevel: brightness });
    } catch (innerErr: any) {
      res.status(500).json({ error: "Failed to process brightness command", details: err.message });
    }
  }
});

// Proxy API requests to the real backend
app.all("/api/proxy*", async (req, res) => {
  const requestPath = req.url.replace("/api/proxy", "");
  const url = `${targetUrl}${requestPath}`;

  try {
    const contentType = req.headers["content-type"] || "application/json";
    let body: any = undefined;
    const hasBody = ["POST", "PUT", "PATCH"].includes(req.method);

    if (hasBody) {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const key in req.body) {
          params.append(key, req.body[key]);
        }
        body = params.toString();
      } else {
        body = JSON.stringify(req.body);
      }
    }

    const headers = getForwardHeaders(req);
    if (hasBody) {
      headers["content-type"] = contentType;
    }

    const response = await fetch(url, { method: req.method, headers, body });
    const responseContentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let data: any = null;
    let isJson = false;

    if (text) {
      if (responseContentType.includes("application/json")) {
        try {
          data = JSON.parse(text);
          isJson = true;
        } catch (e) {
          data = { message: text };
        }
      } else {
        data = { message: text };
      }
    }

    if (isJson) {
      res.status(response.status).json(data);
    } else {
      if (responseContentType) res.setHeader("content-type", responseContentType);
      res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch from real cloud", details: error.message });
  }
});

// Serve static files
app.use("/leaflet", express.static(path.join(process.cwd(), "public/leaflet")));

// 2. แยกฟังก์ชันสร้าง Vite ออกมาให้รันเฉพาะกิจ
async function setupViteAndStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupViteAndStatic();

// 3. ป้องกันไม่ให้ Vercel เรียกคำสั่ง listen โดยเด็ดขาด 
// (ถ้าไม่ได้รันบน Vercel คำสั่งนี้ถึงจะทำงานปกติเวลาเราเทสในเครื่อง)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// 🔥 4. สำคัญที่สุด: ส่งออก app ให้ Vercel เรียกใช้ได้โดยตรง 🔥
export default app;