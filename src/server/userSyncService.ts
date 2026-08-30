/**
 * SafeRoute Firebase Admin User Synchronization Engine
 *
 * Securely lists all user accounts from Firebase Authentication using the
 * Firebase Admin SDK on the backend server, and synchronizes/upserts them
 * into the Firestore `/users/{uid}` collection.
 *
 * Preserves authentic registration timestamps (`creationTime`) and prevents duplicates.
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'saferoute-4020c';
const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || 'adminsafeheaven09@gmail.com').toLowerCase();

/**
 * Ensure Firebase Admin App is initialized
 */
function getAdminInstance() {
  if (!admin.apps.length) {
    try {
      const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_CREDENTIALS;
      if (serviceAccountEnv) {
        const parsedCert = typeof serviceAccountEnv === 'string' && serviceAccountEnv.trim().startsWith('{')
          ? JSON.parse(serviceAccountEnv)
          : serviceAccountEnv;
        admin.initializeApp({
          credential: admin.credential.cert(parsedCert),
          projectId: PROJECT_ID,
        });
      } else {
        admin.initializeApp({
          projectId: PROJECT_ID,
        });
      }
    } catch (err) {
      console.warn('[UserSyncService] Firebase Admin initialize notice:', err);
    }
  }
  return admin;
}

export interface SyncedUserInfo {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  providerId: string;
  createdAt: number;
  lastLoginAt: number;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED';
}

/**
 * Fetch all users from Firebase Authentication and sync into Firestore `/users`
 */
export async function syncAllFirebaseUsersToFirestore(): Promise<{
  success: boolean;
  totalAuthUsers: number;
  syncedCount: number;
  users: SyncedUserInfo[];
  message: string;
}> {
  const firebaseAdmin = getAdminInstance();

  try {
    const authUsers = await firebaseAdmin.auth().listUsers(1000);
    const firestore = firebaseAdmin.firestore();
    const syncedList: SyncedUserInfo[] = [];
    const now = Date.now();

    for (const authUser of authUsers.users) {
      const userRef = firestore.collection('users').doc(authUser.uid);
      const snap = await userRef.get();

      // Extract authentic metadata
      const creationTime = authUser.metadata.creationTime
        ? new Date(authUser.metadata.creationTime).getTime()
        : now;
      const lastSignInTime = authUser.metadata.lastSignInTime
        ? new Date(authUser.metadata.lastSignInTime).getTime()
        : creationTime;

      const primaryProvider =
        authUser.providerData?.[0]?.providerId ||
        (authUser.phoneNumber ? 'phone' : authUser.email ? 'password' : 'password');

      const isUserAdmin =
        Boolean(authUser.customClaims?.admin) ||
        (authUser.email ? authUser.email.toLowerCase() === ADMIN_EMAIL : false);

      const displayName =
        authUser.displayName ||
        (authUser.email ? authUser.email.split('@')[0] : '') ||
        'SafeRoute Registered User';

      const email = authUser.email || undefined;
      const phone = authUser.phoneNumber || undefined;
      const role: 'ADMIN' | 'USER' = isUserAdmin ? 'ADMIN' : 'USER';

      let userDocData: SyncedUserInfo;

      if (snap.exists) {
        const existingData = snap.data() || {};
        userDocData = {
          uid: authUser.uid,
          displayName: existingData.displayName || displayName,
          email: existingData.email || email,
          phone: existingData.phone || phone,
          providerId: existingData.providerId || primaryProvider,
          createdAt: existingData.createdAt || creationTime, // PRESERVE ORIGINAL CREATION TIME
          lastLoginAt: lastSignInTime > (existingData.lastLoginAt || 0) ? lastSignInTime : (existingData.lastLoginAt || creationTime),
          role: existingData.role || role,
          status: existingData.status || 'ACTIVE',
        };

        // Merge/update document safely without overwriting creationTime
        await userRef.set(
          {
            displayName: userDocData.displayName,
            email: userDocData.email || null,
            phone: userDocData.phone || null,
            providerId: userDocData.providerId,
            lastLoginAt: userDocData.lastLoginAt,
            role: userDocData.role,
            updatedAt: now,
          },
          { merge: true }
        );
      } else {
        // Create new profile document for old Firebase Auth account
        userDocData = {
          uid: authUser.uid,
          displayName,
          email,
          phone,
          providerId: primaryProvider,
          createdAt: creationTime,
          lastLoginAt: lastSignInTime,
          role,
          status: 'ACTIVE',
        };

        await userRef.set({
          uid: authUser.uid,
          displayName,
          email: email || null,
          phone: phone || null,
          providerId: primaryProvider,
          createdAt: creationTime,
          lastLoginAt: lastSignInTime,
          role,
          status: 'ACTIVE',
          updatedAt: now,
        });
      }

      syncedList.push(userDocData);
    }

    console.log(`[UserSyncService] Successfully synced ${syncedList.length} users from Firebase Auth to Firestore.`);

    return {
      success: true,
      totalAuthUsers: authUsers.users.length,
      syncedCount: syncedList.length,
      users: syncedList,
      message: `Successfully synchronized ${syncedList.length} registered users from Firebase Authentication.`,
    };
  } catch (err: any) {
    console.error('[UserSyncService] Error synchronizing Firebase Auth users:', err?.message || err);
    return {
      success: false,
      totalAuthUsers: 0,
      syncedCount: 0,
      users: [],
      message: err?.message || 'Failed to sync users from Firebase Auth.',
    };
  }
}
