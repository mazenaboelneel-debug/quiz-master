// ═══════════════════════════════════════
//   Firebase Config
// ═══════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyA51jBwJsybOyBa4eW_Q4YDEWOVT5t7pg4",
  authDomain: "football-quiz-4d88c.firebaseapp.com",
  databaseURL: "https://football-quiz-4d88c-default-rtdb.firebaseio.com",
  projectId: "football-quiz-4d88c",
  storageBucket: "football-quiz-4d88c.firebasestorage.app",
  messagingSenderId: "960914713965",
  appId: "1:960914713965:web:50725bc35838586aa87e64"
};

// ═══════════════════════════════════════
//   Imports
// ═══════════════════════════════════════
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ═══════════════════════════════════════
//   المصادقة
// ═══════════════════════════════════════
export async function registerWithEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // 1) حدّث الاسم
  await updateProfile(cred.user, { displayName: name });

  // 2) 🔄 أعد تحميل بيانات المستخدم عشان الاسم يظهر فوراً
  await cred.user.reload();

  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function watchAuth(callback) {
  onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ═══════════════════════════════════════
//   Firestore — النتائج
// ═══════════════════════════════════════
export async function saveGameResult(result) {
  const user = auth.currentUser;
  if (!user) throw new Error('لازم تسجل دخول الأول');

  const docRef = await addDoc(collection(db, 'results'), {
    userId: user.uid,
    userName: user.displayName || user.email || 'لاعب',
    ...result,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getUserResults(maxResults = 10) {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'results'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTopResults(maxResults = 10) {
  const q = query(
    collection(db, 'results'),
    orderBy('score', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllUserResults() {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(
    collection(db, 'results'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════
//   ترجمة الأخطاء
// ═══════════════════════════════════════
export function translateAuthError(code) {
  const map = {
    'auth/email-already-in-use':    'الإيميل ده مسجل قبل كده، جرب تسجل دخول',
    'auth/invalid-email':           'صيغة الإيميل غير صحيحة',
    'auth/weak-password':           'كلمة السر ضعيفة (لازم 6 حروف على الأقل)',
    'auth/user-not-found':          'مفيش حساب بالإيميل ده',
    'auth/wrong-password':          'كلمة السر غلط',
    'auth/invalid-credential':      'بيانات الدخول غير صحيحة',
    'auth/too-many-requests':       'محاولات كتير، استنى شوية وجرب تاني',
    'auth/popup-closed-by-user':    'قفلت نافذة Google قبل ما تكمّل',
    'auth/popup-blocked':           'المتصفح منع النافذة، اسمح بالـ popup',
    'auth/network-request-failed':  'مشكلة في النت، جرب تاني'
  };
  return map[code] || 'حصل خطأ، جرب تاني';
}