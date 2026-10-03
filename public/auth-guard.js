import { watchAuth, logout } from './auth.js';

watchAuth(async user => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // 🔄 نحمّل البيانات الحديثة (بعد التسجيل بالظبط)
  try {
    await user.reload();
  } catch (err) {
    console.warn('⚠️ فشل تحديث بيانات المستخدم:', err);
  }

  // الآن displayName متاح
  const nameEl = document.getElementById('user-name');
  if (nameEl) {
    nameEl.textContent = user.displayName || user.email;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('متأكد إنك عايز تسجل خروج؟')) {
        await logout();
      }
    });
  }
});