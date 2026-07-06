# Project Guidelines & Critical Constraints

## 🛑 DO NOT MODIFY BRIGHTNESS CONTROL & LIGHT TESTING LOGIC
The LoRaWAN light testing, bulk/group brightness control, and individual brightness control APIs are fully optimized, tested, and verified to be working perfectly with the physical hardware.

**Strict Negative Constraints:**
1. **DO NOT** modify, refactor, or touch the payload formats, API routes, or proxy handlers related to:
   - Individual device brightness commands: `/api/proxy/solar-street-lights/:devEui/brightness`
   - Bulk group brightness commands: `/api/proxy/solar-street-lights/bulk-brightness/:groupId`
   - The payload format must strictly remain: `{ brightnessLevel: <number>, duration: <number> }`
2. **DO NOT** change the implementation of:
   - `DeviceService.setDeviceBrightness`
   - `DeviceService.setGroupBrightness`
   - The diagnostic tests triggering bulk group controls in `DiagnosticTest.tsx` and `MulticastGroup.tsx`.
3. If any future modification requires editing or adapting these specific files or logic, you **MUST** ask the user first and receive explicit confirmation before proceeding.
