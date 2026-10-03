// ═══════════════════════════════════════════════
//   🌐 منطق اللوبي (متعدد اللاعبين)
// ═══════════════════════════════════════════════
import { watchAuth, logout } from './auth.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  watchRoom,
  setPlayerReady,
  startRoomGame
} from './rooms.js';
import { showToast, showErrorModal } from './errors.js';

// ═══════════════════════════════════════════════
//   الحالة
// ═══════════════════════════════════════════════
let currentUser = null;
let currentRoomCode = null;
let isHost = false;
let roomUnsubscribe = null;

let roomSettings = {
  category: 'football',
  topic: '',
  difficulty: 'متوسط',
  count: 5,
  timer: 20,
  maxPlayers: 3
};

// ═══════════════════════════════════════
//   🎯 الـ chips حسب القسم
// ═══════════════════════════════════════
const TOPIC_CHIPS = {
  football: [
    { t: 'ميسي ورونالدو', i: '🐐' },
    { t: 'كأس العالم', i: '🏆' },
    { t: 'دوري أبطال أوروبا', i: '⭐' },
    { t: 'الدوري الإنجليزي', i: '🦁' },
    { t: 'منتخب مصر', i: '🇪🇬' }
  ],
  movies: [
    { t: 'أفلام مارفل', i: '🦸' },
    { t: 'أفلام مصرية', i: '🎭' },
    { t: 'أفلام الأوسكار', i: '🏆' },
    { t: 'أفلام خيال علمي', i: '🚀' }
  ],
  series: [
    { t: 'مسلسلات مصرية', i: '🇪🇬' },
    { t: 'مسلسلات رمضان', i: '🌙' },
    { t: 'مسلسلات أجنبية', i: '🌍' },
    { t: 'مسلسلات تركية', i: '🇹🇷' }
  ],
  general: [
    { t: 'عواصم الدول', i: '🏛️' },
    { t: 'أطول أنهار', i: '🌊' },
    { t: 'معالم سياحية', i: '🗼' },
    { t: 'عجائب الدنيا', i: '🌍' }
  ],
  science: [
    { t: 'الكواكب', i: '🪐' },
    { t: 'جسم الإنسان', i: '🧬' },
    { t: 'الفضاء', i: '🚀' },
    { t: 'الاختراعات', i: '💡' }
  ],
  history: [
    { t: 'الحضارة المصرية', i: '🏛️' },
    { t: 'الحروب العالمية', i: '⚔️' },
    { t: 'الفتوحات الإسلامية', i: '🕌' },
    { t: 'شخصيات تاريخية', i: '👤' }
  ],
  music: [
    { t: 'أم كلثوم', i: '🎤' },
    { t: 'عبد الحليم', i: '🎙️' },
    { t: 'موسيقى عربية', i: '🎵' },
    { t: 'فنانون عالميون', i: '🌍' }
  ],
  tech: [
    { t: 'شركات التكنولوجيا', i: '🏢' },
    { t: 'الذكاء الاصطناعي', i: '🤖' },
    { t: 'البرمجة', i: '💻' },
    { t: 'الإنترنت', i: '🌐' }
  ],
  sports: [
    { t: 'كرة السلة', i: '🏀' },
    { t: 'التنس', i: '🎾' },
    { t: 'الأولمبياد', i: '🏅' },
    { t: 'الملاكمة', i: '🥊' }
  ],
  religion: [
    { t: 'الأنبياء', i: '🕌' },
    { t: 'الصحابة', i: '⭐' },
    { t: 'السيرة النبوية', i: '📖' },
    { t: 'القرآن الكريم', i: '📗' }
  ]
};

// ═══════════════════════════════════════
//   🎯 رندر chips
// ═══════════════════════════════════════
function renderRoomTopicChips(category) {
  const chipsContainer = document.getElementById('room-topic-chips');
  if (!chipsContainer) return;

  const chips = TOPIC_CHIPS[category] || [];
  chipsContainer.innerHTML = '';

  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.topic = chip.t;
    btn.textContent = `${chip.i} ${chip.t}`;
    btn.addEventListener('click', () => {
      document.getElementById('room-topic').value = chip.t;
      roomSettings.topic = chip.t;
    });
    chipsContainer.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════
//   عناصر الواجهة
// ═══════════════════════════════════════════════
const screens = {
  choice:       document.getElementById('screen-online-choice'),
  roomSettings: document.getElementById('screen-room-settings'),
  join:         document.getElementById('screen-join'),
  lobby:        document.getElementById('screen-lobby')
};

function showScreen(key) {
  Object.values(screens).forEach(s => s?.classList.remove('active'));
  screens[key]?.classList.add('active');
}

function showLoading(show, text) {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.toggle('hidden', !show);
  if (text) document.getElementById('loading-text').textContent = text;
}

// ═══════════════════════════════════════════════
//   🔐 Auth
// ═══════════════════════════════════════════════
watchAuth(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  try { await user.reload(); } catch (e) {}
  currentUser = user;
  document.getElementById('user-name').textContent =
    user.displayName || user.email;
});

// ═══════════════════════════════════════════════
//   🆕 إنشاء غرفة
// ═══════════════════════════════════════════════
document.getElementById('btn-create-room').addEventListener('click', () => {
  showScreen('roomSettings');
});

// إعدادات — الصعوبة
document.querySelectorAll('#room-difficulty .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#room-difficulty .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    roomSettings.difficulty = btn.dataset.value;
  });
});

// عدد الأسئلة
document.querySelectorAll('#room-count .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#room-count .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    roomSettings.count = parseInt(btn.dataset.value);
  });
});

// مدة السؤال
document.querySelectorAll('#room-timer .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#room-timer .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    roomSettings.timer = parseInt(btn.dataset.value);
  });
});

// عدد اللاعبين ← جديد
document.querySelectorAll('#room-players .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#room-players .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    roomSettings.maxPlayers = parseInt(btn.dataset.value);
  });
});

// 🎯 أزرار الأقسام
document.querySelectorAll('#room-categories .category-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#room-categories .category-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    roomSettings.category = card.dataset.category;
    roomSettings.topic = '';
    const topicEl = document.getElementById('room-topic');
    if (topicEl) topicEl.value = '';
    renderRoomTopicChips(roomSettings.category);
  });
});

// أول مرة
renderRoomTopicChips('football');

// زر رجوع
document.getElementById('room-settings-back').addEventListener('click', () => {
  showScreen('choice');
});

// زر إنشاء الغرفة
document.getElementById('room-settings-create').addEventListener('click', async () => {
  roomSettings.topic = (document.getElementById('room-topic').value || '').trim();
  
  showLoading(true, '⏳ جاري إنشاء الغرفة...');
  try {
    const code = await createRoom(roomSettings);
    currentRoomCode = code;
    isHost = true;
    localStorage.setItem('currentRoomCode', code);

    document.getElementById('lobby-code').textContent = code;
    showScreen('lobby');

    startWatchingRoom(code);
    showToast('✅ تم إنشاء الغرفة', 'success');
  } catch (err) {
    console.error(err);
    showErrorModal('❌ فشل إنشاء الغرفة', err.message);
  } finally {
    showLoading(false);
  }
});

// ═══════════════════════════════════════════════
//   🚪 دخول بكود
// ═══════════════════════════════════════════════
document.getElementById('btn-join-room').addEventListener('click', () => {
  document.getElementById('room-code-input').value = '';
  document.getElementById('join-error').style.display = 'none';
  showScreen('join');
  setTimeout(() => document.getElementById('room-code-input').focus(), 100);
});

document.getElementById('join-back').addEventListener('click', () => {
  showScreen('choice');
});

document.getElementById('room-code-input').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

document.getElementById('join-submit').addEventListener('click', async () => {
  const code = document.getElementById('room-code-input').value.trim();
  const errorEl = document.getElementById('join-error');

  if (code.length < 4) {
    errorEl.textContent = 'اكتب كود صحيح (4 حروف على الأقل)';
    errorEl.style.display = 'block';
    return;
  }

  showLoading(true, '⏳ جاري الدخول...');
  try {
    const actualCode = await joinRoom(code);
    currentRoomCode = actualCode;
    isHost = false;
    localStorage.setItem('currentRoomCode', actualCode);

    document.getElementById('lobby-code').textContent = actualCode;
    showScreen('lobby');

    startWatchingRoom(actualCode);
    showToast('✅ دخلت الغرفة', 'success');
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    showLoading(false);
  }
});

document.getElementById('room-code-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('join-submit').click();
});

// ═══════════════════════════════════════════════
//   👂 مراقبة الغرفة (Lobby)
// ═══════════════════════════════════════════════
function startWatchingRoom(code) {
  if (roomUnsubscribe) roomUnsubscribe();

  roomUnsubscribe = watchRoom(code, async (room) => {
    if (!room) {
      showToast('⚠️ الغرفة اتقفلت', 'warning');
      goBackToChoice();
      return;
    }

    renderLobby(room);

    // ═══════════ الاتنين/التلاتة/الأربعة جاهزين؟ ═══════════
    const playersArr = Object.values(room.players || {});
    const allReady = playersArr.length >= 2 && playersArr.every(p => p.ready);

    if (room.status === 'waiting' && allReady) {
      if (isHost) {
        console.log('🚀 الـ Host بيبدأ اللعبة...');
        try {
          await startRoomGame(code);
        } catch (err) {
          console.error('فشل بدء اللعبة:', err);
        }
      }
      return;
    }

    // ═══════════ اللعبة بدأت → انتقال ═══════════
    if (room.status === 'starting' || room.status === 'playing') {
      console.log('🎮 ننتقل لصفحة اللعب... status =', room.status);
      if (roomUnsubscribe) {
        roomUnsubscribe();
        roomUnsubscribe = null;
      }
      window.location.href = `online-game.html?room=${code}`;
      return;
    }
  });
}

function renderLobby(room) {
  const playersEl = document.getElementById('lobby-players');
  const statusEl = document.getElementById('lobby-status');
  const readyBtn = document.getElementById('lobby-ready');

  playersEl.innerHTML = '';

  const playersArr = Object.values(room.players || {});
  const maxPlayers = room.maxPlayers || 3;

  // نعرض كل اللاعبين
  playersArr.forEach(p => {
    playersEl.appendChild(createPlayerCard(p, p.isHost, p.uid === currentUser?.uid));
  });

  // أماكن فاضية
  for (let i = playersArr.length; i < maxPlayers; i++) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'player-card empty';
    emptyCard.innerHTML = `
      <div class="player-avatar">❓</div>
      <div class="player-info">
        <div class="player-name">في انتظار لاعب ${i + 1}...</div>
        <div class="player-status">شارك الكود</div>
      </div>
    `;
    playersEl.appendChild(emptyCard);
  }

  // حالة الغرفة
  const readyCount = playersArr.filter(p => p.ready).length;
  const totalNeeded = playersArr.length;   // كل اللي دخلوا

  if (playersArr.length < 2) {
    statusEl.textContent = `⏳ في انتظار لاعبين (${playersArr.length}/${maxPlayers})`;
    statusEl.className = 'lobby-status waiting';
  } else if (readyCount === playersArr.length) {
    statusEl.textContent = '🚀 كل اللاعبين جاهزين! بتبدأ اللعبة...';
    statusEl.className = 'lobby-status ready';
  } else {
    statusEl.textContent = `✅ جاهزين ${readyCount}/${playersArr.length} • اضغط "جاهز"`;
    statusEl.className = 'lobby-status';
  }

  // زر الجاهز
  const myInfo = room.players?.[currentUser?.uid];
  if (myInfo) {
    readyBtn.disabled = false;
    if (myInfo.ready) {
      readyBtn.textContent = '⏸️ إلغاء الجاهزية';
      readyBtn.classList.add('is-ready');
    } else {
      readyBtn.textContent = '✅ جاهز';
      readyBtn.classList.remove('is-ready');
    }
  } else {
    readyBtn.disabled = true;
    readyBtn.textContent = '⏳ في انتظار...';
  }
}

function createPlayerCard(player, isHost, isSelf) {
  const card = document.createElement('div');
  card.className = 'player-card' + (isSelf ? ' me' : '') + (player.ready ? ' ready' : '') + (player.connected === false ? ' disconnected' : '');
  const roleLabel = isHost ? '👑 صاحب الغرفة' : '👤 لاعب';
  const statusIcon = player.connected === false ? '🔌 خارج' : (player.ready ? '✅ جاهز' : '⏳ في الانتظار');

  card.innerHTML = `
    <div class="player-avatar">${isSelf ? '🎮' : (isHost ? '👑' : '👤')}</div>
    <div class="player-info">
      <div class="player-name">${escapeHtml(player.name)} ${isSelf ? '(أنت)' : ''}</div>
      <div class="player-status">${roleLabel} • ${statusIcon}</div>
    </div>
  `;
  return card;
}

// ═══════════════════════════════════════════════
//   ✅ زر "جاهز"
// ═══════════════════════════════════════════════
document.getElementById('lobby-ready').addEventListener('click', async () => {
  if (!currentRoomCode) return;
  try {
    const { get, ref, db } = await import('./rooms.js');
    const path = `rooms/${currentRoomCode}/players/${currentUser.uid}/ready`;
    const snap = await get(ref(db, path));
    const currentReady = snap.val() || false;

    await setPlayerReady(currentRoomCode, !currentReady);
  } catch (err) {
    console.error(err);
    showToast('❌ فشل التحديث', 'error');
  }
});

// ═══════════════════════════════════════════════
//   🚪 خروج من الغرفة
// ═══════════════════════════════════════════════
document.getElementById('lobby-leave').addEventListener('click', async () => {
  if (!confirm('متأكد إنك عايز تخرج من الغرفة؟')) return;
  await leaveCurrentRoom();
});

async function leaveCurrentRoom() {
  try {
    if (roomUnsubscribe) {
      roomUnsubscribe();
      roomUnsubscribe = null;
    }
    if (currentRoomCode) {
      await leaveRoom(currentRoomCode);
    }
  } catch (err) { console.error(err); }
  goBackToChoice();
}

function goBackToChoice() {
  currentRoomCode = null;
  isHost = false;
  localStorage.removeItem('currentRoomCode');
  document.getElementById('lobby-code').textContent = '-';
  showScreen('choice');
}

// ═══════════════════════════════════════════════
//   📋 نسخ الكود
// ═══════════════════════════════════════════════
document.getElementById('copy-code').addEventListener('click', async () => {
  const code = document.getElementById('lobby-code').textContent;
  if (!code || code === '-') return;
  try {
    await navigator.clipboard.writeText(code);
    showToast('✅ تم نسخ الكود', 'success', 1500);
  } catch (e) {
    showToast('❌ فشل النسخ', 'error');
  }
});

// ═══════════════════════════════════════════════
//   🚪 زر تسجيل الخروج
// ═══════════════════════════════════════════════
document.getElementById('logout-btn').addEventListener('click', async () => {
  await leaveCurrentRoom();
  if (confirm('متأكد إنك عايز تسجل خروج؟')) {
    await logout();
  }
});

window.addEventListener('beforeunload', () => {
  if (roomUnsubscribe) roomUnsubscribe();
});

// ═══════════════════════════════════════════════
//   Escape HTML
// ═══════════════════════════════════════════════
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}