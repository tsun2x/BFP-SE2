# Incident Evidence API Contracts (Photo First)

## Scope
- Caller uploads photo evidence during call or within 5 minutes after call end.
- Evidence is stored in Supabase Storage bucket `incident-evidence`.
- Assigned station admin receives realtime notification.
- Evidence appears in incident details/history.

## Auth
- All endpoints below require Bearer token.
- Caller-only for init/complete.
- Station/admin read restrictions enforced by backend role + station assignment.

## Endpoint 1: Initialize Upload
- Method: POST
- Path: `/api/incidents/:alarmId/evidence/init`

### Request Body
```json
{
  "mimeType": "image/jpeg",
  "fileSizeBytes": 512000,
  "capturePhase": "in_call",
  "capturedAt": "2026-04-12T10:15:30.000Z"
}
```

### Success 200
```json
{
  "success": true,
  "data": {
    "alarmId": 123,
    "bucket": "incident-evidence",
    "storagePath": "alarms/123/caller/USER_AUTH_UID/1776003000_uuid.jpg",
    "uploadWindow": {
      "allowedUntil": "2026-04-12T10:20:00.000Z",
      "secondsRemaining": 180
    }
  }
}
```

## Endpoint 2: Complete Upload
- Method: POST
- Path: `/api/incidents/:alarmId/evidence/complete`

### Request Body
```json
{
  "bucket": "incident-evidence",
  "storagePath": "alarms/123/caller/USER_AUTH_UID/1776003000_uuid.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 512000,
  "capturePhase": "in_call",
  "capturedAt": "2026-04-12T10:15:30.000Z",
  "geo": {
    "latitude": 14.59,
    "longitude": 120.98
  }
}
```

### Success 201
```json
{
  "success": true,
  "data": {
    "evidenceId": 987,
    "alarmId": 123,
    "stationId": 12,
    "bucket": "incident-evidence",
    "storagePath": "alarms/123/caller/USER_AUTH_UID/1776003000_uuid.jpg",
    "uploadedAt": "2026-04-12T10:16:02.000Z"
  }
}
```

## Endpoint 3: List Evidence by Incident
- Method: GET
- Path: `/api/incidents/:alarmId/evidence`

### Success 200
```json
{
  "success": true,
  "data": {
    "alarmId": 123,
    "items": [
      {
        "evidenceId": 987,
        "callerName": "Juan Dela Cruz",
        "callerPhoneNumber": "09171234567",
        "capturePhase": "in_call",
        "previewUrl": "SIGNED_URL",
        "uploadedAt": "2026-04-12T10:16:02.000Z"
      }
    ]
  }
}
```

## Endpoint 4: Upload Window Status
- Method: GET
- Path: `/api/incidents/:alarmId/evidence/window`

### Success 200
```json
{
  "success": true,
  "data": {
    "alarmId": 123,
    "callEndedAt": "2026-04-12T10:14:00.000Z",
    "allowedUntil": "2026-04-12T10:19:00.000Z",
    "secondsRemaining": 142,
    "uploadAllowed": true
  }
}
```

## Realtime Event
- Event: `incident-evidence-uploaded`
- Emitted to:
  - `alarm-:alarmId`
  - `station-:assignedStationId`
  - `main-admin` fallback

### Payload
```json
{
  "alarmId": 123,
  "evidenceId": 987,
  "mediaType": "image",
  "callerName": "Juan Dela Cruz",
  "callerPhoneNumber": "09171234567",
  "previewUrl": "SIGNED_OR_PUBLIC_URL",
  "uploadedAt": "2026-04-12T10:16:02.000Z"
}
```

## Error Codes
- `UNAUTHORIZED`
- `ALARM_NOT_FOUND`
- `ALARM_NOT_OWNED`
- `WINDOW_EXPIRED`
- `INVALID_MIME_TYPE`
- `FILE_TOO_LARGE`
- `STORAGE_PATH_INVALID`
- `DB_INSERT_FAILED`
