# Meeting Room Booking API

## Overview
This project is a REST API for booking meeting rooms, built with **NestJS** and **TypeScript**. It supports room conflict detection, webhook notifications with retry logic, and is fully documented with Swagger UI.

---

## Setup

### Prerequisites
- Node.js 20+
- npm
- Postman (optional, for manual testing)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/meeting-room-booking.git
cd meeting-room-booking
npm install
```

### Launch the Application
```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run start:prod
```

Access the **Swagger UI** at [http://localhost:3000/api](http://localhost:3000/api)

---

## Requirements

1. **REST API Design**
   - RESTful API with JSON request/response format.
   - **Example Response** — `GET /bookings`:
     ```json
     [
       {
         "id": "e3d2c1b0-...",
         "roomName": "Boardroom",
         "memberName": "Alice",
         "startTime": "2025-06-01T09:00:00.000Z",
         "endTime": "2025-06-01T10:00:00.000Z",
         "createdAt": "2025-05-20T08:00:00.000Z"
       }
     ]
     ```

2. **Conflict Detection**
   - Bookings are rejected if the requested room is already taken for the given time slot. ✓
   - Back-to-back bookings (e.g. 09:00–10:00 then 10:00–11:00) are allowed. ✓

3. **Webhook Notifications**
   - Register external URLs via `POST /webhooks`. ✓
   - A `POST` notification is sent to all registered URLs whenever a booking is created or cancelled. ✓
   - Failed webhook calls are retried up to **3 times** with exponential back-off. ✓

4. **API Documentation**
   - Integrated with **Swagger UI** via `@nestjs/swagger`. ✓
   - Access the interactive docs at [http://localhost:3000/api](http://localhost:3000/api)
   - You can also test via **Postman** using the endpoint reference below.

5. **Unit Testing**
   - Unit tests for all core booking logic including conflict detection edge cases. ✓
   - Unit tests for webhook dispatch and retry behaviour. ✓

6. **Version Control**
   - Git repository hosted on GitHub. ✓

---

## API Reference

### Bookings

#### `POST /bookings` — Create a booking
```bash
curl -s -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "Boardroom",
    "memberName": "Alice",
    "startTime": "2025-06-01T09:00:00Z",
    "endTime":   "2025-06-01T10:00:00Z"
  }'
```
- **201** — Booking created successfully.
- **400** — Room already booked for that slot, or invalid date range.

---

#### `GET /bookings` — List all bookings
```bash
curl -s http://localhost:3000/bookings
```
Returns all bookings sorted by `startTime` ascending.

---

#### `DELETE /bookings/:id` — Cancel a booking
```bash
curl -s -X DELETE http://localhost:3000/bookings/<id>
```
- **200** — Returns the cancelled booking.
- **404** — Booking not found.

---

### Webhooks

#### `POST /webhooks` — Register a webhook URL
```bash
curl -s -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://webhook.site/your-unique-id" }'
```
> **Tip:** Use [webhook.site](https://webhook.site) to get a free test URL that displays incoming requests in real time.

- **201** — Webhook registered successfully.
- **400** — Invalid URL.

---

#### `GET /webhooks` — List registered webhooks
```bash
curl -s http://localhost:3000/webhooks
```

---

### Webhook Payload

Every registered URL receives a `POST` with the following shape on booking events:

```json
{
  "event": "booking.created",
  "timestamp": "2025-05-20T09:00:00.000Z",
  "data": {
    "id": "e3d2c1b0-...",
    "roomName": "Boardroom",
    "memberName": "Alice",
    "startTime": "2025-06-01T09:00:00.000Z",
    "endTime":   "2025-06-01T10:00:00.000Z",
    "createdAt": "2025-05-20T08:00:00.000Z"
  }
}
```

**`event`** is one of `booking.created` | `booking.cancelled`.

---

### Retry Strategy

| Attempt | Delay before retry |
|---|---|
| 1 (initial) | — |
| 2 | 500 ms |
| 3 | 1 000 ms |

After 3 failed attempts the error is logged and the webhook is skipped. Dispatch is **non-blocking** — failures never affect the API response.

---

## End-to-End Test Walkthrough

The following sequence exercises every endpoint, the conflict rejection, webhook firing, and the 404 path:

```bash
# 1. Create a booking
BOOKING=$(curl -s -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "Boardroom",
    "memberName": "Alice",
    "startTime": "2025-06-01T09:00:00Z",
    "endTime": "2025-06-01T10:00:00Z"
  }')
echo $BOOKING

# 2. Try to double-book the same slot → expect 400
curl -s -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "Boardroom",
    "memberName": "Bob",
    "startTime": "2025-06-01T09:30:00Z",
    "endTime": "2025-06-01T10:30:00Z"
  }'

# 3. List all bookings
curl -s http://localhost:3000/bookings

# 4. Register a webhook
curl -s -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://webhook.site/your-unique-id" }'

# 5. Cancel the booking — webhook fires automatically
ID=$(echo $BOOKING | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X DELETE http://localhost:3000/bookings/$ID

# 6. Try to cancel again → expect 404
curl -s -X DELETE http://localhost:3000/bookings/$ID
```

---

## Run Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage report
npm run test -- --coverage
```

### Test Coverage

| File | What's tested |
|---|---|
| `bookings.service.spec.ts` | Create, all conflict edge cases, findAll ordering, cancel, webhook dispatch |
| `webhooks.service.spec.ts` | Register, dispatch to multiple URLs, payload shape, retry count, no-op when empty |

---

## Project Structure

```
src/
├── main.ts                          # Bootstrap + global ValidationPipe + Swagger
├── app.module.ts
├── bookings/
│   ├── booking.entity.ts
│   ├── bookings.controller.ts
│   ├── bookings.module.ts
│   ├── bookings.service.ts
│   ├── bookings.service.spec.ts
│   └── dto/
│       └── create-booking.dto.ts
└── webhooks/
    ├── webhook.entity.ts
    ├── webhooks.controller.ts
    ├── webhooks.module.ts
    ├── webhooks.service.ts
    ├── webhooks.service.spec.ts
    └── dto/
        └── register-webhook.dto.ts
```

---

## Design Decisions

- **Conflict detection** uses strict interval overlap (`startTime < b.endTime && endTime > b.startTime`), allowing back-to-back bookings while correctly rejecting all partial and full overlaps.
- **Webhook dispatch** is fire-and-forget — callers always receive an immediate response regardless of webhook health.
- **In-memory storage** uses `Map<string, T>` keyed by UUID. To migrate to a database, replace the `Map` operations in each service with TypeORM repository calls — controllers, DTOs, and module wiring remain unchanged.
