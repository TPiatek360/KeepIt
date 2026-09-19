# KeepIt REST API Quickstart Guide

The KeepIt REST API allows you to programmatically create, search, update, and manage your notes and tags from any device, automation tool, or language—including **cURL, Python, JavaScript, iOS / macOS Shortcuts, Raycast, Obsidian, and Home Assistant**.

---

## Table of Contents

1. [Architecture & Base URLs](#1-architecture--base-urls)
2. [Authentication](#2-authentication)
   - [Generating a Personal API Key](#generating-a-personal-api-key)
   - [Using Your Key](#using-your-key)
   - [Firebase Auth ID Tokens (Alternative)](#firebase-auth-id-tokens-alternative)
3. [API Endpoints Reference](#3-api-endpoints-reference)
   - [`GET /api/v1/notes` (List & Search)](#get-apiv1notes)
   - [`GET /api/v1/notes/:id` (Fetch Note)](#get-apiv1notesid)
   - [`POST /api/v1/notes` (Create Note)](#post-apiv1notes)
   - [`PATCH /api/v1/notes/:id` (Update / Append)](#patch-apiv1notesid)
   - [`DELETE /api/v1/notes/:id` (Delete Note)](#delete-apiv1notesid)
   - [`GET /api/v1/tags` (List Tags)](#get-apiv1tags)
   - [`GET /api/v1/me` (Identity & Diagnostics)](#get-apiv1me)
   - [`GET /api/v1/docs` (Interactive Reference)](#get-apiv1docs)
4. [Formatting & Features](#4-formatting--features)
   - [Markdown Checklists](#markdown-checklists)
   - [Internal Bi-directional Linking (`::shortId`)](#internal-bi-directional-linking-shortid)
   - [Tag Management](#tag-management)
   - [Card Colors](#card-colors)
5. [Code Examples & Automation Recipes](#5-code-examples--automation-recipes)
   - [cURL](#curl)
   - [Python](#python)
   - [JavaScript / Node.js](#javascript--nodejs)
   - [Apple / iOS Shortcuts (Quick Capture)](#apple--ios-shortcuts-quick-capture)
6. [Error Handling & Status Codes](#6-error-handling--status-codes)

---

## 1. Architecture & Base URLs

All API calls are served by the Firebase Cloud Functions backend and routed directly through Firebase Hosting rewrites (`/api/**`).

| Environment | Base URL |
|---|---|
| **Production (Firebase Hosting)** | `https://<your-firebase-project>.web.app/api/v1` |
| **Custom Domain** | `https://<your-custom-domain>/api/v1` |
| **Firebase Local Emulator** | `http://127.0.0.1:5001/<project-id>/us-central1/api/v1` |

> **Note:** The API handles both `/api/v1/...` and `/v1/...` automatically.

---

## 2. Authentication

The API offers dual authentication: **Personal API Keys (PAT)** and **Firebase Auth ID Tokens**.

### Generating a Personal API Key

1. Open KeepIt in your browser.
2. Click the **Settings** gear icon (`⚙️`) in the top navigation bar.
3. Select the **API & Developer** tab.
4. Enter a descriptive name for your key (e.g., `iOS Shortcuts`, `Backup Script`, `Raycast`).
5. Click **Generate**.
6. **Copy your key immediately** (`keepit_sk_...`). For your security, the secret key is hashed with SHA-256 and will **never** be displayed again.

### Using Your Key

You can provide your key in HTTP requests using either of the following methods:

**Method A: `X-API-Key` Header (Recommended for CLI & Shortcuts)**
```http
X-API-Key: keepit_sk_0123456789abcdef0123456789abcdef0123456789abcdef
```

**Method B: `Authorization` Bearer Header**
```http
Authorization: Bearer keepit_sk_0123456789abcdef0123456789abcdef0123456789abcdef
```

### Firebase Auth ID Tokens (Alternative)

If you are calling the API from a client already authenticated with the Firebase Web SDK:
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 3. API Endpoints Reference

### `GET /api/v1/notes`

List notes belonging to the authenticated user. Results are sorted by `updatedAt` descending.

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `tag` | `string` | — | Filter notes containing this tag (case-insensitive) |
| `search` | `string` | — | Substring match against note `title` or `content` |
| `pinned` | `boolean` | — | Set `true` to return only pinned notes |
| `archived` | `boolean` | `false` | When `false`, excludes archived notes |
| `trashed` | `boolean` | `false` | When `false`, excludes trashed notes |
| `limit` | `integer` | `50` | Maximum number of notes to return (max `200`) |

#### Example Request:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://your-domain.web.app/api/v1/notes?tag=project&limit=5"
```

#### Example Response (`200 OK`):
```json
{
  "notes": [
    {
      "id": "abc123DocId",
      "shortId": "oxbg",
      "title": "Project Roadmap",
      "content": "- [x] Setup repository\n- [ ] Release REST API",
      "tags": ["project", "dev"],
      "color": "bg-blue-100",
      "pinned": true,
      "archived": false,
      "trashed": false,
      "createdAt": "2026-09-18T18:30:00.000Z",
      "updatedAt": "2026-09-18T20:15:00.000Z"
    }
  ],
  "count": 1
}
```

---

### `GET /api/v1/notes/:id`

Retrieve a single note. You can specify either the **20-character Firestore Document ID** (`abc123DocId`) or the **4-character `shortId`** (`oxbg`).

#### Example Request:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://your-domain.web.app/api/v1/notes/oxbg"
```

#### Example Response (`200 OK`):
```json
{
  "note": {
    "id": "abc123DocId",
    "shortId": "oxbg",
    "title": "Project Roadmap",
    "content": "- [x] Setup repository\n- [ ] Release REST API",
    "tags": ["project", "dev"],
    "color": "bg-blue-100",
    "pinned": true,
    "archived": false,
    "trashed": false,
    "createdAt": "2026-09-18T18:30:00.000Z",
    "updatedAt": "2026-09-18T20:15:00.000Z"
  }
}
```

---

### `POST /api/v1/notes`

Create a new note. A unique 4-character `shortId` is generated automatically.

#### Request Body Fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | No | Title of the note (default: `""`) |
| `content` | `string` | Yes* | Markdown content (either `title` or `content` required) |
| `tags` | `string[]` | No | List of tag names (e.g., `["work", "todo"]`) |
| `color` | `string` | No | Note background color class or hex |
| `pinned` | `boolean` | No | Pin note to top of list (default: `false`) |
| `archived` | `boolean` | No | Create directly in archive (default: `false`) |

#### Example Request:
```bash
curl -X POST "https://your-domain.web.app/api/v1/notes" \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Grocery Shopping",
    "content": "- [ ] Oat milk\n- [ ] Honeycrisp apples\n- [ ] Dark roast coffee",
    "tags": ["personal", "errands"],
    "pinned": false
  }'
```

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "note": {
    "id": "xyz987DocId",
    "shortId": "a8kp",
    "title": "Grocery Shopping",
    "content": "- [ ] Oat milk\n- [ ] Honeycrisp apples\n- [ ] Dark roast coffee",
    "tags": ["personal", "errands"],
    "color": "default",
    "pinned": false,
    "archived": false,
    "trashed": false,
    "createdAt": "2026-09-18T22:30:00.000Z",
    "updatedAt": "2026-09-18T22:30:00.000Z"
  }
}
```

---

### `PATCH /api/v1/notes/:id`

Update fields on an existing note. Specify the Firestore ID or `shortId`.

#### Useful Update Helpers:
- `appendContent`: Appends text to the end of the current `content`. Great for quick capture / journal entries without reading the note first!
- `addTags`: Array of tags to add to existing tags.
- `removeTags`: Array of tags to remove.

#### Example: Append to Note
```bash
curl -X PATCH "https://your-domain.web.app/api/v1/notes/a8kp" \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "appendContent": "\n- [ ] Fresh basil"
  }'
```

#### Example: Update Metadata
```bash
curl -X PATCH "https://your-domain.web.app/api/v1/notes/a8kp" \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Grocery Run",
    "pinned": true,
    "addTags": ["urgent"]
  }'
```

---

### `DELETE /api/v1/notes/:id`

Deletes a note. By default, notes are **soft-deleted** (moved to Trash).

- **Soft Delete (to Trash):** `DELETE /api/v1/notes/:id`
- **Permanent Deletion:** `DELETE /api/v1/notes/:id?permanent=true`

#### Example Request:
```bash
curl -X DELETE "https://your-domain.web.app/api/v1/notes/a8kp" \
  -H "X-API-Key: YOUR_KEY"
```

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "message": "Note moved to trash"
}
```

---

### `GET /api/v1/tags`

Retrieves a list of all unique tags used across the user's active notes.

#### Example Request:
```bash
curl -H "X-API-Key: YOUR_KEY" "https://your-domain.web.app/api/v1/tags"
```

#### Example Response (`200 OK`):
```json
{
  "tags": ["api", "dev", "errands", "personal", "project", "work"],
  "count": 6
}
```

---

### `GET /api/v1/me`

Verify key validity and check authenticated account info.

#### Example Request:
```bash
curl -H "X-API-Key: YOUR_KEY" "https://your-domain.web.app/api/v1/me"
```

#### Example Response (`200 OK`):
```json
{
  "authenticated": true,
  "authMethod": "api_key",
  "uid": "USER_FIREBASE_UID",
  "key": {
    "id": "keyDocId",
    "name": "iOS Shortcuts",
    "prefix": "keepit_sk_12345678"
  }
}
```

---

### `GET /api/v1/docs`

Interactive, responsive HTML documentation rendered directly in your browser. Point your web browser to `https://your-domain.web.app/api/v1/docs`.

---

## 4. Formatting & Features

### Markdown Checklists
KeepIt natively renders interactive checkboxes when markdown checklist syntax is used in `content`:
```markdown
- [ ] Incomplete task item
- [x] Completed task item
```

### Internal Bi-directional Linking (`::shortId`)
KeepIt connects notes in the Mind Map / Graph View using short IDs:
- **Bare ID:** Type `::oxbg` anywhere in the note body.
- **Labeled Link:** `[Read Architecture Spec](internal://oxbg)`

Both formats establish clickable navigation and interactive edges in the Graph View.

### Tag Management
- Tags should be provided without `#` (e.g. `"tags": ["ideas", "research"]`). If `#` is included, the API automatically trims it.
- Spaces are stripped or normalized to hyphens.

### Card Colors
Supported color values include KeepIt theme tokens or Tailwind background classes:
- `"default"`
- `"bg-red-100 dark:bg-red-900/30"`
- `"bg-orange-100 dark:bg-orange-900/30"`
- `"bg-yellow-100 dark:bg-yellow-900/30"`
- `"bg-green-100 dark:bg-green-900/30"`
- `"bg-blue-100 dark:bg-blue-900/30"`
- `"bg-purple-100 dark:bg-purple-900/30"`

---

## 5. Code Examples & Automation Recipes

### cURL

#### Search Notes by Tag:
```bash
curl -s -H "X-API-Key: keepit_sk_your_key_here" \
  "https://your-domain.web.app/api/v1/notes?tag=work" | jq .
```

#### Quick Scratchpad Note:
```bash
curl -X POST "https://your-domain.web.app/api/v1/notes" \
  -H "X-API-Key: keepit_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Terminal Note",
    "content": "Captured on '"$(date)"'",
    "tags": ["cli"]
  }'
```

---

### Python

A reusable Python client using `requests`:

```python
import requests

API_BASE = "https://your-domain.web.app/api/v1"
API_KEY = "keepit_sk_your_key_here"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def create_note(title: str, content: str, tags: list = None, pinned: bool = False):
    payload = {
        "title": title,
        "content": content,
        "tags": tags or [],
        "pinned": pinned
    }
    res = requests.post(f"{API_BASE}/notes", json=payload, headers=headers)
    res.raise_for_status()
    return res.json()["note"]

def search_notes(query: str = None, tag: str = None):
    params = {}
    if query: params["search"] = query
    if tag: params["tag"] = tag
    
    res = requests.get(f"{API_BASE}/notes", params=params, headers=headers)
    res.raise_for_status()
    return res.json()["notes"]

def append_to_note(short_id: str, new_content: str):
    res = requests.patch(
        f"{API_BASE}/notes/{short_id}",
        json={"appendContent": f"\n{new_content}"},
        headers=headers
    )
    res.raise_for_status()
    return res.json()["note"]

# Example Usage:
if __name__ == "__main__":
    new_note = create_note(
        title="Weekly Standup",
        content="- [ ] Run database migration\n- [ ] Review PRs",
        tags=["work", "standup"]
    )
    print(f"Created note ::{new_note['shortId']} - {new_note['title']}")
```

---

### JavaScript / Node.js

Using native `fetch`:

```javascript
const API_BASE = 'https://your-domain.web.app/api/v1';
const API_KEY = 'keepit_sk_your_key_here';

async function keepItFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// 1. Fetch notes
const { notes } = await keepItFetch('/notes?limit=10');
console.log(`Retrieved ${notes.length} notes`);

// 2. Create note
const { note } = await keepItFetch('/notes', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Node.js Automated Note',
    content: 'Export completed at ' + new Date().toISOString(),
    tags: ['automation']
  })
});
console.log(`Created note ::${note.shortId}`);
```

---

### Apple / iOS Shortcuts (Quick Capture)

You can create an iOS Shortcut that lets you dictate or type a thought from your iPhone lock screen or Siri and save it immediately to KeepIt.

#### Shortcut Recipe:
1. Open the **Shortcuts** app on iOS / macOS.
2. Create a **New Shortcut** (name it `"Add to KeepIt"`).
3. Add action: **Ask for Input**
   - Type: `Text`
   - Prompt: `"Note Content"`
4. Add action: **Get Contents of URL**
   - **URL:** `https://your-domain.web.app/api/v1/notes`
   - **Method:** `POST`
   - **Headers:**
     - `X-API-Key`: `keepit_sk_your_key_here`
     - `Content-Type`: `application/json`
   - **Request Body:** `JSON`
     - Key `title`: Text (e.g., `"Quick Capture"`)
     - Key `content`: `Provided Input` (variable from Step 3)
     - Key `tags`: Array of Text (`inbox`, `quick`)
5. Add action: **Show Notification**
   - Text: `"Saved note to KeepIt!"`

---

## 6. Error Handling & Status Codes

All errors return JSON payloads with an `error` message:

```json
{
  "error": "Detailed description of the issue"
}
```

| HTTP Status | Reason | Troubleshooting |
|---|---|---|
| `400 Bad Request` | Missing required fields or invalid JSON payload | Ensure either `title` or `content` is provided for new notes. |
| `401 Unauthorized` | Missing, invalid, or revoked API key | Verify key in request header; ensure key hasn't been revoked in Settings. |
| `404 Not Found` | Note not found or belongs to another user | Double-check note ID or `shortId`. Ensure ID matches current account. |
| `429 Too Many Requests` | Rate limit reached | Standard limit is 120 requests/min per key. Back off and retry. |
| `500 Internal Server Error` | Server execution error | Check Cloud Function execution logs in Firebase Console. |
