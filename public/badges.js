export const BADGES = [
  { id: 'first_game',   icon: '🎮', title: 'أول خطوة',       desc: 'لعبت أول لعبة' },
  { id: 'perfect',      icon: '💯', title: 'أسطورة',         desc: 'جبت 100% في لعبة' },
  { id: 'speedster',    icon: '⚡', title: 'سريع البديهة',    desc: '10 صح متتالي' },
  { id: 'veteran',      icon: '🎖️', title: 'محترف',          desc: 'لعبت 10 ألعاب' },
  { id: 'master',       icon: '👑', title: 'المعلم',          desc: 'جمعت 5000 نقطة' },
  { id: 'explorer',     icon: '🗺️', title: 'المستكشف',        desc: 'لعبت 5 مواضيع مختلفة' },
  { id: 'champion',     icon: '🏆', title: 'بطل',             desc: 'وصلت لأول 3 في المتصدرين' },
  { id: 'night_owl',    icon: '🦉', title: 'بومة الليل',       desc: 'لعبت بعد منتصف الليل' }
];

export function checkBadges(allResults) {
  const unlocked = new Set();

  if (allResults.length >= 1) unlocked.add('first_game');
  if (allResults.some(r => r.score === r.maxScore && r.maxScore > 0)) unlocked.add('perfect');
  if (allResults.length >= 10) unlocked.add('veteran');

  const totalScore = allResults.reduce((s, r) => s + r.score, 0);
  if (totalScore >= 5000) unlocked.add('master');

  const topics = new Set(allResults.map(r => r.topic).filter(Boolean));
  if (topics.size >= 5) unlocked.add('explorer');

  if (allResults.some(r => {
    const d = r.createdAt?.toDate?.();
    return d && (d.getHours() >= 0 && d.getHours() < 4);
  })) {
    unlocked.add('night_owl');
  }

  return unlocked;
}