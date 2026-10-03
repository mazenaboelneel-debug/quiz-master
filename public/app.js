// ═══════════════════════════════════════════════
//   Imports
// ═══════════════════════════════════════════════
import { saveGameResult } from './auth.js';
import { showToast, showErrorModal, translateAIError } from './errors.js';

// ═══════════════════════════════════════════════
//   عناصر الواجهة
// ═══════════════════════════════════════════════
const screens = {
  home:       document.getElementById('screen-home'),
  settings:   document.getElementById('screen-settings'),
  namesSolo:  document.getElementById('screen-names-solo'),
  namesDuo:   document.getElementById('screen-names-duo'),
  turn:       document.getElementById('screen-turn'),
  handoff:    document.getElementById('screen-handoff'),
  vsResult:   document.getElementById('screen-vs-result'),
  quiz:       document.getElementById('screen-quiz'),
  end:        document.getElementById('screen-end'),
};

const loadingEl = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');

const soloNameInput = document.getElementById('solo-name');
const p1NameInput   = document.getElementById('p1-name');
const p2NameInput   = document.getElementById('p2-name');
const turnNameEl    = document.getElementById('turn-name');

const currentPlayerEl = document.getElementById('current-player');
const questionText    = document.getElementById('question-text');
const answersBox      = document.getElementById('answers');
const feedback        = document.getElementById('feedback');
const scoreEl         = document.getElementById('score');
const progressEl      = document.getElementById('progress');
const resultsEl       = document.getElementById('results');
const finalMessageEl  = document.getElementById('final-message');

// ⏱️ عناصر المؤقت
const timerBarWrap = document.getElementById('timer-bar-wrap');
const timerBar     = document.getElementById('timer-bar');
const timerText    = document.getElementById('timer-text');

// ═══════════════════════════════════════════════
//   🔊 نظام الأصوات
// ═══════════════════════════════════════════════
let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (err) {
    console.warn('⚠️ فشل تشغيل الصوت:', err.message);
  }
}

function playCorrectSound() {
  playTone(523.25, 0.12, 'sine', 0.25, 0);
  playTone(659.25, 0.12, 'sine', 0.25, 0.1);
  playTone(783.99, 0.25, 'sine', 0.3, 0.2);
}

function playWrongSound() {
  playTone(392.00, 0.15, 'sawtooth', 0.2, 0);
  playTone(293.66, 0.25, 'sawtooth', 0.2, 0.12);
}

function playTimeoutSound() {
  playTone(880, 0.1, 'square', 0.15, 0);
  playTone(880, 0.1, 'square', 0.15, 0.15);
  playTone(440, 0.3, 'square', 0.2, 0.3);
}

function playWinSound() {
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    playTone(freq, 0.2, 'sine', 0.25, i * 0.12);
  });
  playTone(1046.50, 0.6, 'sine', 0.3, 0.5);
}

function playClickSound() {
  playTone(1200, 0.05, 'sine', 0.08, 0);
}

function playTickSound() {
  playTone(1500, 0.03, 'square', 0.06, 0);
}

// ═══════════════════════════════════════════════
//   🎨 إدارة خلفية اللاعب/الصورة
// ═══════════════════════════════════════════════
const bgLayer = document.getElementById('bg-layer');
const imageCache = new Map();

async function setPlayerBackground(playerName, keyword, category) {
  if (!bgLayer) return;

  // لو كورة → نجيب صورة لاعب
  if (category === 'football' && playerName) {
    return await setFootballPlayerImage(playerName);
  }

  // باقي الأقسام → صورة عامة من category-image
  if (keyword || category) {
    return await setCategoryImage(keyword || category, category);
  }

  bgLayer.classList.remove('visible');
}

async function setFootballPlayerImage(playerName) {
  if (imageCache.has(playerName)) {
    const cached = imageCache.get(playerName);
    if (cached) {
      bgLayer.style.backgroundImage = `url(${cached})`;
      bgLayer.classList.add('visible');
    } else {
      bgLayer.classList.remove('visible');
    }
    return;
  }

  try {
    const r = await fetch(`/api/player-image?name=${encodeURIComponent(playerName)}`);
    const data = await r.json();

    if (data.success && data.image) {
      imageCache.set(playerName, data.image);
      bgLayer.style.backgroundImage = `url(${data.image})`;
      bgLayer.classList.add('visible');
    } else {
      imageCache.set(playerName, null);
      bgLayer.classList.remove('visible');
    }
  } catch (err) {
    console.warn('⚠️ فشل تحميل صورة اللاعب:', err.message);
    bgLayer.classList.remove('visible');
  }
}

async function setCategoryImage(keyword, category) {
  const cacheKey = `${category}:${keyword}`;

  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (cached) {
      bgLayer.style.backgroundImage = `url(${cached})`;
      bgLayer.classList.add('visible');
    } else {
      bgLayer.classList.remove('visible');
    }
    return;
  }

  try {
    const r = await fetch(`/api/category-image?category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}`);
    const data = await r.json();

    if (data.success && data.image) {
      imageCache.set(cacheKey, data.image);
      bgLayer.style.backgroundImage = `url(${data.image})`;
      bgLayer.classList.add('visible');
    } else {
      imageCache.set(cacheKey, null);
      bgLayer.classList.remove('visible');
    }
  } catch (err) {
    console.warn('⚠️ فشل تحميل صورة القسم:', err.message);
    bgLayer.classList.remove('visible');
  }
}

// ═══════════════════════════════════════════════
//   الحالة العامة
// ═══════════════════════════════════════════════
let QUESTIONS_PER_PLAYER = 5;

const gameSettings = {
  categories: ['football'],   // ← مصفوفة
  topic: '',
  difficulty: 'متوسط',
  count: 5,
  timer: 20
};

let mode = 'solo';
let players = [];
let activePlayer = 0;
let locked = false;
let paused = false;
let questionStartTime = 0;

// ⏱️ حالة المؤقت
let timerInterval = null;
let timeLeft = 0;
let timerActive = false;

// ⚔️ حالة versus
let versusQuestions = [];
let versusQIndex = 0;
let versusPlayerIndex = 0;
let versusQuestionStartTime = 0;
let versusCurrentAnswers = [];

// ═══════════════════════════════════════════════
//   التنقل بين الشاشات
// ═══════════════════════════════════════════════
function showScreen(key) {
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  });
  if (screens[key]) {
    screens[key].classList.add('active');
  }
}

function showLoading(show, text) {
  if (!loadingEl) return;
  loadingEl.classList.toggle('hidden', !show);
  if (text && loadingText) loadingText.textContent = text;
}

// ═══════════════════════════════════════════════
//   ⏱️ المؤقت
// ═══════════════════════════════════════════════
function startTimer(seconds, onTimeUp) {
  stopTimer();

  if (!seconds || seconds <= 0) {
    if (timerBarWrap) timerBarWrap.classList.add('hidden');
    if (timerText) timerText.classList.add('hidden');
    return;
  }

  if (timerBarWrap) timerBarWrap.classList.remove('hidden');
  if (timerText) timerText.classList.remove('hidden');

  timeLeft = seconds;
  timerActive = true;
  updateTimerUI(seconds, seconds);

  timerInterval = setInterval(() => {
    if (!timerActive) return;
    timeLeft--;
    updateTimerUI(timeLeft, seconds);

    if (timeLeft <= 5 && timeLeft > 0) playTickSound();

    if (timeLeft <= 0) {
      stopTimer();
      onTimeUp();
    }
  }, 1000);
}

function updateTimerUI(current, total) {
  if (!timerBar || !timerText) return;

  const percent = (current / total) * 100;
  timerBar.style.width = percent + '%';
  timerText.textContent = current + ' ث';

  timerBar.classList.remove('warning', 'danger');
  timerText.classList.remove('warning', 'danger');

  if (percent <= 25) {
    timerBar.classList.add('danger');
    timerText.classList.add('danger');
  } else if (percent <= 50) {
    timerBar.classList.add('warning');
    timerText.classList.add('warning');
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerActive = false;
}

// ═══════════════════════════════════════════════
//   جلب أسئلة
// ═══════════════════════════════════════════════
async function fetchQuestions(count) {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: gameSettings.categories,   // ← مصفوفة
        topic: gameSettings.topic,
        difficulty: gameSettings.difficulty,
        count
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'فشل جلب الأسئلة');
    if (!data.questions || data.questions.length === 0) {
      throw new Error('الـ AI رجع صفر أسئلة');
    }

    return data.questions;
  } catch (err) {
    console.error('❌ fetchQuestions error:', err);
    throw new Error(translateAIError(err.message));
  }
}

// ═══════════════════════════════════════════════
//   بدء اللعبة
// ═══════════════════════════════════════════════
async function startGame(names) {
  try {
    QUESTIONS_PER_PLAYER = gameSettings.count;

    const totalNeeded = (mode === 'versus')
      ? gameSettings.count
      : names.length * QUESTIONS_PER_PLAYER;

    showLoading(true, `⏳ جاري توليد ${totalNeeded} سؤال...`);

    const allQuestions = await fetchQuestions(totalNeeded);

    if (allQuestions.length < totalNeeded) {
      throw new Error(`الـ AI ولّد ${allQuestions.length} سؤال بس بدل ${totalNeeded}`);
    }

    if (mode === 'versus') {
      versusQuestions = allQuestions;
      versusQIndex = 0;
      versusPlayerIndex = 0;
      versusCurrentAnswers = [];

      players = names.map(name => ({
        name,
        score: 0,
        answers: []
      }));

      showHandoffScreen();
      return;
    }

    players = names.map((name, i) => ({
      name,
      questions: allQuestions.slice(
        i * QUESTIONS_PER_PLAYER,
        (i + 1) * QUESTIONS_PER_PLAYER
      ),
      currentIndex: 0,
      score: 0,
      answers: []
    }));

    activePlayer = 0;

    if (mode === 'solo') {
      startPlayerTurn();
    } else {
      showTurnScreen();
    }
  } catch (err) {
    showLoading(false);
    showErrorModal(
      '❌ فشل توليد الأسئلة',
      err.message || 'حصل خطأ غير متوقع',
      () => startGame(names)
    );
    showScreen('home');
    return;
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════
//   شاشة تبديل الدور
// ═══════════════════════════════════════════════
function showTurnScreen() {
  stopTimer();
  turnNameEl.textContent = players[activePlayer].name;
  showScreen('turn');
}

function startPlayerTurn() {
  stopTimer();
  const p = players[activePlayer];
  p.currentIndex = 0;
  currentPlayerEl.textContent = p.name;
  scoreEl.textContent = '0';
  showScreen('quiz');
  renderQuestion();
}

// ═══════════════════════════════════════════════
//   عرض السؤال
// ═══════════════════════════════════════════════
function renderQuestion() {
  paused = false;
  locked = false;
  questionStartTime = Date.now();

  const p = players[activePlayer];
  if (!p) return;

  const q = p.questions[p.currentIndex];
  if (!q) return;

  questionText.textContent = q.q;
  progressEl.textContent = `${p.currentIndex + 1}/${p.questions.length}`;
  scoreEl.textContent = p.score;

  // 🎨 الصورة حسب القسم (q.category للقسم الحالي)
  const currentCategory = q.category || gameSettings.categories[0] || 'football';
  if (currentCategory === 'football' && q.player) {
    setPlayerBackground(q.player, null, 'football');
  } else if (q.keyword || q.player) {
    setPlayerBackground(q.player, q.keyword, currentCategory);
  }

  feedback.textContent = '';
  feedback.className = '';

  answersBox.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.textContent = opt;
    btn.addEventListener('click', () => pickAnswer(i, btn));
    answersBox.appendChild(btn);
  });

  startTimer(gameSettings.timer, () => timeUp());
}

// ═══════════════════════════════════════════════
//   اختيار إجابة
// ═══════════════════════════════════════════════
function pickAnswer(index, btn) {
  if (locked) return;
  locked = true;
  stopTimer();

  const p = players[activePlayer];
  if (!p) return;

  const q = p.questions[p.currentIndex];
  if (!q) return;

  const all = answersBox.querySelectorAll('.answer');
  all.forEach(b => b.disabled = true);

  const timeTaken = (Date.now() - questionStartTime) / 1000;
  const isCorrect = index === q.correct;
  p.answers.push({ q: q.q, picked: index, correct: q.correct, isCorrect, timeTaken });

  if (isCorrect) {
    btn.classList.add('correct');
    p.score += 100;
    scoreEl.textContent = p.score;
    feedback.textContent = '✅ صح! ' + (q.explain || '');
    feedback.className = 'correct';
    playCorrectSound();
  } else {
    btn.classList.add('wrong');
    all[q.correct].classList.add('correct');
    feedback.textContent = '❌ غلط. ' + (q.explain || '');
    feedback.className = 'wrong';
    playWrongSound();
  }

  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    paused = false;

    p.currentIndex++;
    if (p.currentIndex < p.questions.length) {
      renderQuestion();
    } else {
      finishPlayerTurn();
    }
  };

  addExplainButton(q, index, advance);

  paused = false;
  setTimeout(() => {
    if (!paused) advance();
  }, 2800);
}

// ═══════════════════════════════════════════════
//   ⏰ الوقت خلص
// ═══════════════════════════════════════════════
function timeUp() {
  if (locked) return;
  locked = true;
  playTimeoutSound();

  const p = players[activePlayer];
  if (!p) return;

  const q = p.questions[p.currentIndex];
  if (!q) return;

  const all = answersBox.querySelectorAll('.answer');
  all.forEach(b => b.disabled = true);
  if (all[q.correct]) all[q.correct].classList.add('correct');

  p.answers.push({
    q: q.q,
    picked: -1,
    correct: q.correct,
    isCorrect: false,
    timeout: true,
    timeTaken: gameSettings.timer || 20
  });

  feedback.textContent = '⏰ الوقت خلص! الإجابة الصح اتوضحت فوق';
  feedback.className = 'wrong';

  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    paused = false;

    p.currentIndex++;
    if (p.currentIndex < p.questions.length) {
      renderQuestion();
    } else {
      finishPlayerTurn();
    }
  };

  addExplainButton(q, -1, advance);

  paused = false;
  setTimeout(() => {
    if (!paused) advance();
  }, 3200);
}

// ═══════════════════════════════════════════════
//   🤖 زر "اشرحلي أكتر"
// ═══════════════════════════════════════════════
function addExplainButton(q, userIndex, autoAdvance) {
  const btn = document.createElement('button');
  btn.className = 'btn-ghost btn-small';
  btn.textContent = '🤖 اشرحلي أكتر';
  btn.style.marginTop = '12px';

  btn.addEventListener('click', async () => {
    playClickSound();
    paused = true;
    btn.disabled = true;
    btn.textContent = '⏳ جاري الشرح...';

    try {
      const r = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.q,
          correctAnswer: q.options[q.correct],
          userAnswer: userIndex >= 0 ? q.options[userIndex] : null
        })
      });

      const d = await r.json();

      if (d.success) {
        const explainDiv = document.createElement('div');
        explainDiv.className = 'ai-explain';
        explainDiv.textContent = '🤖 ' + d.explain;
        feedback.appendChild(explainDiv);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-primary';
        nextBtn.textContent = '➡️ السؤال التالي';
        nextBtn.style.marginTop = '12px';
        nextBtn.addEventListener('click', () => {
          playClickSound();
          paused = false;
          autoAdvance();
        });

        btn.replaceWith(nextBtn);
      } else {
        btn.textContent = '❌ فشل، جرب تاني';
        btn.disabled = false;
        paused = false;
      }
    } catch (err) {
      console.error('❌ Explain error:', err);
      btn.textContent = '❌ فشل، جرب تاني';
      btn.disabled = false;
      paused = false;
    }
  });

  feedback.appendChild(btn);
}

// ═══════════════════════════════════════════════
//   انتهاء دور لاعب
// ═══════════════════════════════════════════════
function finishPlayerTurn() {
  if (mode === 'solo') {
    endGame();
    return;
  }

  activePlayer++;
  if (activePlayer < players.length) {
    showTurnScreen();
  } else {
    endGame();
  }
}

// ═══════════════════════════════════════════════
//   شاشة النتيجة
// ═══════════════════════════════════════════════
function endGame() {
  if (mode === 'versus') {
    endVersusGame();
    return;
  }

  stopTimer();
  setTimeout(() => playWinSound(), 300);

  const maxScore = QUESTIONS_PER_PLAYER * 100;
  resultsEl.innerHTML = '';

  if (mode === 'solo') {
    const p = players[0];
    resultsEl.innerHTML = `
      <div class="result-row winner">
        <span class="crown">🏆</span>
        <span class="name">${escapeHtml(p.name)}</span>
        <span class="score">${p.score} / ${maxScore}</span>
      </div>
    `;
    finalMessageEl.textContent = getMessage(p.score, maxScore);
  } else {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isTie = sorted[0].score === sorted[1].score;

    sorted.forEach(p => {
      const isWinner = !isTie && p === winner;
      const row = document.createElement('div');
      row.className = 'result-row' + (isWinner ? ' winner' : '');
      row.innerHTML = `
        <span class="crown">${isWinner ? '👑' : ''}</span>
        <span class="name">${escapeHtml(p.name)}</span>
        <span class="score">${p.score} / ${maxScore}</span>
      `;
      resultsEl.appendChild(row);
    });

    if (isTie) {
      finalMessageEl.textContent = `🤝 تعادل! الاتنين ${winner.score} نقطة`;
    } else {
      finalMessageEl.textContent = `🎉 الفائز: ${winner.name} بفارق ${winner.score - sorted[1].score} نقطة`;
    }
  }

  displayStars();
  displayGameStats();
  setupShare();
  saveResultToDB();
  showScreen('end');
  setTimeout(() => playCelebrationEffects(), 300);
}

function getMessage(score, max) {
  if (score === max) return '🏆 أسطورة! كل الإجابات صح!';
  if (score >= max * 0.7) return '🔥 ممتاز! معلوماتك قوية جداً';
  if (score >= max * 0.4) return '👍 كويس، بس ينفع تبقى أحسن';
  return '💪 محتاج تتدرب شوية';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ═══════════════════════════════════════════════
//   💾 حفظ النتيجة
// ═══════════════════════════════════════════════
async function saveResultToDB() {
  if (mode === 'versus') return;

  try {
    const maxScore = QUESTIONS_PER_PLAYER * 100;

    const buildResult = (p) => {
      const times = p.answers
        .filter(a => typeof a.timeTaken === 'number' && a.timeTaken > 0)
        .map(a => a.timeTaken);
      const avgTime = times.length > 0
        ? parseFloat((times.reduce((s, t) => s + t, 0) / times.length).toFixed(1))
        : 0;

      return {
        playerName: p.name,
        score: p.score,
        maxScore,
        correct: p.answers.filter(a => a.isCorrect).length,
        wrong: p.answers.filter(a => !a.isCorrect && !a.timeout).length,
        timeouts: p.answers.filter(a => a.timeout).length,
        totalQuestions: p.questions.length,
        avgTime,
        category: gameSettings.categories.join(','),
        topic: gameSettings.topic || 'عام',
        difficulty: gameSettings.difficulty,
        mode
      };
    };

    if (mode === 'solo') {
      await saveGameResult(buildResult(players[0]));
    } else {
      for (const p of players) {
        await saveGameResult(buildResult(p));
      }
    }

    console.log('✅ تم حفظ النتيجة');
  } catch (err) {
    console.error('❌ فشل حفظ النتيجة:', err);
  }
}

// ═══════════════════════════════════════════════
//   ⚔️ versus
// ═══════════════════════════════════════════════
function showHandoffScreen() {
  stopTimer();
  const qNum = versusQIndex + 1;
  const playerName = players[versusPlayerIndex].name;

  document.getElementById('handoff-q-number').textContent = qNum;
  document.getElementById('handoff-player-name').textContent = playerName;

  showScreen('handoff');
}

function startVersusQuestion() {
  stopTimer();
  locked = false;
  paused = false;
  questionStartTime = Date.now();

  const q = versusQuestions[versusQIndex];
  const player = players[versusPlayerIndex];

  currentPlayerEl.textContent = player.name;
  scoreEl.textContent = player.score;
  progressEl.textContent = `${versusQIndex + 1}/${versusQuestions.length}`;

  questionText.textContent = q.q;

  // 🎨 الصورة حسب القسم (q.category للقسم الحالي)
  const currentCategory = q.category || gameSettings.categories[0] || 'football';
  if (currentCategory === 'football' && q.player) {
    setPlayerBackground(q.player, null, 'football');
  } else if (q.keyword || q.player) {
    setPlayerBackground(q.player, q.keyword, currentCategory);
  }

  feedback.textContent = '';
  feedback.className = '';

  answersBox.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.textContent = opt;
    btn.addEventListener('click', () => pickVersusAnswer(i, btn));
    answersBox.appendChild(btn);
  });

  versusQuestionStartTime = Date.now();
  showScreen('quiz');

  startTimer(gameSettings.timer, () => versusTimeUp());
}

function pickVersusAnswer(index, btn) {
  if (locked) return;
  locked = true;
  stopTimer();

  const q = versusQuestions[versusQIndex];
  const timeTaken = (Date.now() - versusQuestionStartTime) / 1000;
  const isCorrect = index === q.correct;

  const all = answersBox.querySelectorAll('.answer');
  all.forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add('correct');
    playCorrectSound();
    feedback.textContent = '✅ صح!';
    feedback.className = 'correct';
  } else {
    btn.classList.add('wrong');
    all[q.correct].classList.add('correct');
    playWrongSound();
    feedback.textContent = '❌ غلط';
    feedback.className = 'wrong';
  }

  versusCurrentAnswers.push({
    playerIndex: versusPlayerIndex,
    picked: index,
    isCorrect,
    timeTaken,
    timeout: false
  });

  setTimeout(() => moveToNextVersusPlayer(), 1500);
}

function versusTimeUp() {
  if (locked) return;
  locked = true;
  playTimeoutSound();

  const q = versusQuestions[versusQIndex];
  const all = answersBox.querySelectorAll('.answer');
  all.forEach(b => b.disabled = true);
  if (all[q.correct]) all[q.correct].classList.add('correct');

  feedback.textContent = '⏰ الوقت خلص!';
  feedback.className = 'wrong';

  versusCurrentAnswers.push({
    playerIndex: versusPlayerIndex,
    picked: -1,
    isCorrect: false,
    timeTaken: gameSettings.timer,
    timeout: true
  });

  setTimeout(() => moveToNextVersusPlayer(), 1500);
}

function moveToNextVersusPlayer() {
  versusPlayerIndex++;
  if (versusPlayerIndex < players.length) {
    showHandoffScreen();
  } else {
    showVersusResult();
  }
}

function showVersusResult() {
  const q = versusQuestions[versusQIndex];

  document.getElementById('vs-question-text').textContent = q.q;
  document.getElementById('vs-correct-answer').textContent =
    '✅ الإجابة الصح: ' + q.options[q.correct];

  const correctAnswers = versusCurrentAnswers.filter(a => a.isCorrect);
  let fastestTime = Infinity;
  if (correctAnswers.length > 0) {
    fastestTime = Math.min(...correctAnswers.map(a => a.timeTaken));
  }

  const list = document.getElementById('vs-results-list');
  list.innerHTML = '';

  versusCurrentAnswers.forEach(ans => {
    const player = players[ans.playerIndex];
    let points = 0;
    let badge = '❌';
    let speedBonus = false;

    if (ans.isCorrect) {
      points = 100;
      badge = '✅';
      if (ans.timeTaken === fastestTime && correctAnswers.length > 0) {
        points += 50;
        speedBonus = true;
      }
      player.score += points;
      player.answers.push({ q: q.q, isCorrect: true, points });
    } else {
      player.answers.push({ q: q.q, isCorrect: false, points: 0 });
    }

    const row = document.createElement('div');
    row.className = 'vs-result-row ' + (ans.isCorrect ? 'correct' : 'wrong');
    row.innerHTML = `
      <span class="vs-name">
        <span class="vs-badge">${badge}</span>
        ${escapeHtml(player.name)}
        ${speedBonus ? '<span class="speed-bonus">⚡ أسرع</span>' : ''}
      </span>
      <span class="vs-points ${points === 0 ? 'zero' : ''}">${points > 0 ? '+' + points : '0'}</span>
    `;
    list.appendChild(row);
  });

  if (correctAnswers.length > 0) playCorrectSound();
  else playWrongSound();

  showScreen('vsResult');
}

function nextVersusQuestion() {
  versusQIndex++;
  versusPlayerIndex = 0;
  versusCurrentAnswers = [];

  if (versusQIndex < versusQuestions.length) {
    showHandoffScreen();
  } else {
    endVersusGame();
  }
}

function endVersusGame() {
  stopTimer();
  setTimeout(() => playWinSound(), 300);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isTie = sorted[0].score === sorted[1].score;

  resultsEl.innerHTML = '';
  sorted.forEach(p => {
    const isWinner = !isTie && p === winner;
    const row = document.createElement('div');
    row.className = 'result-row' + (isWinner ? ' winner' : '');
    row.innerHTML = `
      <span class="crown">${isWinner ? '👑' : ''}</span>
      <span class="name">${escapeHtml(p.name)}</span>
      <span class="score">${p.score}</span>
    `;
    resultsEl.appendChild(row);
  });

  if (isTie) {
    finalMessageEl.textContent = `🤝 تعادل! الاتنين ${winner.score} نقطة`;
  } else {
    finalMessageEl.textContent = `🎉 الفائز: ${winner.name} بفارق ${winner.score - sorted[1].score} نقطة`;
  }

  displayStars();
  displayGameStats();
  setupShare();
  saveVersusResults();
  showScreen('end');
  setTimeout(() => playCelebrationEffects(), 300);
}

async function saveVersusResults() {
  try {
    for (const p of players) {
      await saveGameResult({
        playerName: p.name,
        score: p.score,
        maxScore: versusQuestions.length * 150,
        correct: p.answers.filter(a => a.isCorrect).length,
        wrong: p.answers.filter(a => !a.isCorrect).length,
        timeouts: 0,
        totalQuestions: versusQuestions.length,
        category: gameSettings.category,
        topic: gameSettings.topic || 'عام',
        difficulty: gameSettings.difficulty,
        mode: 'versus'
      });
    }
  } catch (err) {
    console.error('❌ فشل حفظ نتائج versus:', err);
  }
}

// ═══════════════════════════════════════════════
//   📊 الإحصائيات
// ═══════════════════════════════════════════════
function calculateGameStats(answers) {
  if (!answers || answers.length === 0) {
    return { fastest: null, slowest: null, avg: 0, streak: 0, correct: 0, wrong: 0, timeout: 0 };
  }

  const times = answers.filter(a => typeof a.timeTaken === 'number' && a.timeTaken > 0).map(a => a.timeTaken);
  const fastest = times.length > 0 ? Math.min(...times) : null;
  const slowest = times.length > 0 ? Math.max(...times) : null;
  const avg = times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0;

  let streak = 0, maxStreak = 0;
  answers.forEach(a => {
    if (a.isCorrect) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else streak = 0;
  });

  const correct = answers.filter(a => a.isCorrect).length;
  const timeout = answers.filter(a => a.timeout).length;
  const wrong = answers.length - correct - timeout;

  return {
    fastest: fastest !== null ? fastest.toFixed(1) : null,
    slowest: slowest !== null ? slowest.toFixed(1) : null,
    avg: avg.toFixed(1),
    streak: maxStreak,
    correct, wrong, timeout
  };
}

function displayGameStats() {
  const allAnswers = players.flatMap(p => p.answers || []);
  const stats = calculateGameStats(allAnswers);

  const elFastest = document.getElementById('stat-fastest');
  if (elFastest) elFastest.textContent = stats.fastest ? stats.fastest + ' ث' : '-';

  const elSlowest = document.getElementById('stat-slowest');
  if (elSlowest) elSlowest.textContent = stats.slowest ? stats.slowest + ' ث' : '-';

  const elAvg = document.getElementById('stat-avg');
  if (elAvg) elAvg.textContent = stats.avg > 0 ? stats.avg + ' ث' : '-';

  const elStreak = document.getElementById('stat-streak');
  if (elStreak) elStreak.textContent = stats.streak + ' 🔥';

  const bdC = document.getElementById('bd-correct');
  const bdW = document.getElementById('bd-wrong');
  const bdT = document.getElementById('bd-timeout');
  if (bdC) bdC.textContent = stats.correct;
  if (bdW) bdW.textContent = stats.wrong;
  if (bdT) bdT.textContent = stats.timeout;
}

// ═══════════════════════════════════════════════
//   ⭐ النجوم
// ═══════════════════════════════════════════════
function displayStars() {
  const allAnswers = players.flatMap(p => p.answers || []);
  const total = allAnswers.length;
  const correct = allAnswers.filter(a => a.isCorrect).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  let stars = 0;
  if (accuracy >= 80) stars = 3;
  else if (accuracy >= 50) stars = 2;
  else if (accuracy >= 20) stars = 1;

  for (let i = 1; i <= 3; i++) {
    const starEl = document.getElementById('star-' + i);
    if (!starEl) continue;
    starEl.classList.remove('active');
    if (i <= stars) {
      setTimeout(() => {
        starEl.classList.add('active');
        playTone(800 + i * 200, 0.15, 'sine', 0.15);
      }, i * 200);
    }
  }
}

// ═══════════════════════════════════════════════
//   🎉 الاحتفال
// ═══════════════════════════════════════════════
function playCelebrationEffects() {
  const allAnswers = players.flatMap(p => p.answers || []);
  const total = allAnswers.length;
  const correct = allAnswers.filter(a => a.isCorrect).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  let confettiCount = 0;
  if (accuracy >= 100) confettiCount = 200;
  else if (accuracy >= 70) confettiCount = 120;
  else if (accuracy >= 40) confettiCount = 60;

  if (confettiCount > 0) fireConfetti(confettiCount);
  if (accuracy >= 100) setTimeout(() => playPerfectFanfare(), 200);
}

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
      x: Math.random() * W, y: -20 - Math.random() * H,
      w: 6 + Math.random() * 8, h: 8 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      gravity: 0.08, life: 1
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
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frames++;
    if (active > 0 && frames < maxFrames + 100) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, W, H);
  }
  draw();
}

function playPerfectFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
  notes.forEach((freq, i) => playTone(freq, 0.15, 'triangle', 0.2, i * 0.08));
}

// ═══════════════════════════════════════════════
//   📤 المشاركة
// ═══════════════════════════════════════════════
function buildShareText() {
  const allAnswers = players.flatMap(p => p.answers || []);
  const total = allAnswers.length;
  const correct = allAnswers.filter(a => a.isCorrect).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topPlayer = sorted[0];

  let text = `🎯 *Quiz Master*\n\n`;

  if (mode === 'solo') {
    text += `🏆 اللاعب: ${topPlayer.name}\n`;
    text += `🎯 النقاط: ${topPlayer.score}\n`;
  } else {
    text += `🏆 الفائز: ${topPlayer.name} (${topPlayer.score} نقطة)\n`;
    if (players.length > 1) {
      text += `🥈 الثاني: ${sorted[1].name} (${sorted[1].score} نقطة)\n`;
    }
  }

  text += `📈 الدقة: ${accuracy}%\n`;
  const catNames = gameSettings.categories.map(getCategoryName).join(' + ');
text += `📚 الأقسام: ${catNames}\n`;
  text += `🎚️ الصعوبة: ${gameSettings.difficulty}\n\n`;
  text += `🎮 العب معايا: ${window.location.origin}`;

  return text;
}

function getCategoryName(key) {
  const names = {
    football: 'كرة القدم',
    movies: 'أفلام',
    series: 'مسلسلات',
    general: 'معلومات عامة',
    science: 'علوم',
    history: 'تاريخ',
    music: 'موسيقى وفن',
    tech: 'تكنولوجيا',
    sports: 'رياضات أخرى',
    religion: 'دين'
  };
  return names[key] || 'عام';
}

function setupShare() {
  const text = buildShareText();

  document.getElementById('share-whatsapp')?.addEventListener('click', () => {
    playClickSound();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  });

  document.getElementById('share-twitter')?.addEventListener('click', () => {
    playClickSound();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  });

  document.getElementById('share-copy')?.addEventListener('click', async () => {
    playClickSound();
    try {
      await navigator.clipboard.writeText(text);
      showToast('✅ تم نسخ النتيجة!', 'success');
    } catch (err) {
      showToast('✅ تم نسخ النتيجة!', 'success');
    }
  });

  document.getElementById('download-image')?.addEventListener('click', async () => {
    playClickSound();
    await downloadShareImage();
  });
}

async function downloadShareImage() {
  const btn = document.getElementById('download-image');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '⏳ جاري التوليد...';

  try {
    const canvas = document.getElementById('share-canvas');
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0a0e1a');
    bgGrad.addColorStop(1, '#0d2130');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W/2, 200, 50, W/2, 200, 500);
    glow.addColorStop(0, 'rgba(0, 255, 157, 0.25)');
    glow.addColorStop(1, 'rgba(0, 255, 157, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    ctx.font = 'bold 140px Arial';
    ctx.fillText('🎯', W/2, 220);

    ctx.font = 'bold 72px Cairo, Arial';
    const grad = ctx.createLinearGradient(W/2-200, 0, W/2+200, 0);
    grad.addColorStop(0, '#00ff9d');
    grad.addColorStop(1, '#00b3ff');
    ctx.fillStyle = grad;
    ctx.fillText('Quiz Master', W/2, 320);

    const allAnswers = players.flatMap(p => p.answers || []);
    const total = allAnswers.length;
    const correct = allAnswers.filter(a => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const sorted = [...players].sort((a, b) => b.score - a.score);
    const topPlayer = sorted[0];

    ctx.font = 'bold 56px Cairo, Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(mode === 'solo' ? topPlayer.name : '🏆 ' + topPlayer.name, W/2, 430);

    ctx.font = 'bold 120px Cairo, Arial';
    ctx.fillStyle = '#00ff9d';
    ctx.shadowColor = 'rgba(0, 255, 157, 0.6)';
    ctx.shadowBlur = 30;
    ctx.fillText(String(topPlayer.score), W/2, 590);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 36px Cairo, Arial';
    ctx.fillStyle = '#8b93b0';
    const details = [
      `📈 الدقة: ${accuracy}%`,
      `📚 الأقسام: ${gameSettings.categories.map(getCategoryName).join(' + ')}`,
      `🎚️ الصعوبة: ${gameSettings.difficulty}`
    ];
    details.forEach((line, i) => ctx.fillText(line, W/2, 700 + i * 55));

    let stars = 0;
    if (accuracy >= 80) stars = 3;
    else if (accuracy >= 50) stars = 2;
    else if (accuracy >= 20) stars = 1;

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = 'rgba(255, 204, 0, 0.6)';
    ctx.shadowBlur = 25;
    ctx.fillText('⭐'.repeat(stars) + '☆'.repeat(3 - stars), W/2, 950);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 28px Cairo, Arial';
    ctx.fillStyle = 'rgba(139, 147, 176, 0.7)';
    ctx.fillText('🎮 ' + window.location.host, W/2, 1020);

    const link = document.createElement('a');
    link.download = `quiz-master-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('✅ تم تنزيل الصورة!', 'success');
  } catch (err) {
    console.error('❌ فشل توليد الصورة:', err);
    showToast('❌ فشل توليد الصورة', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 نزّل النتيجة كصورة';
  }
}

// ═══════════════════════════════════════════════
//   ⚙️ شاشة الإعدادات
// ═══════════════════════════════════════════════
const topicInput      = document.getElementById('topic-input');
const difficultyBtns  = document.querySelectorAll('#difficulty-options .option-btn');
const countBtns       = document.querySelectorAll('#count-options .option-btn');
const timerBtns       = document.querySelectorAll('#timer-options .option-btn');
const categoryCards   = document.querySelectorAll('.category-card');

// 🎯 القسم
const TOPIC_CHIPS = {
  football: [
    { t: 'ميسي ورونالدو', i: '🐐' },
    { t: 'كأس العالم', i: '🏆' },
    { t: 'دوري أبطال أوروبا', i: '⭐' },
    { t: 'الدوري الإنجليزي', i: '🦁' },
    { t: 'الدوري الإسباني', i: '🇪🇸' },
    { t: 'منتخب مصر', i: '🇪🇬' }
  ],
  movies: [
    { t: 'أفلام مارفل', i: '🦸' },
    { t: 'أفلام مصرية', i: '🎭' },
    { t: 'أفلام الأوسكار', i: '🏆' },
    { t: 'أفلام خيال علمي', i: '🚀' },
    { t: 'أفلام الرعب', i: '👻' },
    { t: 'أفلام الأنيميشن', i: '🎨' }
  ],
  series: [
    { t: 'مسلسلات مصرية', i: '🇪🇬' },
    { t: 'مسلسلات رمضان', i: '🌙' },
    { t: 'مسلسلات أجنبية', i: '🌍' },
    { t: 'مسلسلات تركية', i: '🇹🇷' },
    { t: 'مسلسلات نتفليكس', i: '📺' },
    { t: 'مسلسلات كوميدية', i: '😂' }
  ],
  general: [
    { t: 'عواصم الدول', i: '🏛️' },
    { t: 'أطول أنهار', i: '🌊' },
    { t: 'معالم سياحية', i: '🗼' },
    { t: 'عجائب الدنيا', i: '🌍' },
    { t: 'معلومات طريفة', i: '💡' },
    { t: 'أعلام الدول', i: '🚩' }
  ],
  science: [
    { t: 'الكواكب', i: '🪐' },
    { t: 'جسم الإنسان', i: '🧬' },
    { t: 'الذرة', i: '⚛️' },
    { t: 'الفيزياء', i: '🔬' },
    { t: 'الاختراعات', i: '💡' },
    { t: 'الفضاء', i: '🚀' }
  ],
  history: [
    { t: 'الحضارة المصرية', i: '🏛️' },
    { t: 'الحروب العالمية', i: '⚔️' },
    { t: 'الفتوحات الإسلامية', i: '🕌' },
    { t: 'الحضارة الرومانية', i: '🏛️' },
    { t: 'شخصيات تاريخية', i: '👤' },
    { t: 'الثورة الفرنسية', i: '🇫🇷' }
  ],
  music: [
    { t: 'أم كلثوم', i: '🎤' },
    { t: 'عبد الحليم', i: '🎙️' },
    { t: 'البيتلز', i: '🎸' },
    { t: 'موسيقى عربية', i: '🎵' },
    { t: 'فنانون عالميون', i: '🌍' },
    { t: 'الأغاني الوطنية', i: '🇪🇬' }
  ],
  tech: [
    { t: 'شركات التكنولوجيا', i: '🏢' },
    { t: 'الذكاء الاصطناعي', i: '🤖' },
    { t: 'البرمجة', i: '💻' },
    { t: 'أبل وسامسونج', i: '📱' },
    { t: 'الإنترنت', i: '🌐' },
    { t: 'الاختراعات الحديثة', i: '🚀' }
  ],
  sports: [
    { t: 'كرة السلة', i: '🏀' },
    { t: 'التنس', i: '🎾' },
    { t: 'الأولمبياد', i: '🏅' },
    { t: 'الملاكمة', i: '🥊' },
    { t: 'السباحة', i: '🏊' },
    { t: 'ألعاب القوى', i: '🏃' }
  ],
  religion: [
    { t: 'الأنبياء', i: '🕌' },
    { t: 'الصحابة', i: '⭐' },
    { t: 'السيرة النبوية', i: '📖' },
    { t: 'القرآن الكريم', i: '📗' },
    { t: 'الفقه الإسلامي', i: '⚖️' },
    { t: 'القصص القرآني', i: '🌙' }
  ]
};

function renderTopicChips(category) {
  const chipsContainer = document.getElementById('topic-chips');
  if (!chipsContainer) return;

  const chips = TOPIC_CHIPS[category] || [];
  chipsContainer.innerHTML = '';

  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.topic = chip.t;
    btn.textContent = `${chip.i} ${chip.t}`;
    btn.addEventListener('click', () => {
      playClickSound();
      topicInput.value = chip.t;
      gameSettings.topic = chip.t;
    });
    chipsContainer.appendChild(btn);
  });
}

// ═══════════════════════════════════════
//   🎯 اختيار متعدد للأقسام
// ═══════════════════════════════════════
const MAX_CATEGORIES = 4;
const categoriesHint = document.getElementById('categories-hint');

function updateCategoriesUI() {
  // نحدّث الشبكة
  categoryCards.forEach(card => {
    const cat = card.dataset.category;
    const isSelected = gameSettings.categories.includes(cat);
    card.classList.toggle('active', isSelected);

    // لو وصلنا للحد الأقصى، الأقسام غير المختارة تبقى disabled
    const isDisabled = !isSelected && gameSettings.categories.length >= MAX_CATEGORIES;
    card.classList.toggle('disabled', isDisabled);
    card.disabled = isDisabled;
  });

  // نحدّث الـ hint
  const count = gameSettings.categories.length;
  if (categoriesHint) {
    categoriesHint.innerHTML = `اخترت: <b>${count}</b> قسم${count >= MAX_CATEGORIES ? ' (الحد الأقصى)' : ' — يمكنك اختيار حتى 4'}`;
    categoriesHint.classList.toggle('limit-reached', count >= MAX_CATEGORIES);
  }

  // نحدّث الـ chips بناءً على أول قسم
  const primaryCat = gameSettings.categories[0] || 'football';
  renderTopicChips(primaryCat);
}

// نقر على قسم
categoryCards.forEach(card => {
  card.addEventListener('click', () => {
    playClickSound();
    const cat = card.dataset.category;
    const idx = gameSettings.categories.indexOf(cat);

    if (idx >= 0) {
      // موجود → نشيله (إلا لو ده القسم الوحيد)
      if (gameSettings.categories.length > 1) {
        gameSettings.categories.splice(idx, 1);
      } else {
        showToast('لازم تختار قسم واحد على الأقل', 'warning', 1500);
      }
    } else {
      // مش موجود → نضيفه (لو مش وصلنا الحد)
      if (gameSettings.categories.length < MAX_CATEGORIES) {
        gameSettings.categories.push(cat);
      } else {
        showToast(`الحد الأقصى ${MAX_CATEGORIES} أقسام`, 'warning', 1500);
      }
    }

    updateCategoriesUI();
  });
});

// تحديد الكل / إلغاء
document.getElementById('select-all-cats')?.addEventListener('click', () => {
  playClickSound();
  gameSettings.categories = ['football', 'movies', 'series', 'general'];
  updateCategoriesUI();
});

document.getElementById('clear-all-cats')?.addEventListener('click', () => {
  playClickSound();
  gameSettings.categories = ['football'];
  updateCategoriesUI();
});

// أول مرة
updateCategoriesUI();

// الصعوبة
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    difficultyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.difficulty = btn.dataset.difficulty;
  });
});

// العدد
countBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    countBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.count = parseInt(btn.dataset.count);
  });
});

// المؤقت
timerBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    timerBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameSettings.timer = parseInt(btn.dataset.timer);
  });
});

// الموضوع
if (topicInput) {
  topicInput.addEventListener('input', () => {
    gameSettings.topic = topicInput.value.trim();
  });
}

// أول مرة
renderTopicChips('football');

// ═══════════════════════════════════════════════
//   ربط الأزرار
// ═══════════════════════════════════════════════
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    playClickSound();
    mode = btn.dataset.mode;
    if (mode === 'online') {
      window.location.href = 'online.html';
      return;
    }
    showScreen('settings');
  });
});

const settingsBackBtn = document.getElementById('settings-back');
if (settingsBackBtn) {
  settingsBackBtn.addEventListener('click', () => {
    playClickSound();
    showScreen('home');
  });
}

const settingsStartBtn = document.getElementById('settings-start');
if (settingsStartBtn) {
  settingsStartBtn.addEventListener('click', () => {
    playClickSound();
    gameSettings.topic = topicInput ? topicInput.value.trim() : '';

    if (mode === 'solo') {
      showScreen('namesSolo');
      soloNameInput.value = '';
      soloNameInput.focus();
    } else {
      showScreen('namesDuo');
      p1NameInput.value = '';
      p2NameInput.value = '';
      p1NameInput.focus();
    }
  });
}

document.getElementById('solo-back').addEventListener('click', () => {
  playClickSound();
  showScreen('settings');
});
document.getElementById('duo-back').addEventListener('click', () => {
  playClickSound();
  showScreen('settings');
});

document.getElementById('solo-start').addEventListener('click', () => {
  playClickSound();
  const name = soloNameInput.value.trim() || 'لاعب';
  startGame([name]);
});

document.getElementById('duo-start').addEventListener('click', () => {
  playClickSound();
  const n1 = p1NameInput.value.trim() || 'لاعب 1';
  const n2 = p2NameInput.value.trim() || 'لاعب 2';
  if (n1 === n2) {
    alert('لازم الاسمين يكونوا مختلفين');
    return;
  }
  startGame([n1, n2]);
});

soloNameInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('solo-start').click();
});
p2NameInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('duo-start').click();
});

document.getElementById('turn-start').addEventListener('click', () => {
  playClickSound();
  startPlayerTurn();
});

// ⚔️ versus
document.getElementById('handoff-start').addEventListener('click', () => {
  playClickSound();
  startVersusQuestion();
});

document.getElementById('vs-next-btn').addEventListener('click', () => {
  playClickSound();
  nextVersusQuestion();
});

// إعادة اللعب
document.getElementById('restart-btn').addEventListener('click', () => {
  playClickSound();
  stopTimer();
  players = [];
  activePlayer = 0;
  versusQuestions = [];
  versusQIndex = 0;
  versusPlayerIndex = 0;
  versusCurrentAnswers = [];
  if (bgLayer) bgLayer.classList.remove('visible');
  showScreen('home');
});

// 🚪 خروج من اللعبة
document.getElementById('quit-game')?.addEventListener('click', () => {
  playClickSound();
  if (confirm('متأكد إنك عايز تخرج من اللعبة؟')) {
    stopTimer();
    players = [];
    activePlayer = 0;
    versusQuestions = [];
    versusQIndex = 0;
    versusPlayerIndex = 0;
    versusCurrentAnswers = [];
    if (bgLayer) bgLayer.classList.remove('visible');
    showScreen('home');
  }
});

// 🔊 زر الصوت
const soundToggleBtn = document.getElementById('sound-toggle');
if (soundToggleBtn) {
  const savedSound = localStorage.getItem('soundEnabled');
  if (savedSound === 'false') {
    soundEnabled = false;
    soundToggleBtn.textContent = '🔇';
    soundToggleBtn.classList.add('muted');
  }

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.classList.toggle('muted', !soundEnabled);
    localStorage.setItem('soundEnabled', soundEnabled);
    if (soundEnabled) playClickSound();
  });
}

// ✨ Particles
const particlesCanvas = document.getElementById('particles-canvas');
if (particlesCanvas) {
  const ctx2d = particlesCanvas.getContext('2d');
  let particles = [];
  let W, H;

  function resizeCanvas() {
    W = particlesCanvas.width = window.innerWidth;
    H = particlesCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const PARTICLE_COUNT = 70;

  function createParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      radius: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      opacity: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? '0, 255, 157' : '0, 179, 255',
      pulse: Math.random() * Math.PI * 2
    };
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());

  function animateParticles() {
    ctx2d.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
      const pulseSize = p.radius * (1 + Math.sin(p.pulse) * 0.3);
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${p.color}, ${p.opacity})`;
      ctx2d.shadowBlur = 12;
      ctx2d.shadowColor = `rgba(${p.color}, ${p.opacity})`;
      ctx2d.fill();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// 🎯 Parallax
let mouseX = 0, mouseY = 0, currentX = 0, currentY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function animateParallax() {
  currentX += (mouseX - currentX) * 0.05;
  currentY += (mouseY - currentY) * 0.05;
  if (bgLayer) {
    bgLayer.style.transform = `scale(1.15) translate(${currentX * 15}px, ${currentY * 15}px)`;
  }
  const overlay = document.getElementById('bg-overlay');
  if (overlay) {
    overlay.style.transform = `translate(${currentX * -8}px, ${currentY * -8}px)`;
  }
  requestAnimationFrame(animateParallax);
}
animateParallax();

// 💫 Mouse glow
const mouseGlow = document.createElement('div');
mouseGlow.id = 'mouse-glow';
document.body.appendChild(mouseGlow);

document.addEventListener('mousemove', (e) => {
  mouseGlow.style.left = e.clientX + 'px';
  mouseGlow.style.top = e.clientY + 'px';
  mouseGlow.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
  mouseGlow.style.opacity = '0';
});