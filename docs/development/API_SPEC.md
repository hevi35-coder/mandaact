# API Specification

API endpoints and data models for MandaAct.

## Base URL

- **Local Development**: `http://localhost:54321/functions/v1`
- **Production**: `https://[project-id].supabase.co/functions/v1`

## Authentication

All API requests require authentication via Supabase JWT token:

```http
Authorization: Bearer <supabase_jwt_token>
```

## Data Models

### Mandalart
```typescript
interface Mandalart {
  id: string;
  user_id: string;
  title: string;
  center_goal: string;
  input_method: 'image' | 'manual';
  image_url?: string;
  raw_ocr_data?: object;
  created_at: string;
  updated_at: string;
  sub_goals?: SubGoal[];
}
```

### SubGoal
```typescript
interface SubGoal {
  id: string;
  mandalart_id: string;
  position: number; // 1-8
  title: string;
  created_at: string;
  actions?: Action[];
}
```

### Action
```typescript
interface Action {
  id: string;
  sub_goal_id: string;
  position: number; // 1-8
  title: string;
  created_at: string;
}
```

### CheckHistory
```typescript
interface CheckHistory {
  id: string;
  action_id: string;
  user_id: string;
  checked_at: string;
  note?: string;
}
```

## Endpoints

### Mandalart Management

#### Create Mandalart from Image
```http
POST /mandalarts/from-image
Content-Type: multipart/form-data

image: File
```

**Response**:
```json
{
  "id": "uuid",
  "ocr_status": "processing" | "completed",
  "data": {
    "center_goal": "string",
    "sub_goals": [...]
  }
}
```

**Status Codes**:
- `201`: Created successfully
- `400`: Invalid image format
- `401`: Unauthorized
- `500`: OCR processing error

---

#### Create Mandalart Manually
```http
POST /mandalarts/manual
Content-Type: application/json

{
  "title": "My Goals 2025",
  "center_goal": "건강한 삶",
  "sub_goals": [
    {
      "position": 1,
      "title": "운동",
      "actions": [
        { "position": 1, "title": "매일 아침 조깅" },
        ...
      ]
    },
    ...
  ]
}
```

**Response**:
```json
{
  "id": "uuid",
  "data": { ... }
}
```

---

#### Get Mandalart by ID
```http
GET /mandalarts/:id
```

**Response**:
```json
{
  "mandalart": {
    "id": "uuid",
    "center_goal": "건강한 삶",
    "sub_goals": [
      {
        "id": "uuid",
        "title": "운동",
        "actions": [...]
      }
    ]
  }
}
```

---

#### Update Mandalart
```http
PUT /mandalarts/:id
Content-Type: application/json

{
  "center_goal": "Updated goal",
  "sub_goals": [...]
}
```

---

#### Delete Mandalart
```http
DELETE /mandalarts/:id
```

**Response**:
```json
{
  "success": true
}
```

---

### Action Tracking

#### Check Action
```http
POST /actions/:id/check
Content-Type: application/json

{
  "note": "Completed 30 min run"
}
```

**Response**:
```json
{
  "checked": true,
  "check_id": "uuid"
}
```

---

#### Uncheck Action
```http
DELETE /checks/:check_id
```

**Response**:
```json
{
  "success": true
}
```

---

#### Get Action Check History
```http
GET /actions/:id/history?from=2025-01-01&to=2025-01-31
```

**Response**:
```json
{
  "checks": [
    {
      "id": "uuid",
      "checked_at": "2025-01-15T09:00:00Z",
      "note": "..."
    }
  ]
}
```

---

### Analytics

#### Get Dashboard Data
```http
GET /analytics/dashboard
```

**Response**:
```json
{
  "total_actions": 64,
  "completed_actions": 32,
  "completion_rate": 50,
  "streak_days": 7,
  "heatmap_data": [
    { "date": "2025-01-15", "count": 5 },
    ...
  ],
  "sub_goal_progress": [
    { "sub_goal_id": "uuid", "progress": 75 }
  ]
}
```

---

#### Get Weekly Report
```http
GET /analytics/weekly-report
```

**Response**:
```json
{
  "week_start": "2025-01-08",
  "summary": "This week you completed 25 actions...",
  "top_achievements": ["운동 목표 100% 달성"],
  "improvement_areas": ["독서 목표 소홀"],
  "next_week_suggestions": ["매일 아침 10분 독서 추천"]
}
```

---

### AI Coaching

#### Send Chat Message
```http
POST /chat
Content-Type: application/json

{
  "message": "요즘 실천이 잘 안 돼요",
  "session_id": "uuid" // optional
}
```

**Response**:
```json
{
  "reply": "지난주 체크율이 30%로 떨어졌네요...",
  "session_id": "uuid",
  "context_used": {
    "check_rate": 30,
    "low_performance_areas": ["운동"]
  }
}
```

---

#### Get Chat History
```http
GET /chat/history/:session_id
```

**Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "요즘 실천이 잘 안 돼요",
      "timestamp": "2025-01-15T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "...",
      "timestamp": "2025-01-15T10:00:05Z"
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... } // optional
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing auth token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `OCR_FAILED`: Image recognition error
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limits

- **API Calls**: 100 requests/minute per user
- **Chat Messages**: 20 messages/day per user
- **Image Uploads**: 10 uploads/hour per user

## Supabase Direct Access

For frontend, use Supabase client directly instead of Edge Functions:

```typescript
import { supabase } from '@/lib/supabase';

// Get mandalarts
const { data, error } = await supabase
  .from('mandalarts')
  .select('*, sub_goals(*, actions(*))')
  .eq('user_id', userId);

// Create check
const { data, error } = await supabase
  .from('check_history')
  .insert({
    action_id: actionId,
    user_id: userId,
    note: 'Completed'
  });
```

## Realtime Subscriptions

Subscribe to changes for live updates:

```typescript
const subscription = supabase
  .channel('mandalart-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'check_history',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```
