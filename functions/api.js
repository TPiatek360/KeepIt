const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

/**
 * Creates the Express application handling KeepIt REST API requests.
 * 
 * @param {import("firebase-admin")} admin Firebase Admin SDK instance
 * @param {Object} config Environment configuration
 * @param {string} config.APP_ID Firestore artifacts application namespace
 */
function createApiApp(admin, { APP_ID = "keepit-local" } = {}) {
    const app = express();
    app.use(cors({ origin: true }));
    app.use(express.json({ limit: '2mb' }));

    // Helper: Compute SHA-256 hash for secure key lookup
    const hashApiKey = (rawKey) => {
        return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
    };

    // Helper: 4-character lowercase alphanumeric short ID generator
    const generateShortId = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Helper: Format Firestore timestamps into ISO strings
    const formatTimestamp = (val) => {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        if (val._seconds) return new Date(val._seconds * 1000).toISOString();
        if (typeof val === 'string' || typeof val === 'number') return new Date(val).toISOString();
        return null;
    };

    // Helper: Format a Firestore document snapshot into a clean note object
    const formatNote = (doc) => {
        const data = doc.data() || {};
        return {
            id: doc.id,
            shortId: data.shortId || null,
            title: data.title || "",
            content: data.content || "",
            tags: data.tags || [],
            color: data.color || "default",
            isPinned: !!data.isPinned,
            isArchived: !!data.isArchived,
            isTrashed: !!data.isTrashed,
            reminder: data.reminder || null,
            relations: data.relations || [],
            attachments: data.attachments || [],
            createdAt: formatTimestamp(data.createdAt),
            updatedAt: formatTimestamp(data.updatedAt)
        };
    };

    // Authentication Middleware: Supports Bearer API key or Firebase ID Token
    const authenticate = async (req, res, next) => {
        const rawAuth = req.headers.authorization || req.headers['x-api-key'];
        if (!rawAuth) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Missing authorization header. Provide 'Authorization: Bearer <api_key_or_token>' or 'X-API-Key: <api_key>'."
            });
        }

        let token = rawAuth.trim();
        if (token.startsWith('Bearer ')) {
            token = token.slice(7).trim();
        }

        // 1. Personal API Key (starts with keepit_sk_)
        if (token.startsWith('keepit_sk_')) {
            try {
                const hashed = hashApiKey(token);
                const keyDoc = await admin.firestore().doc(`artifacts/${APP_ID}/api_keys/${hashed}`).get();
                if (!keyDoc.exists) {
                    return res.status(401).json({ error: "Unauthorized", message: "Invalid or revoked API key." });
                }
                const keyData = keyDoc.data();
                if (keyData.revoked) {
                    return res.status(401).json({ error: "Unauthorized", message: "API key has been revoked." });
                }

                req.user = {
                    uid: keyData.uid,
                    keyId: keyData.id || hashed,
                    keyName: keyData.name || "Default API Key",
                    authMethod: "api_key"
                };

                // Asynchronously update lastUsedAt in background
                keyDoc.ref.update({
                    lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
                }).catch(() => {});

                // Also update user's subcollection record if present
                if (keyData.id) {
                    admin.firestore().doc(`artifacts/${APP_ID}/users/${keyData.uid}/api_keys/${keyData.id}`)
                        .update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() })
                        .catch(() => {});
                }

                return next();
            } catch (err) {
                console.error("[API Auth] Error verifying API key:", err);
                return res.status(500).json({ error: "Internal Server Error", message: "Authentication failure." });
            }
        }

        // 2. Firebase ID Token (JWT from Firebase Auth)
        try {
            const decoded = await admin.auth().verifyIdToken(token);
            req.user = {
                uid: decoded.uid,
                email: decoded.email,
                authMethod: "firebase_token"
            };
            return next();
        } catch (err) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or expired Firebase ID token or API key."
            });
        }
    };

    const router = express.Router();

    // -------------------------------------------------------------
    // Health & Identity Endpoints
    // -------------------------------------------------------------

    // GET /me - Check current authentication status
    router.get('/me', authenticate, (req, res) => {
        res.json({
            uid: req.user.uid,
            email: req.user.email || null,
            authMethod: req.user.authMethod,
            keyName: req.user.keyName || null
        });
    });

    // -------------------------------------------------------------
    // Notes Endpoints
    // -------------------------------------------------------------

    // GET /notes - List / query notes
    router.get('/notes', authenticate, async (req, res) => {
        try {
            const { tag, search, archived, trashed, pinned, limit = 50 } = req.query;
            const notesRef = admin.firestore().collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`);

            let q = notesRef;

            // Soft-delete filter
            if (trashed === 'true') {
                q = q.where('isTrashed', '==', true);
            } else {
                q = q.where('isTrashed', '==', false);
            }

            // Archive filter
            if (archived === 'true') {
                q = q.where('isArchived', '==', true);
            } else if (archived === 'false' || archived === undefined) {
                q = q.where('isArchived', '==', false);
            }

            // Pinned filter
            if (pinned === 'true') {
                q = q.where('isPinned', '==', true);
            }

            // Tag filter
            if (tag) {
                q = q.where('tags', 'array-contains', tag.toLowerCase().trim());
            }

            // Limit
            const maxLimit = Math.min(parseInt(limit, 10) || 50, 200);
            q = q.limit(maxLimit);

            const snap = await q.get();
            let notes = snap.docs.map(formatNote);

            // In-memory search filter if 'search' param provided
            if (search) {
                const s = search.toLowerCase().trim();
                notes = notes.filter(n => 
                    (n.title && n.title.toLowerCase().includes(s)) ||
                    (n.content && n.content.toLowerCase().includes(s)) ||
                    (n.shortId && n.shortId.toLowerCase().includes(s))
                );
            }

            // Sort by updatedAt descending
            notes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

            res.json({
                count: notes.length,
                notes
            });
        } catch (err) {
            console.error("[API GET /notes] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // GET /notes/:id - Get single note by doc ID or shortId
    router.get('/notes/:id', authenticate, async (req, res) => {
        try {
            const idParam = req.params.id.trim();
            const notesRef = admin.firestore().collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`);

            // 1. Check doc ID directly
            let docSnap = await notesRef.doc(idParam).get();

            // 2. If not found and param is short, search by shortId
            if (!docSnap.exists && idParam.length <= 10) {
                const shortSnap = await notesRef.where('shortId', '==', idParam.toLowerCase()).limit(1).get();
                if (!shortSnap.empty) {
                    docSnap = shortSnap.docs[0];
                }
            }

            if (!docSnap.exists) {
                return res.status(404).json({ error: "Not Found", message: `Note '${idParam}' does not exist.` });
            }

            res.json({ note: formatNote(docSnap) });
        } catch (err) {
            console.error("[API GET /notes/:id] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // POST /notes - Create a new note
    router.post('/notes', authenticate, async (req, res) => {
        try {
            const {
                title = "",
                content = "",
                tags = [],
                color = "default",
                isPinned = false,
                reminder = null,
                shortId: desiredShortId,
                relations = []
            } = req.body;

            const notesRef = admin.firestore().collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`);

            // Generate unique shortId
            let finalShortId = desiredShortId ? String(desiredShortId).toLowerCase().trim() : generateShortId();
            const existingShort = await notesRef.where('shortId', '==', finalShortId).limit(1).get();
            if (!existingShort.empty) {
                finalShortId = generateShortId();
            }

            // Normalize tags
            const cleanTags = Array.isArray(tags)
                ? Array.from(new Set(tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)))
                : [];

            const newDocRef = notesRef.doc();
            const payload = {
                title: String(title || ""),
                content: String(content || ""),
                tags: cleanTags,
                color: String(color || "default"),
                shortId: finalShortId,
                isPinned: !!isPinned,
                isArchived: false,
                isTrashed: false,
                reminder: reminder ? String(reminder) : null,
                relations: Array.isArray(relations) ? relations : [],
                attachments: [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await newDocRef.set(payload);

            const savedDoc = await newDocRef.get();
            res.status(201).json({
                success: true,
                note: formatNote(savedDoc)
            });
        } catch (err) {
            console.error("[API POST /notes] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // PATCH /notes/:id - Partial update a note
    router.patch('/notes/:id', authenticate, async (req, res) => {
        try {
            const idParam = req.params.id.trim();
            const notesRef = admin.firestore().collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`);

            let docRef = notesRef.doc(idParam);
            let docSnap = await docRef.get();

            if (!docSnap.exists && idParam.length <= 10) {
                const shortSnap = await notesRef.where('shortId', '==', idParam.toLowerCase()).limit(1).get();
                if (!shortSnap.empty) {
                    docRef = shortSnap.docs[0].ref;
                    docSnap = shortSnap.docs[0];
                }
            }

            if (!docSnap.exists) {
                return res.status(404).json({ error: "Not Found", message: `Note '${idParam}' does not exist.` });
            }

            const currentData = docSnap.data() || {};
            const updates = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            const body = req.body;

            // Direct field updates
            if (body.title !== undefined) updates.title = String(body.title);
            if (body.color !== undefined) updates.color = String(body.color);
            if (body.isPinned !== undefined) updates.isPinned = !!body.isPinned;
            if (body.isArchived !== undefined) updates.isArchived = !!body.isArchived;
            if (body.isTrashed !== undefined) updates.isTrashed = !!body.isTrashed;
            if (body.reminder !== undefined) updates.reminder = body.reminder ? String(body.reminder) : null;
            if (body.relations !== undefined && Array.isArray(body.relations)) updates.relations = body.relations;

            // Content update or appendContent convenience helper
            if (body.content !== undefined) {
                updates.content = String(body.content);
            } else if (body.appendContent) {
                const currentContent = currentData.content || "";
                updates.content = currentContent ? `${currentContent}\n${body.appendContent}` : String(body.appendContent);
            }

            // Tag update or addTags / removeTags helpers
            let currentTags = currentData.tags || [];
            if (body.tags !== undefined && Array.isArray(body.tags)) {
                currentTags = Array.from(new Set(body.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean)));
                updates.tags = currentTags;
            } else {
                let tagsChanged = false;
                if (Array.isArray(body.addTags) && body.addTags.length > 0) {
                    const toAdd = body.addTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
                    currentTags = Array.from(new Set([...currentTags, ...toAdd]));
                    tagsChanged = true;
                }
                if (Array.isArray(body.removeTags) && body.removeTags.length > 0) {
                    const toRemove = new Set(body.removeTags.map(t => String(t).toLowerCase().trim()));
                    currentTags = currentTags.filter(t => !toRemove.has(t));
                    tagsChanged = true;
                }
                if (tagsChanged) updates.tags = currentTags;
            }

            await docRef.update(updates);

            const updatedDoc = await docRef.get();
            res.json({
                success: true,
                note: formatNote(updatedDoc)
            });
        } catch (err) {
            console.error("[API PATCH /notes/:id] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // DELETE /notes/:id - Trash or permanently delete a note
    router.delete('/notes/:id', authenticate, async (req, res) => {
        try {
            const idParam = req.params.id.trim();
            const { permanent } = req.query;
            const notesRef = admin.firestore().collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`);

            let docRef = notesRef.doc(idParam);
            let docSnap = await docRef.get();

            if (!docSnap.exists && idParam.length <= 10) {
                const shortSnap = await notesRef.where('shortId', '==', idParam.toLowerCase()).limit(1).get();
                if (!shortSnap.empty) {
                    docRef = shortSnap.docs[0].ref;
                    docSnap = shortSnap.docs[0];
                }
            }

            if (!docSnap.exists) {
                return res.status(404).json({ error: "Not Found", message: `Note '${idParam}' does not exist.` });
            }

            if (permanent === 'true') {
                await docRef.delete();
                return res.json({ success: true, message: `Note '${idParam}' permanently deleted.` });
            }

            // Soft-delete to trash
            await docRef.update({
                isTrashed: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            res.json({ success: true, message: `Note '${idParam}' moved to trash.` });
        } catch (err) {
            console.error("[API DELETE /notes/:id] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // GET /tags - List all unique tags
    router.get('/tags', authenticate, async (req, res) => {
        try {
            const notesSnap = await admin.firestore()
                .collection(`artifacts/${APP_ID}/users/${req.user.uid}/notes`)
                .where('isTrashed', '==', false)
                .get();

            const tagSet = new Set();
            notesSnap.forEach(doc => {
                const tags = doc.data().tags || [];
                tags.forEach(t => tagSet.add(t));
            });

            const tags = Array.from(tagSet).sort();
            res.json({ count: tags.length, tags });
        } catch (err) {
            console.error("[API GET /tags] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // -------------------------------------------------------------
    // API Key Management Endpoints
    // -------------------------------------------------------------

    // POST /keys - Generate a new personal API key
    router.post('/keys', authenticate, async (req, res) => {
        try {
            const { name = "Personal API Key" } = req.body;
            const keyId = crypto.randomBytes(8).toString('hex');
            const secret = crypto.randomBytes(24).toString('hex');
            const rawApiKey = `keepit_sk_${secret}`;
            const hashed = hashApiKey(rawApiKey);
            const prefix = `keepit_sk_${secret.slice(0, 4)}...${secret.slice(-4)}`;

            const batch = admin.firestore().batch();

            // 1. Root lookup document (keyed by SHA-256 hash)
            const rootRef = admin.firestore().doc(`artifacts/${APP_ID}/api_keys/${hashed}`);
            batch.set(rootRef, {
                id: keyId,
                uid: req.user.uid,
                name: String(name).trim(),
                prefix,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUsedAt: null,
                revoked: false
            });

            // 2. User subcollection document (for dashboard display and revocation)
            const userRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${req.user.uid}/api_keys/${keyId}`);
            batch.set(userRef, {
                id: keyId,
                name: String(name).trim(),
                prefix,
                hash: hashed,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUsedAt: null
            });

            await batch.commit();

            res.status(201).json({
                success: true,
                id: keyId,
                name: String(name).trim(),
                prefix,
                apiKey: rawApiKey,
                message: "Copy your API key now. For security, it will not be displayed again."
            });
        } catch (err) {
            console.error("[API POST /keys] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // GET /keys - List active API keys for user
    router.get('/keys', authenticate, async (req, res) => {
        try {
            const snap = await admin.firestore()
                .collection(`artifacts/${APP_ID}/users/${req.user.uid}/api_keys`)
                .get();

            const keys = snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    name: d.name || "API Key",
                    prefix: d.prefix || "keepit_sk_...",
                    createdAt: formatTimestamp(d.createdAt),
                    lastUsedAt: formatTimestamp(d.lastUsedAt)
                };
            });

            keys.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            res.json({ count: keys.length, keys });
        } catch (err) {
            console.error("[API GET /keys] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // DELETE /keys/:keyId - Revoke an API key
    router.delete('/keys/:keyId', authenticate, async (req, res) => {
        try {
            const { keyId } = req.params;
            const userKeyRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${req.user.uid}/api_keys/${keyId}`);
            const userKeySnap = await userKeyRef.get();

            if (!userKeySnap.exists) {
                return res.status(404).json({ error: "Not Found", message: `API key '${keyId}' not found.` });
            }

            const hash = userKeySnap.data().hash;
            const batch = admin.firestore().batch();

            batch.delete(userKeyRef);
            if (hash) {
                batch.delete(admin.firestore().doc(`artifacts/${APP_ID}/api_keys/${hash}`));
            }

            await batch.commit();
            res.json({ success: true, message: `API key '${keyId}' revoked.` });
        } catch (err) {
            console.error("[API DELETE /keys/:keyId] Error:", err);
            res.status(500).json({ error: "Internal Server Error", message: err.message });
        }
    });

    // -------------------------------------------------------------
    // Documentation / Discovery Endpoints
    // -------------------------------------------------------------

    // HTML Documentation
    router.get('/docs', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KeepIt REST API Reference</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 md:p-12 font-sans">
    <div class="max-w-4xl mx-auto">
        <header class="border-b border-slate-800 pb-6 mb-8 flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                    <span class="p-2 rounded-xl bg-slate-800 border border-slate-700">📝</span> KeepIt REST API v1
                </h1>
                <p class="text-slate-400 mt-2">Programmatically query, create, update, and manage your notes.</p>
            </div>
            <a href="/" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300">Open App</a>
        </header>

        <section class="mb-10 p-5 rounded-2xl bg-slate-850 border border-slate-800">
            <h2 class="text-lg font-bold text-slate-200 mb-2">Authentication</h2>
            <p class="text-sm text-slate-400 mb-4">Pass your personal API key via the HTTP <code class="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400">Authorization</code> or <code class="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400">X-API-Key</code> header:</p>
            <pre class="bg-slate-950 p-3.5 rounded-xl text-xs text-emerald-400 font-mono overflow-x-auto border border-slate-800">Authorization: Bearer keepit_sk_xxxxxxxxxxxxxxxxxxxxxx</pre>
        </section>

        <section class="space-y-6">
            <h2 class="text-xl font-bold text-slate-200">Endpoints</h2>

            <div class="p-5 rounded-xl bg-slate-800/60 border border-slate-750">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GET</span>
                    <code class="font-mono text-sm text-slate-200">/api/v1/notes</code>
                </div>
                <p class="text-xs text-slate-400 mb-3">Query notes with optional filters (<code class="text-sky-300">tag</code>, <code class="text-sky-300">search</code>, <code class="text-sky-300">pinned</code>, <code class="text-sky-300">archived</code>, <code class="text-sky-300">limit</code>).</p>
                <pre class="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">curl -H "Authorization: Bearer YOUR_API_KEY" "https://YOUR_DOMAIN/api/v1/notes?tag=project&limit=20"</pre>
            </div>

            <div class="p-5 rounded-xl bg-slate-800/60 border border-slate-750">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">POST</span>
                    <code class="font-mono text-sm text-slate-200">/api/v1/notes</code>
                </div>
                <p class="text-xs text-slate-400 mb-3">Create a new note with markdown content, tags, and optional reminder.</p>
                <pre class="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">curl -X POST "https://YOUR_DOMAIN/api/v1/notes" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Grocery List",
    "content": "- [ ] Milk\\n- [ ] Coffee",
    "tags": ["groceries", "todo"]
  }'</pre>
            </div>

            <div class="p-5 rounded-xl bg-slate-800/60 border border-slate-750">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">GET</span>
                    <code class="font-mono text-sm text-slate-200">/api/v1/notes/:id</code>
                </div>
                <p class="text-xs text-slate-400 mb-3">Retrieve a single note by document ID or 4-character shortId (e.g. <code class="text-sky-300">::oxbg</code>).</p>
                <pre class="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">curl -H "Authorization: Bearer YOUR_API_KEY" "https://YOUR_DOMAIN/api/v1/notes/oxbg"</pre>
            </div>

            <div class="p-5 rounded-xl bg-slate-800/60 border border-slate-750">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">PATCH</span>
                    <code class="font-mono text-sm text-slate-200">/api/v1/notes/:id</code>
                </div>
                <p class="text-xs text-slate-400 mb-3">Update note fields, or append content using <code class="text-sky-300">appendContent</code>.</p>
                <pre class="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">curl -X PATCH "https://YOUR_DOMAIN/api/v1/notes/oxbg" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"appendContent": "\\n- [ ] Added via API"}'</pre>
            </div>

            <div class="p-5 rounded-xl bg-slate-800/60 border border-slate-750">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">DELETE</span>
                    <code class="font-mono text-sm text-slate-200">/api/v1/notes/:id</code>
                </div>
                <p class="text-xs text-slate-400 mb-3">Move note to trash (or append <code class="text-sky-300">?permanent=true</code> for immediate deletion).</p>
                <pre class="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">curl -X DELETE -H "Authorization: Bearer YOUR_API_KEY" "https://YOUR_DOMAIN/api/v1/notes/oxbg"</pre>
            </div>
        </section>
    </div>
</body>
</html>`);
    });

    // Mount router on multiple compatible paths
    app.use('/v1', router);
    app.use('/api/v1', router);
    app.use('/api', router);
    app.use('/', router);

    return app;
}

module.exports = { createApiApp };
