// ═══════════════════════════════════════════════
//   🎮 دوال الغرف (Realtime DB) — نسخة متعددة اللاعبين
// ═══════════════════════════════════════════════
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// ═══════════════════════════════════════════════
//   Firebase Config
// ═══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyA51jBwJsybOyBa4eW_Q4YDEWOVT5t7pg4",
  authDomain: "football-quiz-4d88c.firebaseapp.com",
  databaseURL: "https://football-quiz-4d88c-default-rtdb.firebaseio.com",
  projectId: "football-quiz-4d88c",
  storageBucket: "football-quiz-4d88c.firebasestorage.app",
  messagingSenderId: "960914713965",
  appId: "1:960914713965:web:50725bc35838586aa87e64"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ═══════════════════════════════════════════════
//   🔑 أدوات مساعدة
// ═══════════════════════════════════════════════
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getCurrentUserInfo() {
  const user = auth.currentUser;
  if (!user) throw new Error('لازم تسجل دخول');
  return {
    uid: user.uid,
    name: user.displayName || user.email || 'لاعب'
  };
}

// ═══════════════════════════════════════════════
//   🆕 إنشاء غرفة
// ═══════════════════════════════════════════════
export async function createRoom(settings) {
  const user = getCurrentUserInfo();

  let roomCode = null;
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode();
    const roomRef = ref(db, `rooms/${code}`);
    const snap = await get(roomRef);
    if (!snap.exists()) {
      roomCode = code;
      break;
    }
  }

  if (!roomCode) throw new Error('مش قادرين نلاقي كود فاضي، جرب تاني');

  const roomData = {
    code: roomCode,
    status: 'waiting',
    createdAt: Date.now(),
    hostUid: user.uid,           // ← مين صاحب الغرفة
    maxPlayers: settings.maxPlayers || 3,   // ← الحد الأقصى
    // اللاعبين كـ map: { uid: { name, score, answers, connected, ready, isHost } }
    players: {
      [user.uid]: {
        uid: user.uid,
        name: user.name,
        score: 0,
        answers: [],
        connected: true,
        ready: false,
        isHost: true,
        joinedAt: Date.now()
      }
    },
    // إعدادات اللعبة
    settings: {
      category: settings.category || 'football',
      topic: settings.topic || '',
      difficulty: settings.difficulty,
      count: settings.count,
      timer: settings.timer
    },
    // الأسئلة (تتولّد من الـ host)
    questions: null,
    currentQuestionIndex: 0,
    suddenDeathCount: 0
  };

  await set(ref(db, `rooms/${roomCode}`), roomData);

  // 🔌 onDisconnect
  const playerRef = ref(db, `rooms/${roomCode}/players/${user.uid}/connected`);
  onDisconnect(playerRef).set(false);

  return roomCode;
}

// ═══════════════════════════════════════════════
//   🚪 دخول غرفة
// ═══════════════════════════════════════════════
export async function joinRoom(roomCode) {
  const user = getCurrentUserInfo();
  const code = roomCode.toUpperCase().trim();

  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);

  if (!snap.exists()) throw new Error('الكود غلط، مفيش غرفة بالكود ده');

  const room = snap.val();

  if (room.status !== 'waiting') {
    throw new Error('الغرفة بدأت بالفعل');
  }

  const players = room.players || {};
  const currentCount = Object.keys(players).length;
  const maxPlayers = room.maxPlayers || 3;

  // لو اللاعب موجود بالفعل (رجع للغرفة)
  if (players[user.uid]) {
    // نحدّث حالته
    await update(ref(db, `rooms/${code}/players/${user.uid}`), {
      connected: true
    });
    // 🔌 onDisconnect
    const playerRef = ref(db, `rooms/${code}/players/${user.uid}/connected`);
    onDisconnect(playerRef).set(false);
    return code;
  }

  // لو الغرفة مليانة
  if (currentCount >= maxPlayers) {
    throw new Error(`الغرفة مليانة (${maxPlayers} لاعبين كحد أقصى)`);
  }

  // نضيف اللاعب
  await update(ref(db, `rooms/${code}/players/${user.uid}`), {
    uid: user.uid,
    name: user.name,
    score: 0,
    answers: [],
    connected: true,
    ready: false,
    isHost: false,
    joinedAt: Date.now()
  });

  // 🔌 onDisconnect
  const playerRef = ref(db, `rooms/${code}/players/${user.uid}/connected`);
  onDisconnect(playerRef).set(false);

  return code;
}

// ═══════════════════════════════════════════════
//   🚪 خروج من الغرفة
// ═══════════════════════════════════════════════
export async function leaveRoom(roomCode) {
  const user = getCurrentUserInfo();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);

  if (!snap.exists()) return;

  const room = snap.val();
  const players = room.players || {};

  // لو صاحب الغرفة → نمسح الغرفة كلها
  if (room.hostUid === user.uid) {
    await remove(roomRef);
    return;
  }

  // لو لاعب عادي → نشيله من القائمة
  await remove(ref(db, `rooms/${roomCode}/players/${user.uid}`));
}

// ═══════════════════════════════════════════════
//   👂 مراقبة الغرفة
// ═══════════════════════════════════════════════
export function watchRoom(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsubscribe = onValue(roomRef, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return unsubscribe;
}

// ═══════════════════════════════════════════════
//   ✅ علامة "جاهز"
// ═══════════════════════════════════════════════
export async function setPlayerReady(roomCode, ready = true) {
  const user = getCurrentUserInfo();
  await set(ref(db, `rooms/${roomCode}/players/${user.uid}/ready`), ready);
}

// ═══════════════════════════════════════════════
//   📝 حفظ الأسئلة
// ═══════════════════════════════════════════════
export async function saveQuestions(roomCode, questions) {
  await update(ref(db, `rooms/${roomCode}`), {
    questions,
    status: 'playing',
    startedAt: Date.now(),
    currentQuestionIndex: 0
  });
}

// ═══════════════════════════════════════════════
//   🎯 تحديث نتيجة لاعب
// ═══════════════════════════════════════════════
export async function updatePlayerScore(roomCode, scoreDelta, answer) {
  const user = getCurrentUserInfo();
  const path = `rooms/${roomCode}/players/${user.uid}`;

  await runTransaction(ref(db, path), (player) => {
    if (!player) return player;
    if (!player.answers) player.answers = [];
    player.answers.push(answer);
    player.score = (player.score || 0) + scoreDelta;
    player.lastAnswerAt = Date.now();
    return player;
  });
}

// ═══════════════════════════════════════════════
//   ➡️ تقدّم للسؤال اللي بعده
// ═══════════════════════════════════════════════
export async function advanceQuestion(roomCode, nextIndex) {
  await update(ref(db, `rooms/${roomCode}`), {
    currentQuestionIndex: nextIndex
  });
}

// ═══════════════════════════════════════════════
//   🏁 إنهاء اللعبة
// ═══════════════════════════════════════════════
export async function finishRoomGame(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    status: 'finished',
    finishedAt: Date.now()
  });
}

// ═══════════════════════════════════════════════
//   🎲 إضافة سؤال Sudden Death
// ═══════════════════════════════════════════════
export async function addSuddenDeathQuestion(roomCode, question) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  await runTransaction(roomRef, (room) => {
    if (!room) return room;
    if (!room.questions) room.questions = [];
    room.questions.push(question);
    room.suddenDeathCount = (room.suddenDeathCount || 0) + 1;
    room.status = 'playing';
    room.finishedAt = null;
    return room;
  });
}

// ═══════════════════════════════════════════════
//   🚀 بدء اللعبة
// ═══════════════════════════════════════════════
export async function startRoomGame(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    status: 'starting',
    startingAt: Date.now()
  });
}

// ═══════════════════════════════════════════════
//   📤 Export
// ═══════════════════════════════════════════════
export { db, auth, ref, get, onValue, remove, update };