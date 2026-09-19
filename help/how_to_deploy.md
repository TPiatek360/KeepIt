# 🚀 How to Deploy the Note App PWA

This guide outlines how to deploy your frontend PWA, backend Cloud Functions, and Firebase rules, along with time-saving tips for everyday development.

---

## 📋 Table of Contents
1. [Standard Deployment (`firebase deploy`)](#-standard-deployment-firebase-deploy)
2. [Selective Deploys (Save Time! ⚡)](#-selective-deploys-save-time-)
3. [Installing Backend NPM Packages](#-installing-backend-npm-packages)
4. [Local Testing with Firebase Emulators](#-local-testing-with-firebase-emulators)
5. [Troubleshooting & Logs](#%EF%B8%8F-troubleshooting--logs)

---

## 🌍 Standard Deployment (`firebase deploy`)

To deploy **everything** (Frontend PWA, Cloud Functions, Security Rules) in one command, open your terminal in the **root directory** (`Note App`) and run:

```powershell
firebase deploy
```

### What this command updates:
* **Frontend Web App (`public/`):** React components, service workers (`sw.js`), main app assets, styles, and icons.
* **Cloud Functions (`functions/`):** Both `onNoteReminderWrite` and `sendPushNotification` backend triggers.
* **Security Rules:** Database configurations (`firestore.rules`) and Cloud Storage configurations (`storage.rules`).

---

## ⚡ Selective Deploys (Save Time!)

Full deployments can take 2 to 5 minutes because Google Cloud compiles and builds container images for Cloud Functions. During active development, you can save significant time by deploying only what has changed.

### A. Deploy Frontend Only (Nearly Instantaneous)
If you only made changes to HTML, React components, CSS, icons, or the service worker inside the `/public` folder, bypass functions entirely:
```powershell
firebase deploy --only hosting
```
*⏱️ **Duration:** ~5 seconds*

### B. Deploy Functions Only
If you only updated your backend scheduling logic in `functions/index.js`:
```powershell
firebase deploy --only functions
```
*⏱️ **Duration:** ~2 to 3 minutes*

#### 💡 Pro-Tip: Target a Specific Function
If you have multiple functions but only changed one, you can save build time by deploying **only that single function** by appending its name with a colon:

* **Deploy only the Scheduler Trigger:**
  ```powershell
  firebase deploy --only functions:onNoteReminderWrite
  ```
  *(Purpose: Listens to Firestore note updates, manages Cloud Tasks, and schedules the exact notification timestamp).*
  
* **Deploy only the Delivery Webhook:**
  ```powershell
  firebase deploy --only functions:sendPushNotification
  ```
  *(Purpose: Triggered securely by Cloud Tasks to fetch FCM tokens and deliver the push notification payload to the user's active devices).*

### C. Deploy Security Rules Only
If you only updated permissions in `firestore.rules` or `storage.rules`:
```powershell
firebase deploy --only firestore:rules
# or
firebase deploy --only storage:rules
```
*⏱️ **Duration:** ~2 seconds*

---

## 📦 Installing Backend NPM Packages

If you ever need to use a new Node.js package in your Cloud Functions (e.g. `axios`, `lodash`):

1. **Navigate into the `functions/` directory:**
   ```powershell
   cd functions
   ```
2. **Install the package:**
   ```powershell
   npm install <package-name>
   ```
   *(This downloads the library and automatically registers it inside `functions/package.json`).*
3. **Return to the root directory:**
   ```powershell
   cd ..
   ```
4. **Deploy the updated functions:**
   ```powershell
   firebase deploy --only functions
   ```

> [!IMPORTANT]
> Never install backend packages from the root directory. They must reside in `functions/package.json` for Google Cloud to compile them successfully.

---

## 🧪 Local Testing with Firebase Emulators

Before deploying live, you can run the entire suite locally (including Firestore, Functions, and Cloud Tasks/Scheduler triggers) to test reminders safely without touching production data:

1. **Start the Local Emulator Suite:**
   ```powershell
   firebase emulators:start
   ```
2. **Open the Emulator Suite Console:**
   Go to [http://127.0.0.1:4000](http://127.0.0.1:4000) in your browser. Here you can inspect local Firestore records, view logs, and trigger functions.
3. **Run your PWA connected to the emulators:**
   Hosting will be running at [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## 🛠️ Troubleshooting & Logs

If your deployment fails or you need to inspect runtime execution (such as seeing if a scheduled reminder successfully dispatched):

* **Inspect live Cloud Function Logs in your terminal:**
  ```powershell
  firebase functions:log
  ```
* **View Logs in Firebase Console:**
  Go to [Firebase Console](https://console.firebase.google.com/project/test-6826a/overview) ➡️ **Build** ➡️ **Functions** ➡️ **Logs**.
* **Clean Artifact Registry:**
  If you ever get container storage alerts, you can manually trigger cleanups or run:
  ```powershell
  firebase deploy --only functions --force
  ```
