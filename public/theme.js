// ═══════════════════════════════════════════════
//   🎨 نظام الثيمات
// ═══════════════════════════════════════════════

export const THEMES = {
  neon: {
    name: 'Neon',
    icon: '🟢',
    desc: 'الأخضر/الأزرق الافتراضي',
    vars: {
      '--bg': '#0a0e1a',
      '--accent': '#00ff9d',
      '--accent2': '#00b3ff',
      '--danger': '#ff3b5c',
      '--text': '#ffffff',
      '--muted': '#8b93b0'
    }
  },
  liverpool: {
    name: 'ليفربول',
    icon: '🔴',
    desc: 'الأحمر القوي',
    vars: {
      '--bg': '#1a0508',
      '--accent': '#ff2b45',
      '--accent2': '#c8102e',
      '--danger': '#ffcc00',
      '--text': '#ffffff',
      '--muted': '#b8a3a6'
    }
  },
  chelsea: {
    name: 'تشيلسي',
    icon: '🔵',
    desc: 'الأزرق الملكي',
    vars: {
      '--bg': '#050818',
      '--accent': '#4a90ff',
      '--accent2': '#034694',
      '--danger': '#ff5c7a',
      '--text': '#ffffff',
      '--muted': '#8a99bb'
    }
  },
  real: {
    name: 'ريال مدريد',
    icon: '⚪',
    desc: 'الأبيض والذهبي',
    vars: {
      '--bg': '#0f0e08',
      '--accent': '#febe10',
      '--accent2': '#ffffff',
      '--danger': '#ff5c7a',
      '--text': '#ffffff',
      '--muted': '#a8a37a'
    }
  },
  barcelona: {
    name: 'برشلونة',
    icon: '🔴🔵',
    desc: 'الأحمر والأزرق',
    vars: {
      '--bg': '#0f0518',
      '--accent': '#edbb00',
      '--accent2': '#a50044',
      '--danger': '#ff5c7a',
      '--text': '#ffffff',
      '--muted': '#9b8b9e'
    }
  },
  juventus: {
    name: 'يوفنتوس',
    icon: '⚫',
    desc: 'الأسود والأبيض',
    vars: {
      '--bg': '#0a0a0a',
      '--accent': '#ffffff',
      '--accent2': '#888888',
      '--danger': '#ff5c7a',
      '--text': '#ffffff',
      '--muted': '#999999'
    }
  },
  day: {
    name: 'نهاري',
    icon: '☀️',
    desc: 'الوضع الفاتح',
    vars: {
      '--bg': '#f0f4ff',
      '--accent': '#00a86b',
      '--accent2': '#0077cc',
      '--danger': '#e63e5c',
      '--text': '#0a0e1a',
      '--muted': '#6b7280'
    },
    isLight: true
  }
};

// ═══════════════════════════════════════════════
//   تطبيق ثيم
// ═══════════════════════════════════════════════
export function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.neon;
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // نطبق كلاس على body للوضع النهاري
  document.body.classList.toggle('light-mode', !!theme.isLight);

  // نحفظ الاختيار
  localStorage.setItem('theme', themeKey);

  return theme;
}

// ═══════════════════════════════════════════════
//   تحميل الثيم المحفوظ
// ═══════════════════════════════════════════════
export function loadSavedTheme() {
  const saved = localStorage.getItem('theme') || 'neon';
  return applyTheme(saved);
}

// ═══════════════════════════════════════════════
//   الحصول على الثيم الحالي
// ═══════════════════════════════════════════════
export function getCurrentTheme() {
  return localStorage.getItem('theme') || 'neon';
}

// ═══════════════════════════════════════════════
//   تطبيق تلقائي عند تحميل أي صفحة
// ═══════════════════════════════════════════════
loadSavedTheme();