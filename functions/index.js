const { setGlobalOptions } = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CloudTasksClient } = require("@google-cloud/tasks");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const tasksClient = new CloudTasksClient();

// Queue location configuration
const PROJECT_ID = process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId) || admin.app().options.projectId || "test-6826a";
const LOCATION = "us-central1"; // Update to your Firebase Cloud Functions location
const QUEUE_NAME = "reminder-queue";

// 1. The Scheduler Function (Runs on Firestore Writes)
exports.onNoteReminderWrite = onDocumentWritten("artifacts/keepit-local/users/{uid}/notes/{noteId}", async (event) => {
    const beforeData = event.data.before ? event.data.before.data() : null;
    const afterData = event.data.after ? event.data.after.data() : null;

    const beforeReminder = beforeData?.reminder;
    const afterReminder = afterData?.reminder;

    // Cancel existing task if the reminder was rescheduled or deleted
    if (beforeReminder && beforeReminder !== afterReminder && beforeData.scheduledTaskId) {
        try {
            await tasksClient.deleteTask({ name: beforeData.scheduledTaskId });
        } catch (e) {
            console.log("Task already fired or not found:", e.message);
        }
    }

    // Schedule new task if a reminder is set in the future
    if (afterReminder && afterReminder !== beforeReminder) {
        const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
        const triggerTimeSeconds = new Date(afterReminder).getTime() / 1000;

        // Auto-create queue if it does not exist
        try {
            const locationPath = tasksClient.locationPath(PROJECT_ID, LOCATION);
            await tasksClient.createQueue({
                parent: locationPath,
                queue: { name: queuePath }
            });
            console.log(`Successfully verified/created Cloud Tasks queue: ${QUEUE_NAME}`);
        } catch (e) {
            // Error code 6 is ALREADY_EXISTS in gRPC
            if (e.code === 6 || e.message.includes("AlreadyExists") || e.message.includes("already exists")) {
                console.log(`Cloud Tasks queue ${QUEUE_NAME} already exists.`);
            } else {
                console.error("Warning: Failed to ensure Cloud Tasks queue exists:", e.message);
            }
        }

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/sendPushNotification`,
                body: Buffer.from(JSON.stringify({
                    uid: event.params.uid,
                    noteId: event.params.noteId,
                    title: afterData.title || "Untitled Note"
                })).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
            },
            scheduleTime: { seconds: triggerTimeSeconds }
        };

        const [response] = await tasksClient.createTask({ parent: queuePath, task });

        // Save scheduled Cloud Task ID back to note
        await event.data.after.ref.update({ scheduledTaskId: response.name });
    }
});

// 2. The Delivery Function (Invoked by Cloud Tasks Webhook)
exports.sendPushNotification = onRequest(async (req, res) => {
    const { uid, noteId, title } = req.body;

    // Query the user's active device tokens
    const tokensSnap = await admin.firestore().collection(`artifacts/keepit-local/users/${uid}/fcm_tokens`).get();
    if (tokensSnap.empty) {
        res.status(200).send("No active devices registered for this user.");
        return;
    }

    const messages = [];
    tokensSnap.forEach(doc => {
        const { token } = doc.data();
        messages.push({
            token: token,
            notification: {
                title: "KeepIt Pro Reminder",
                body: `Reminder: ${title}`
            },
            data: { noteId }
        });
    });

    try {
        await admin.messaging().sendEach(messages);
        res.status(200).send("Push notifications sent successfully.");
    } catch (e) {
        console.error("Failed to send push notifications:", e);
        res.status(500).send("Error sending notifications.");
    }
});