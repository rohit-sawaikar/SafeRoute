/**
 * SafeRoute Firebase Admin Custom Claims Utility
 *
 * Grants { "admin": true } custom claim to the target administrator account:
 * Email: adminsafeheaven09@gmail.com
 * UID: nYDoCwzmFvf4tagVb17oZWdOyJF2
 *
 * Usage:
 *   npx tsx scripts/setAdminClaim.ts
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_UID = 'nYDoCwzmFvf4tagVb17oZWdOyJF2';
const TARGET_EMAIL = 'adminsafeheaven09@gmail.com';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'saferoute-4020c';

export async function grantAdminCustomClaim(uid: string = TARGET_UID, email: string = TARGET_EMAIL) {
  console.log(`\n======================================================`);
  console.log(`🔐 SafeRoute Firebase Admin Claim Grant Tool`);
  console.log(`Target Project: ${PROJECT_ID}`);
  console.log(`Target Email  : ${email}`);
  console.log(`Target UID    : ${uid}`);
  console.log(`======================================================\n`);

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: PROJECT_ID,
      });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (fetchErr) {
      console.log(`User not found by UID "${uid}", trying email lookup...`);
      userRecord = await admin.auth().getUserByEmail(email);
    }

    const existingClaims = userRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, admin: true };

    await admin.auth().setCustomUserClaims(userRecord.uid, updatedClaims);

    console.log(`✅ SUCCESS! Admin claim assigned successfully.`);
    console.log(`   User UID     : ${userRecord.uid}`);
    console.log(`   User Email   : ${userRecord.email}`);
    console.log(`   Custom Claims:`, JSON.stringify(updatedClaims, null, 2));
    console.log(`\nNote: The user must re-authenticate or refresh their token (getIdToken(true)) to receive the new custom claim.\n`);

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: updatedClaims,
    };
  } catch (err: any) {
    console.error(`⚠️ Notice during claim assignment:`, err?.message || err);
    console.log(`\nIf running in an environment without service-account credentials, deploy the Cloud Function in functions/src/index.ts or set GOOGLE_APPLICATION_CREDENTIALS.\n`);
    return {
      success: false,
      error: err?.message || err,
    };
  }
}

if (process.argv[1]?.includes('setAdminClaim')) {
  grantAdminCustomClaim();
}
