import admin from 'firebase-admin';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// Use the service account file present in your scripts folder
const serviceAccountPath = path.join(process.cwd(), 'scripts', 'friendproject1-a2973-firebase-adminsdk-fbsvc-ad5a59c4e4.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: Service account file not found at scripts/1.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize the SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function exportEmails() {
  console.log('Starting comprehensive user export...');
  
  // Use a Map to store unique emails and avoid duplicates
  const emailMap = new Map<string, string>();

  try {
    // 1. Fetch from Firebase Authentication
    console.log('Step 1: Fetching from Firebase Auth...');
    let nextPageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach((userRecord) => {
        if (userRecord.email) {
          emailMap.set(userRecord.email.toLowerCase(), userRecord.displayName || 'N/A');
        }
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    console.log(`Auth users found: ${emailMap.size}`);

    // 2. Fetch from Firestore 'users' collection
    console.log('Step 2: Fetching from Firestore "users" collection...');
    const usersSnap = await db.collection('users').get();
    let firestoreCount = 0;
    
    usersSnap.forEach((doc) => {
      const data = doc.data();
      // Some records might have email in Firestore but not Auth
      if (data.email) {
        const email = data.email.toLowerCase();
        if (!emailMap.has(email)) {
          emailMap.set(email, data.name || 'N/A');
          firestoreCount++;
        }
      }
    });
    console.log(`Additional unique users found in Firestore: ${firestoreCount}`);

    // 3. Fetch from 'attempts' collection (just in case some students aren't in the users table)
    console.log('Step 3: Checking "attempts" for any missing students...');
    const attemptsSnap = await db.collection('attempts').get();
    let attemptCount = 0;
    attemptsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.student_email) {
        const email = data.student_email.toLowerCase();
        if (!emailMap.has(email)) {
          emailMap.set(email, data.student_name || 'N/A');
          attemptCount++;
        }
      }
    });
    console.log(`Additional unique users found in attempts: ${attemptCount}`);

    const finalCount = emailMap.size;
    console.log(`Total unique users collected: ${finalCount}`);

    // Convert Map to Array for Excel
    const finalData = Array.from(emailMap.entries()).map(([email]) => ({
      'Email ID': email
    }));

    // Create Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registered Users");

    // Write to file
    const fileName = 'mailing1.xlsx';
    XLSX.writeFile(workbook, fileName);

    console.log(`Successfully exported ${finalCount} unique emails to ${fileName}`);
    process.exit(0);
  } catch (error) {
    console.error('Error during export:', error);
    process.exit(1);
  }
}

exportEmails();