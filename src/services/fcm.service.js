const { getMessaging } = require("../config/firebase");
const User = require("../models/User");

/**
 * Ek user ko push notification bhejo (saare devices pe)
 * @param {ObjectId} userId - Kisko bhejni hai
 * @param {Object} payload - { title, body, data }
 */
const sendPushToUser = async (userId, { title, body, data = {} }) => {
  try {
    const messaging = getMessaging();

    if (!messaging) {
      console.warn("⚠️ FCM not initialized, skipping push");
      return { skipped: true, reason: "fcm-not-initialized" };
    }

    // User ke saare FCM tokens nikalo
    const user = await User.findById(userId).select("+fcmTokens");

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return { skipped: true, reason: "no-fcm-tokens" };
    }

    const tokens = user.fcmTokens;

    // Saare data values string hone chahiye (FCM requirement)
    const stringifiedData = {};
    for (const key in data) {
      stringifiedData[key] = String(data[key]);
    }

    // Multicast — ek saath multiple tokens pe bhejo
    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      webpush: {
        notification: {
          title: title,
          body: body,
          icon: "/logo192.png",
          badge: "/badge.png",
        },
        fcmOptions: {
          link: data.link || "/",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log(
      `📱 FCM: ${response.successCount} sent, ${response.failureCount} failed (user: ${userId})`,
    );

    // Invalid tokens cleanup
    if (response.failureCount > 0) {
      const invalidTokens = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;

          // Ye errors matlab token ab valid nahi hai
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Invalid tokens DB se hatao
      if (invalidTokens.length > 0) {
        await User.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { $in: invalidTokens } } },
        );

        console.log(
          `🧹 Removed ${invalidTokens.length} invalid FCM token(s) for user ${userId}`,
        );
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    // Push fail hone se main flow fail NAHI hona chahiye
    console.error("❌ FCM send failed:", error.message);
    return { skipped: true, reason: "error", error: error.message };
  }
};

/**
 * Naya FCM token register karo (user ke liye)
 * @param {ObjectId} userId
 * @param {String} token
 */
const registerFcmToken = async (userId, token) => {
  if (!token || typeof token !== "string" || token.trim().length < 10) {
    throw new Error("Invalid FCM token");
  }

  const trimmedToken = token.trim();

  //user fetch krna (fcmtokens explicitly select kro)
  const user = await User.findById(userId).select("+fcmTokens");
  if(!user) {
    throw new Error("User not found");
  }

  // 3. Check karo token already exists?
  const existingTokens = user.fcmTokens || [];
  const alreadyExists = existingTokens.includes(trimmedToken);

  if (alreadyExists) {
    console.log(`ℹ️ FCM token already exists for user ${userId}`);
    return {
      added: false,
      alreadyExisted: true,
      token: trimmedToken,
    };
  }

  // Atomically add token if not already present
  await User.updateOne(
    { _id: userId },
    { $addToSet: { fcmTokens: trimmedToken } }, // $addToSet duplicates avoid karta hai
  );
  console.log(`✅ FCM token added for user ${userId}`);

  return {
    added: true,
    alreadyExisted: false,
    token: trimmedToken,
  };
};

/**
 * FCM token remove karo (logout pe)
 * @param {ObjectId} userId
 * @param {String} token
 */
const removeFcmToken = async (userId, token) => {
  const result = await User.updateOne(
    { _id: userId },
    { $pull: { fcmTokens: token } },
  );

  return { removed: result.modifiedCount > 0 };
};

module.exports = {
  sendPushToUser,
  registerFcmToken,
  removeFcmToken,
};