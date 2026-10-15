const admin = require("firebase-admin");
const { getMessaging: getFirebaseMessaging } = require("firebase-admin/messaging");
const env = require("./env");

let firebaseApp = null;

/**
 * Firebase Admin SDK initialize karo
 * Sirf ek baar initialize hona chahiye
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp; // Already initialized
  }

  try {
    // Private key mein \n ko real newline mein convert karo
    const privateKey = env.firebase.privateKey
      ? env.firebase.privateKey.replace(/\\n/g, "\n")
      : undefined;

    if (
      !env.firebase.projectId ||
      !env.firebase.clientEmail ||
      !privateKey
    ) {
      console.warn(
        "⚠️ Firebase credentials missing in .env — FCM push notifications disabled",
      );
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: privateKey,
      }),
    });

    console.log("✅ Firebase Admin SDK initialized");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    return null;
  }
};

/**
 * Firebase Messaging instance lo
 */
const getMessaging = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }

  if (!firebaseApp) {
    return null;
  }

  try {
    return getFirebaseMessaging();
  } catch (error) {
    console.error("❌ getMessaging failed:", error.message);
    return null;
  }
  //return admin.messaging();
};

module.exports = {
  initializeFirebase,
  getMessaging,
  admin,
};