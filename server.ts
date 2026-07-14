import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dotenv from "dotenv";

// โหลด .env.local ก่อนอื่น
dotenv.config({ path: ".env.local" });
console.log("📋 Environment variables loaded from .env.local");
console.log(`📄 FIREBASE_CREDENTIALS_PATH: ${process.env.FIREBASE_CREDENTIALS_PATH}`);
console.log(`📄 FIREBASE_DATABASE_URL: ${process.env.FIREBASE_DATABASE_URL}`);

// ✅ Lazy load firebase-admin using dynamic import to avoid ESM issues
let admin: any = null;
let adminLoaded = false;

async function loadFirebaseAdmin() {
  if (adminLoaded) return admin;
  try {
    admin = await import("firebase-admin");
    adminLoaded = true;
    console.log("✅ Firebase Admin SDK loaded successfully");
    return admin;
  } catch (err: any) {
    console.error("❌ Failed to load Firebase Admin SDK:", err.message);
    adminLoaded = true;
    return null;
  }
}

// Load immediately but don't wait
loadFirebaseAdmin().catch(console.error);

// 1. นำ app ออกมาไว้ด้านนอกสุด เพื่อให้ Vercel มองเห็น
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐ ตั้งค่า Linux persistent path สำหรับ device_mappings.json
const getMappingsPath = (): string => {
  // 1. ลองใช้ environment variable ก่อน
  if (process.env.MAPPINGS_DIR) {
    return process.env.MAPPINGS_DIR;
  }
  
  // 2. ถ้ารัน Linux → ใช้ /var/lib/solar-iot-dashboard (path ถาวร)
  if (process.platform === 'linux') {
    return '/var/lib/solar-iot-dashboard';
  }
  
  // 3. fallback สำหรับ Windows/Mac ใช้ project directory + data folder
  return path.join(process.cwd(), 'data');
};

const MAPPINGS_DIR = getMappingsPath();
const MAPPINGS_FILE = path.join(MAPPINGS_DIR, 'device_mappings.json');

// สร้าง directory ถ้ายังไม่มี
function ensureMappingsDirectory() {
  try {
    if (!fs.existsSync(MAPPINGS_DIR)) {
      fs.mkdirSync(MAPPINGS_DIR, { recursive: true });
      console.log(`✅ Created mappings directory: ${MAPPINGS_DIR}`);
    } else {
      console.log(`✅ Mappings directory exists: ${MAPPINGS_DIR}`);
    }
  } catch (e) {
    console.error(`❌ Failed to create/verify mappings directory: ${e}`);
    process.exit(1);
  }
}

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

// 💾 บันทึกลง local file
function saveMappings(mappings: any) {
  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving mappings:", e);
  }
}

// ✨ Firebase Admin SDK Initialization
let firebaseInitialized = false;
let firebaseDB: any = null;

async function initializeFirebase() {
  try {
    // รอให้ firebase-admin load เสร็จก่อน
    const loadedAdmin = await loadFirebaseAdmin();
    if (!loadedAdmin || !loadedAdmin.credential || !loadedAdmin.initializeApp) {
      console.warn("⚠️ Firebase Admin SDK not available, skipping initialization");
      return;
    }

    // ตรวจสอบว่ามี credentials file อยู่
    const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH || './firebase-serviceAccountKey.json';
    
    if (!fs.existsSync(credentialsPath)) {
      console.warn(`⚠️ Firebase credentials not found at: ${credentialsPath}`);
      console.warn("ℹ️ Device mappings will NOT be synced to Firebase. Get credentials from Firebase Console.");
      return;
    }

    // อ่าน service account credentials
    let serviceAccount;
    try {
      const fileContent = fs.readFileSync(credentialsPath, 'utf-8');
      serviceAccount = JSON.parse(fileContent);
    } catch (parseError: any) {
      console.error(`❌ Failed to parse Firebase credentials JSON: ${parseError.message}`);
      console.error(`📄 Check file at: ${credentialsPath}`);
      firebaseInitialized = false;
      return;
    }

    // ตรวจสอบว่า credentials มี required fields ครบหรือไม่
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id', 'token_uri'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Firebase credentials missing required fields: ${missingFields.join(', ')}`);
      console.error(`📄 Valid Service Account Key should have: ${requiredFields.join(', ')}`);
      console.error("💡 Get fresh credentials from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key");
      firebaseInitialized = false;
      return;
    }
    
    // Initialize Firebase Admin
    loadedAdmin.initializeApp({
      credential: loadedAdmin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
    });

    firebaseDB = loadedAdmin.database();
    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK initialized successfully!");
  } catch (error: any) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
    firebaseInitialized = false;
  }
}

// 🔄 Sync mappings ลง Firebase Realtime Database
async function syncToFirebase(mappings: any) {
  // 1. บันทึกลง local file ก่อน (ที่สำคัญที่สุด)
  saveMappings(mappings);

  // 2. ถ้าไม่ได้ initialize Firebase ให้ข้ามไป
  if (!firebaseInitialized || !firebaseDB) {
    return;
  }

  try {
    // 3. Push ไปยัง Firebase ด้วย
    const mappingsRef = firebaseDB.ref('device-mappings');
    await mappingsRef.set(mappings);
    console.log("✅ Device mappings synced to Firebase");
  } catch (error: any) {
    console.error("⚠️ Failed to sync mappings to Firebase:", error.message);
    // ✅ ไม่ throw error เพราะ local file save ถึงแล้ว ยังสามารถใช้งานได้
  }
}

// ⚡ Fire-and-forget wrapper - ไม่ต้อง await
function syncMappingsAsync(mappings: any) {
  // เรียก async function แต่ไม่ต้อง await
  syncToFirebase(mappings).catch(err => {
    console.error("Background sync error:", err);
  });
}

const targetUrl = "https://smartsolar-th.com/api/v1";

// 🔧 เรียก function เพื่อให้แน่ใจว่า directory มีอยู่ก่อนใช้งาน
ensureMappingsDirectory();

// ✨ Initialize Firebase Admin (ไม่ต้อง await เพราะเป็น fire-and-forget)
initializeFirebase().catch(err => {
  console.error("Firebase initialization error:", err);
});

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

// =================================================================
// ✨ EXAMPLE: Specific API Interceptor
// =================================================================
// This handler will specifically intercept GET requests to '/api/proxy/applications/summary'.
// It MUST be placed BEFORE the generic app.all('/api/proxy*', ...) handler.
app.get("/api/proxy/applications/summary", async (req, res) => {
  console.log("✅ Intercepting GET /api/proxy/applications/summary");

  // Here you can add custom logic. For example, you could:
  // 1. Fetch data from the real backend.
  // 2. Modify the data.
  // 3. Or return a completely custom response.

  // For this example, we'll just return a custom JSON response.
  res.status(200).json({
    message: "This is a custom response from the interceptor!",
    interceptedPath: req.path,
    originalQuery: req.query,
  });
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

setupViteAndStatic().catch(err => {
  console.error("❌ Vite server setup failed:", err);
  process.exit(1);
});

// 3. ป้องกันไม่ให้ Vercel เรียกคำสั่ง listen โดยเด็ดขาด 
// (ถ้าไม่ได้รันบน Vercel คำสั่งนี้ถึงจะทำงานปกติเวลาเราเทสในเครื่อง)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// 🔥 4. สำคัญที่สุด: ส่งออก app ให้ Vercel เรียกใช้ได้โดยตรง 🔥
export default app;
