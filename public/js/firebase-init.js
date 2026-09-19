import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    collectionGroup,
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    setDoc,
    getDoc,
    getDocs,
    enableIndexedDbPersistence,
    writeBatch,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// --- Firebase Initialization ---
const localFirebaseConfig = {
    apiKey: "AIzaSyBjQRbjvhqj1KPPcwbzLT4KNxIcuBCBQt0",
    authDomain: "test-6826a.firebaseapp.com",
    projectId: "test-6826a",
    storageBucket: "test-6826a.firebasestorage.app",
    messagingSenderId: "425820329788",
    appId: "1:425820329788:web:d7007c5b7fffb8fcd57039",
    measurementId: "G-MG5L4VEMHG"
};

const firebaseConfig = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : localFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// Attempt to enable offline persistence
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.log('Persistence failed: Browser not supported');
        }
    });
} catch (e) {
    console.log("Persistence initialization error:", e);
}

const googleProvider = new GoogleAuthProvider();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'keepit-local';

// Expose to window for other scripts
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.googleProvider = googleProvider;
window.GoogleAuthProvider = GoogleAuthProvider;
window.appId = appId;
window.signInWithPopup = signInWithPopup;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.signInWithCustomToken = signInWithCustomToken;
window.messaging = messaging;
window.getToken = getToken;
window.FCM_VAPID_KEY = typeof __fcm_vapid_key !== 'undefined' ? __fcm_vapid_key : (window.FCM_VAPID_KEY || '');

// Firestore functions
window.collection = collection;
window.collectionGroup = collectionGroup;
window.doc = doc;
window.addDoc = addDoc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;
window.onSnapshot = onSnapshot;
window.serverTimestamp = serverTimestamp;
window.query = query;
window.where = where;
window.orderBy = orderBy;
window.limit = limit;
window.startAfter = startAfter;
window.setDoc = setDoc;
window.getDoc = getDoc;
window.getDocs = getDocs;
window.writeBatch = writeBatch;
window.arrayUnion = arrayUnion;

// Storage functions
window.ref = ref;
window.uploadBytes = uploadBytes;
window.getDownloadURL = getDownloadURL;