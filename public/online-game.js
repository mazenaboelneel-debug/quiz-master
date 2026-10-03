// ═══════════════════════════════════════════════
//   🎮 منطق اللعب أونلاين (متعدد اللاعبين)
// ═══════════════════════════════════════════════
import { watchAuth } from './auth.js';
import {
  watchRoom,
  updatePlayerScore,
  advanceQuestion,
  finishRoomGame,
  addSuddenDeathQuestion,
  saveQuestions,
  leaveRoom
} from './rooms.js';
import { showToast } from './errors.js';

// ═══════════════════════════════════════════════
//   الحالة
// ═══════════════════════════════════════════════
let currentUser = null;
let roomCode = null;
let isHost = false;
let room = null;
let roomUnsubscribe = null;
let myScore = 0;
let currentQIndex = -1;
let locked = false;
let questionStartTime = 0;
let timerInterval = null;
let timeLeft = 0;
let myAnswers = [];
let suddenDeathActive = false;
let finished = false;
let generatingQuestions = false;
let advancing = false;    // 🛡️ يمنع الانتقال المتكرر

// ═══════════════════════════════════════════════
//   عناصر الواجهة
// ═══════════════════════════════════════════════
const screens = {
  quiz: document.getElementById('screen-online-quiz'),
  end:  document.getElementById('screen-online-end')
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
//   🔊 أصوات
// ═══════════════════════════════════════════════
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, dur, type = 'sine', vol = 0.2, delay = 0) {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur);
  } catch (e) {}
}

function playCorrect() {
  playTone(523.25, 0.12, 'sine', 0.25, 0);
  playTone(659.25, 0.12, 'sine', 0.25, 0.1);
  playTone(783.99, 0.25, 'sine', 0.3, 0.2);
}
function playWrong() {
  playTone(392, 0.15, 'sawtooth', 0.2, 0);
  playTone(293.66, 0.25, 'sawtooth', 0.2, 0.12);
}
function playWin() {
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) =>
    playTone(f, 0.2, 'sine', 0.25, i * 0.12)
  );
}

// ═══════════════════════════════════════════════
//   🔐 Auth + بدء
// ═══════════════════════════════════════════════
watchAuth(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  roomCode = params.get('room') || localStorage.getItem('currentRoomCode');

  if (!roomCode) {
    showToast('⚠️ مفيش كود غرفة', 'warning');
    setTimeout(() => window.location.href = 'online.html', 1500);
    return;
  }

  showLoading(true, '⏳ جاري الاتصال بالغرفة...');
  roomUnsubscribe = watchRoom(roomCode, onRoomUpdate);
});

// ═══════════════════════════════════════════════
//   👂 مراقب الغرفة
// ═══════════════════════════════════════════════
async function onRoomUpdate(newRoom) {
  if (!newRoom) {
    showToast('⚠️ الغرفة اتقفلت', 'warning');
    setTimeout(() => window.location.href = 'online.html', 1500);
    return;
  }

  room = newRoom;
  isHost = room.hostUid === currentUser.uid;

  const playersArr = Object.values(room.players || {});
  const me = room.players?.[currentUser.uid];

  // نتأكد إننا لسه موجودين
  if (!me) {
    showToast('⚠️ اتشلت من الغرفة', 'warning');
    setTimeout(() => window.location.href = 'online.html', 1500);
    return;
  }

  // نحدّث النقاط
  myScore = me.score || 0;

  document.getElementById('my-name').textContent = me.name;
  document.getElementById('my-score').textContent = myScore;

  // نحدّث شريط اللاعبين
  renderPlayersBar(playersArr);

  // ═══════════ لو الحالة starting → الـ host يولّد الأسئلة ═══════════
  if (room.status === 'starting') {
    if (isHost && !room.questions && !generatingQuestions) {
      generatingQuestions = true;
      generateAndSaveQuestions();
    } else if (!isHost) {
      showLoading(true, '⏳ في انتظار الأسئلة من صاحب الغرفة...');
    }
    return;
  }

  // ═══════════ الحالة playing → نعرض السؤال ═══════════
  if (room.status === 'playing' && room.questions) {
    showLoading(false);

    // السؤال اتغير → نعرضه
    if (room.currentQuestionIndex !== currentQIndex) {
      currentQIndex = room.currentQuestionIndex;
      renderQuestion();
      return;
    }

    // السؤال نفسه — نتحقق لو الكل جاوب
    if (locked && isHost && !advancing) {
      const allAnswered = checkAllAnswered();
      if (allAnswered) {
        await advanceToNextQuestion();
      }
    }
  }

  // ═══════════ الحالة finished → النتيجة ═══════════
  if (room.status === 'finished' && !finished) {
    finished = true;
    showFinalResult();
  }
}

// ═══════════════════════════════════════════════
//   👥 شريط اللاعبين
// ═══════════════════════════════════════════════
function renderPlayersBar(playersArr) {
  const bar = document.getElementById('players-bar');
  if (!bar) return;
  bar.innerHTML = '';

  // نرتب: أنا الأول، بعدين الـ host، بعدين الباقي
  const sorted = [...playersArr].sort((a, b) => {
    if (a.uid === currentUser.uid) return -1;
    if (b.uid === currentUser.uid) return 1;
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });

  sorted.forEach(p => {
    const isMe = p.uid === currentUser.uid;
    const answered = checkPlayerAnswered(p) || (isMe && myAnswers.some(a => a.qIndex === currentQIndex));
    const disconnected = p.connected === false;

    const card = document.createElement('div');
    card.className = 'player-mini-card' +
      (isMe ? ' me' : '') +
      (answered ? ' answered' : '') +
      (disconnected ? ' disconnected' : '');

    card.innerHTML = `
      <span class="p-icon">${p.isHost ? '👑' : (isMe ? '🎮' : '👤')}</span>
      <span class="p-name">${escapeHtml(p.name)}${isMe ? ' (أنت)' : ''}</span>
      <span class="p-score">${p.score || 0}</span>
      <span class="p-status">${disconnected ? '🔌' : (answered ? '✅' : '⏳')}</span>
    `;
    bar.appendChild(card);
  });
}

// ═══════════════════════════════════════════════
//   🆕 توليد الأسئلة
// ═══════════════════════════════════════════════
async function generateAndSaveQuestions() {
  showLoading(true, '⏳ جاري توليد الأسئلة...');
  console.log('🎲 بدء توليد الأسئلة...');

  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: room.settings.category || 'football',
        topic: room.settings.topic || '',
        difficulty: room.settings.difficulty,
        count: room.settings.count
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'فشل التوليد');

    await saveQuestions(roomCode, data.questions);
    console.log('✅ الأسئلة اتحفظت:', data.questions.length);
  } catch (err) {
    console.error('❌ فشل التوليد:', err);
    showToast('❌ فشل توليد الأسئلة: ' + err.message, 'error');
    setTimeout(() => window.location.href = 'online.html', 3000);
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════
//   📺 عرض السؤال
// ═══════════════════════════════════════════════
function renderQuestion() {
  if (!room?.questions) return;

  const q = room.questions[currentQIndex];
  if (!q) return;

  locked = false;
  advancing = false;   // ← إعادة تصفير
  questionStartTime = Date.now();

  document.getElementById('progress').textContent =
    `${currentQIndex + 1}/${room.questions.length}`;
  document.getElementById('question-text').textContent = q.q;
    // 🎨 الصورة حسب القسم
  const cat = room.settings.category || 'football';
  if (cat === 'football' && q.player) {
    setBackgroundImage(`/api/player-image?name=${encodeURIComponent(q.player)}`, 'player');
  } else if (q.keyword || q.player) {
    setBackgroundImage(`/api/category-image?category=${encodeURIComponent(cat)}&keyword=${encodeURIComponent(q.keyword || q.player)}`, 'category');
  }

  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = '';
  document.getElementById('waiting-message')?.classList.add('hidden');

  const answersBox = document.getElementById('answers');
  answersBox.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.textContent = opt;
    btn.addEventListener('click', () => pickAnswer(i, btn));
    answersBox.appendChild(btn);
  });

  startTimer(room.settings.timer);
}

// ═══════════════════════════════════════════════
//   ⏱️ المؤقت
// ═══════════════════════════════════════════════
function startTimer(seconds) {
  stopTimer();

  if (!seconds || seconds <= 0) {
    document.getElementById('timer-bar-wrap')?.classList.add('hidden');
    document.getElementById('timer-text')?.classList.add('hidden');
    return;
  }

  document.getElementById('timer-bar-wrap')?.classList.remove('hidden');
  document.getElementById('timer-text')?.classList.remove('hidden');

  timeLeft = seconds;
  updateTimerUI(seconds, seconds);

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI(timeLeft, seconds);

    if (timeLeft <= 0) {
      stopTimer();
      timeUp();
    }
  }, 1000);
}

function updateTimerUI(current, total) {
  const percent = (current / total) * 100;
  const bar = document.getElementById('timer-bar');
  const txt = document.getElementById('timer-text');

  if (bar) {
    bar.style.width = percent + '%';
    bar.classList.remove('warning', 'danger');
    if (percent <= 25) bar.classList.add('danger');
    else if (percent <= 50) bar.classList.add('warning');
  }
  if (txt) {
    txt.textContent = current + ' ث';
    txt.classList.remove('warning', 'danger');
    if (percent <= 25) txt.classList.add('danger');
    else if (percent <= 50) txt.classList.add('warning');
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ═══════════════════════════════════════════════
//   🎯 اختيار إجابة
// ═══════════════════════════════════════════════
async function pickAnswer(index, btn) {
  if (locked) return;
  locked = true;
  stopTimer();

  const q = room.questions[currentQIndex];
  const isCorrect = index === q.correct;
  const timeTaken = (Date.now() - questionStartTime) / 1000;

  const all = document.querySelectorAll('#answers .answer');
  all.forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add('correct');
    playCorrect();
    document.getElementById('feedback').textContent = '✅ صح! في انتظار باقي اللاعبين...';
    document.getElementById('feedback').className = 'correct';
    myScore += 100;
    document.getElementById('my-score').textContent = myScore;
  } else {
    btn.classList.add('wrong');
    all[q.correct].classList.add('correct');
    playWrong();
    document.getElementById('feedback').textContent = '❌ غلط. في انتظار باقي اللاعبين...';
    document.getElementById('feedback').className = 'wrong';
  }

  myAnswers.push({
    qIndex: currentQIndex,
    picked: index,
    isCorrect,
    timeTaken
  });

  try {
    await updatePlayerScore(roomCode, isCorrect ? 100 : 0, {
      qIndex: currentQIndex,
      picked: index,
      isCorrect,
      timeTaken
    });
  } catch (err) {
    console.error('فشل تحديث النقاط:', err);
  }

  showWaitingForOpponent();
}

// ═══════════════════════════════════════════════
//   ⏰ الوقت خلص
// ═══════════════════════════════════════════════
async function timeUp() {
  if (locked) return;
  locked = true;

  const q = room.questions[currentQIndex];
  const all = document.querySelectorAll('#answers .answer');
  all.forEach(b => b.disabled = true);
  all[q.correct]?.classList.add('correct');

  document.getElementById('feedback').textContent = '⏰ الوقت خلص! في انتظار باقي اللاعبين...';
  document.getElementById('feedback').className = 'wrong';

  myAnswers.push({
    qIndex: currentQIndex,
    picked: -1,
    isCorrect: false,
    timeTaken: room.settings.timer,
    timeout: true
  });

  try {
    await updatePlayerScore(roomCode, 0, {
      qIndex: currentQIndex,
      isCorrect: false,
      timeout: true
    });
  } catch (err) { console.error(err); }

  showWaitingForOpponent();
}

function showWaitingForOpponent() {
  const msg = document.getElementById('waiting-message');
  if (msg) {
    msg.classList.remove('hidden');
    msg.textContent = '⏳ في انتظار باقي اللاعبين...';
  }
}

// ═══════════════════════════════════════════════
//   ✅ هل اللاعب ده جاوب على السؤال الحالي؟
// ═══════════════════════════════════════════════
function checkPlayerAnswered(player) {
  if (!player) return false;
  if (!player.answers) return false;
  return player.answers.some(a => a.qIndex === currentQIndex);
}

// هل الكل جاوب؟
function checkAllAnswered() {
  if (!room?.players) return false;

  const playersArr = Object.values(room.players);
  // نستثني اللي خارجين
  const activePlayers = playersArr.filter(p => p.connected !== false);

  return activePlayers.every(p => {
    // أنا → نتحقق من إجاباتي المحلية الأول
    if (p.uid === currentUser.uid) {
      const localAnswered = myAnswers.some(a => a.qIndex === currentQIndex);
      const firebaseAnswered = checkPlayerAnswered(p);
      return localAnswered || firebaseAnswered;
    }
    // لاعب تاني → من Firebase
    return checkPlayerAnswered(p);
  });
}

// ═══════════════════════════════════════════════
//   ➡️ الانتقال للسؤال اللي بعده (الـ host بس)
// ═══════════════════════════════════════════════
async function advanceToNextQuestion() {
  // 🛡️ نمنع التنفيذ المتكرر
  if (advancing) return;
  advancing = true;

  const nextIndex = currentQIndex + 1;

  if (nextIndex >= room.questions.length) {
    // خلصنا الأسئلة → نتحقق التعادل
    const playersArr = Object.values(room.players || {});
    const scores = playersArr.map(p => p.score || 0);
    const maxScore = Math.max(...scores);
    const topCount = scores.filter(s => s === maxScore).length;

    if (topCount > 1 && !suddenDeathActive) {
      // تعادل → Sudden Death
      suddenDeathActive = true;
      showToast('🤝 تعادل! سؤال إضافي...', 'info', 3000);
      await addSuddenDeath();
      return;
    }

    await finishRoomGame(roomCode);
    return;
  }

  try {
    await advanceQuestion(roomCode, nextIndex);
  } catch (err) {
    console.error('فشل الانتقال:', err);
    advancing = false;   // ← نسمح بالمحاولة تاني
  }
}

// ═══════════════════════════════════════════════
//   🎲 إضافة سؤال Sudden Death
// ═══════════════════════════════════════════════
async function addSuddenDeath() {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: room.settings.category || 'football',
        topic: room.settings.topic || '',
        difficulty: 'صعب',
        count: 1
      })
    });
    const data = await res.json();
    if (data.success && data.questions[0]) {
      await addSuddenDeathQuestion(roomCode, data.questions[0]);
    }
  } catch (err) {
    console.error('فشل Sudden Death:', err);
  }
}

// ═══════════════════════════════════════════════
//   🏁 النتيجة النهائية
// ═══════════════════════════════════════════════
function showFinalResult() {
  stopTimer();
  playWin();

  const playersArr = Object.values(room.players || {});
  const sorted = [...playersArr].sort((a, b) => (b.score || 0) - (a.score || 0));
  const topScore = sorted[0]?.score || 0;
  const topCount = sorted.filter(p => p.score === topScore).length;
  const isTie = topCount > 1;

  const resultsEl = document.getElementById('online-results');
  resultsEl.innerHTML = '';

  const medals = ['🥇', '🥈', '🥉'];

  sorted.forEach((p, i) => {
    const isWinner = !isTie && i === 0;
    const row = document.createElement('div');
    row.className = 'result-row' + (isWinner ? ' winner' : '');

    const medal = medals[i] || `#${i + 1}`;
    const isMe = p.uid === currentUser.uid;

    row.innerHTML = `
      <span class="crown">${isWinner ? '👑' : medal}</span>
      <span class="name">${escapeHtml(p.name)}${isMe ? ' (أنت)' : ''}</span>
      <span class="score">${p.score || 0}</span>
    `;
    resultsEl.appendChild(row);
  });

  // رسالة
  const finalMsg = document.getElementById('online-final-message');
  const myRank = sorted.findIndex(p => p.uid === currentUser.uid);
  const myData = sorted[myRank];

  if (isTie && myData.score === topScore) {
    finalMsg.textContent = `🤝 تعادل! أنت من الفائزين بنتيجة ${myData.score}`;
  } else if (isTie) {
    finalMsg.textContent = `🤝 تعادل بين اللاعبين بـ ${topScore} نقطة`;
  } else if (myRank === 0) {
    finalMsg.textContent = `🎉 فزت! أنت الأول بـ ${myData.score} نقطة`;
  } else if (myRank === 1) {
    finalMsg.textContent = `🥈 المركز الثاني! ${myData.score} نقطة`;
  } else if (myRank === 2) {
    finalMsg.textContent = `🥉 المركز الثالث! ${myData.score} نقطة`;
  } else {
    finalMsg.textContent = `المركز ${myRank + 1} • ${myData.score} نقطة`;
  }

  fireConfetti(myRank === 0 ? 150 : 60);
  showScreen('end');
}

// ═══════════════════════════════════════════════
//   🎊 Confetti
// ═══════════════════════════════════════════════
function fireConfetti(count = 100) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const W = canvas.width, H = canvas.height;

  const colors = ['#00ff9d', '#00b3ff', '#ffd700', '#ff3b5c', '#ff9900', '#a855f7'];
  const pieces = [];

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      gravity: 0.08,
      life: 1
    });
  }

  let frames = 0;
  const maxFrames = 350;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    let active = 0;

    pieces.forEach(p => {
      if (p.life <= 0) return;
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      p.rotation += p.rotationSpeed;
      if (frames > maxFrames * 0.7) p.life -= 0.02;
      if (p.y > H + 50 || p.life <= 0) { p.life = 0; return; }

      active++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    frames++;
    if (active > 0 && frames < maxFrames + 100) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }
  draw();
}

// ═══════════════════════════════════════════════
//   🧹 Escape HTML
// ═══════════════════════════════════════════════
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ═══════════════════════════════════════════════
//   🎨 تعيين صورة الخلفية
// ═══════════════════════════════════════════════
async function setBackgroundImage(url, type) {
  const bgLayer = document.getElementById('bg-layer');
  if (!bgLayer) return;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (data.success && data.image) {
      bgLayer.style.backgroundImage = `url(${data.image})`;
      bgLayer.classList.add('visible');
    } else {
      bgLayer.classList.remove('visible');
    }
  } catch (err) {
    console.warn('⚠️ فشل تحميل الصورة:', err.message);
    bgLayer.classList.remove('visible');
  }
}

// ═══════════════════════════════════════════════
//   🚪 زر الخروج
// ═══════════════════════════════════════════════
document.getElementById('quit-game')?.addEventListener('click', async () => {
  if (!confirm('متأكد إنك عايز تخرج؟')) return;
  try {
    await leaveRoom(roomCode);
  } catch (err) { console.error(err); }
  if (roomUnsubscribe) roomUnsubscribe();
  window.location.href = 'online.html';
});

// ═══════════════════════════════════════════════
//   🔗 الأزرار
// ═══════════════════════════════════════════════
document.getElementById('back-home')?.addEventListener('click', () => {
  if (roomUnsubscribe) roomUnsubscribe();
  window.location.href = 'index.html';
});

document.getElementById('play-again')?.addEventListener('click', () => {
  if (roomUnsubscribe) roomUnsubscribe();
  window.location.href = 'online.html';
});

document.getElementById('player-left-back')?.addEventListener('click', () => {
  if (roomUnsubscribe) roomUnsubscribe();
  window.location.href = 'online.html';
});

window.addEventListener('beforeunload', () => {
  if (roomUnsubscribe) roomUnsubscribe();
});