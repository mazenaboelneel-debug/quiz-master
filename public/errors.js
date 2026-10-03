// ═══════════════════════════════════════════════
//   🚨 نظام معالجة الأخطاء
// ═══════════════════════════════════════════════

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showErrorModal(title, message, onRetry) {
  let modal = document.getElementById('error-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'error-modal';
    modal.className = 'error-modal hidden';
    modal.innerHTML = `
      <div class="error-box">
        <div class="error-icon">⚠️</div>
        <h2 id="error-title">حصل خطأ</h2>
        <p id="error-message">جرب تاني</p>
        <button id="error-retry">🔄 جرب تاني</button>
        <button id="error-close" class="btn-ghost">إغلاق</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('error-title').textContent = title;
  document.getElementById('error-message').textContent = message;

  modal.classList.remove('hidden');

  const retryBtn = document.getElementById('error-retry');
  const closeBtn = document.getElementById('error-close');

  // نستخدم onclick عشان نشيل الـ listeners القديمة
  retryBtn.onclick = () => {
    modal.classList.add('hidden');
    if (onRetry) onRetry();
  };
  closeBtn.onclick = () => modal.classList.add('hidden');
}

// ═══════════════════════════════════════════════
//   ترجمة أخطاء الـ AI
// ═══════════════════════════════════════════════
export function translateAIError(errorMsg) {
  if (!errorMsg) return 'حصل خطأ غير متوقع';

  const msg = errorMsg.toLowerCase();

  if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) {
    return '⚠️ السيرفر مشغول حالياً، جرب تاني بعد لحظات';
  }
  if (msg.includes('429') || msg.includes('quota')) {
    return '⚠️ وصلنا للحد الأقصى من الطلبات، جرب بعد دقيقة';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return '🌐 في مشكلة في الاتصال بالإنترنت';
  }
  if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
    return '🤖 موديل الذكاء الاصطناعي غير متاح حالياً';
  }
  if (msg.includes('api_key') || msg.includes('api key')) {
    return '🔑 في مشكلة في إعدادات السيرفر، كلم المدير';
  }
  if (msg.includes('timeout')) {
    return '⏰ الاتصال أخد وقت طويل جداً، جرب تاني';
  }

  return '⚠️ حصل خطأ، جرب تاني';
}