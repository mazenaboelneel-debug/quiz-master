import express from 'express';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

// بعد app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));

const app = express();
const PORT = process.env.PORT || 3000;
const MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash-lite'
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json());
app.use(express.static('public'));

// ═══════════════════════════════════════
//   🇪🇬 قائمة موسّعة للأفلام والمسلسلات المصرية
// ═══════════════════════════════════════
const EGYPTIAN_MOVIES = {
  classic: [
    // عادل إمام
    'الإرهاب والكباب (1992) - عادل إمام',
    'الزوجة الثانية (1967) - سعاد حسني',
    'أمير الظلام (2002) - عادل إمام',
    'السفارة في العمارة (2005) - عادل إمام',
    'زهايمر (2010) - عادل إمام',
    'عمارة يعقوبيان (2006) - عادل إمام',
    'حسن ومرقص (2008) - عادل إمام',
    'اللمبي (2002) - محمد سعد',
    'اللي بالي بالك (2003) - محمد سعد',
    'عوكل (2004) - محمد سعد',
    'بوحة (2005) - محمد سعد',
    'كركر (2007) - محمد سعد',
    
    // أحمد زكي
    'البرئ (1986) - أحمد زكي',
    'زوجة رجل مهم (1988) - أحمد زكي',
    'البيه البواب (1987) - أحمد زكي',
    'أرض الأحلام (1993) - أحمد زكي',
    'النمر الأسود (1984) - أحمد زكي',
    'إمبراطورية ميم (1972) - فاتن حمامة',
    'البريء (1986)',
    
    // أحمد حلمي
    'كده رضا (2007) - أحمد حلمي',
    'آسف على الإزعاج (2008) - أحمد حلمي',
    'ألف مبروك (2009) - أحمد حلمي',
    'بلبل حيران (2010) - أحمد حلمي',
    'إكس لارج (2011) - أحمد حلمي',
    'صنع في مصر (2014) - أحمد حلمي',
    
    // محمد هنيدي
    'إسماعيلية رايح جاي (1997) - محمد هنيدي',
    'صعيدي في الجامعة الأمريكية (1998) - محمد هنيدي',
    'همام في أمستردام (1999) - محمد هنيدي',
    'جاءنا البيان التالي (2001) - محمد هنيدي',
    'فول الصين العظيم (2004) - محمد هنيدي',
    'رمضان مبروك أبو العلمين حمودة (2008)',
    'اللي بالي بالك 2 (2005)',
    
    // علاء ولي الدين
    'الناظر (2000) - علاء ولي الدين',
    'عربي إيه (2000) - علاء ولي الدين',
    'ابن عز (2001) - علاء ولي الدين',
    
    // أحمد السقا
    'الجزيرة (2007) - أحمد السقا',
    'تيمور وشفيقة (2007) - أحمد السقا',
    'إبراهيم الأبيض (2009) - أحمد السقا',
    'المصلحة (2012) - أحمد السقا',
    'الجزيرة 2 (2014) - أحمد السقا',
    'الفيل الأزرق (2014) - كريم عبد العزيز',
    'الفيل الأزرق 2 (2019) - كريم عبد العزيز',
    'كيرة والجن (2022) - كريم عبد العزيز',
    
    // أحمد عز
    'الجريمة (2022) - أحمد عز',
    'ولاد رزق (2015) - أحمد عز',
    'ولاد رزق 2 (2019) - أحمد عز',
    'ولاد رزق 3 (2024) - أحمد عز',
    'الممر (2019) - أحمد عز',
    'الخلية (2017) - أحمد عز',
    
    // محمد رمضان
    'واحد صعيدي (2014) - محمد رمضان',
    'الكنز (2017) - محمد رمضان',
    'الكنز 2 (2019) - محمد رمضان',
    'الديزل (2018) - محمد رمضان',
    'جواب اعتقال (2017) - محمد رمضان',
    
    // تامر حسني
    'أهواك (2015) - تامر حسني',
    'مش أنا (2019) - تامر حسني',
    'تصبح على خير (2017) - تامر حسني',
    
    // كلاسيكيات
    'الأرض (1970) - محمود المليجي',
    'باب الحديد (1958) - هنري بركات',
    'رد قلبي (1957) - صلاح ذو الفقار',
    'الحرام (1965) - فاتن حمامة',
    'بداية ونهاية (1960) - عمر الشريف',
    'العصفور (1972) - محمود المليجي',
    'عودة الابن الضال (1976) - يوسف شاهين',
    'أفواه وأرانب (1977) - فاتن حمامة',
    'سواق الأتوبيس (1982)',
    'الكرنك (1975) - نور الشريف',
    'جريمة في الحي الهادئ (1967)',
    'الرصاصة لا تزال في جيبي (1974)',
    'أغنية على الممر (1972)',
    'شيء من الخوف (1969)',
    'الوسادة الخالية (1957)',
    'دعاء الكروان (1959) - فاتن حمامة',
    'الرجل الثاني (1959)',
    'لا وقت للحب (1963)',
    
    // حديثة
    'كازابلانكا (2019) - أمير كراره',
    'هيبتا (2016) - ماجد الكدواني',
    'تراب الماس (2018) - آسر ياسين',
    'لص بغداد (2020) - محمد عادل إمام',
    'الفيوم (2022)',
    'واحد من الناس (2006)',
    'مطب صناعي (2006)',
    'عسل أسود (2010)',
    'بنات العم (2012)',
    'الحرب العالمية الثالثة (2014)',
    'الفيل الأزرق 3 (2024) - كريم عبد العزيز',
    'كامل العدد (2024)',
    'أولاد حريفة (2025)',
    'الدشاش (2023) - محمد رمضان',
    'ع الزيرو (2023) - محمد رمضان',
    'هارلي (2023) - محمد رمضان',
    'شقو (2024) - ياسين',
    'الملحد (2024)',
    'ولاد رزق 3 (2024)'
  ]
};

const EGYPTIAN_SERIES = {
  classic: [
    'ليالي الحلمية (1987) - يحيى الفخراني',
    'رأفت الهجان (1988) - محمود عبد العزيز',
    'بوابة المتولي (1991)',
    'الحاج متولي (2001) - نور الشريف',
    'الضوء الشارد (1998) - ممدوح عبد العليم',
    'زيزينيا (1997) - يحيى الفخراني',
    'أم كلثوم (1999) - صابرين',
    'الليل وآخره (2003)',
    'حديث الصباح والمساء (2001)',
    'ملك روحي (2003)',
    'المال والبنون (1993)',
    'يوميات ونيس (1994-2014) - محمد صبحي',
    'أنا وأنت وبابا في المشمش (1998)',
    'الواد سيد الشحات (1999) - محمد هنيدي',
    'زيزينيا 2 (2000)',
    'أوبرا عايدة (2000)',
    'الدالي (2007-2015) - نور الشريف',
    'الملك فاروق (2007) - تيم حسن',
    'أسمهان (2008) - سلاف معمار',
    'الحسناء والقرد (1996)',
    'لا (1999)',
    'بنت من شبرا (2008)',
    'أفراح إبليس (2006)',
    'سكة الهلالي (2007)',
    'الحارة (2014)',
    'العهد (2015) - آسر ياسين',
    'الجماعة (2010) - إياد نصار',
    'الجماعة 2 (2017)'
  ],
  modern: [
    'الاختيار (2020) - أمير كراره',
    'الاختيار 2 (2021) - كريم عبد العزيز',
    'الاختيار 3 (2022) - ياسر جلال',
    'ما وراء الطبيعة (2020) - أحمد أمين',
    'نصيبي وقسمتك (2016)',
    'سرايا عابدين (2014)',
    'الحسين (2022) - حمدي الميرغني',
    'المداح (2021) - حمادة هلال',
    'المداح 2 (2022) - حمادة هلال',
    'المداح 3 (2023) - حمادة هلال',
    'المداح 4 (2024) - حمادة هلال',
    'جعفر العمدة (2023) - محمد رمضان',
    'تحت الوصاية (2023) - منة شلبي',
    'بالطو (2023) - عصام عمر',
    'سفاح الجيزة (2023) - أحمد فهمي',
    'حالة خاصة (2024) - طه دسوقي',
    'مليحة (2024) - دياب',
    'كامل العدد (2023) - دينا الشربيني',
    'كامل العدد +1 (2024)',
    'العتاولة (2024) - أحمد السقا',
    'العتاولة 2 (2025) - أحمد السقا',
    'الشرنقة (2025)',
    'كيرة والجن (مسلسل 2025)',
    'الكبير أوي (2010-2023) - أحمد مكي',
    'الوصية (2018) - أحمد أمين',
    'خلصانة بشياكة (2017)',
    'نيللي وشريهان (2016)',
    'لمعي القط (2017) - محمد هنيدي',
    'بابا المجال (2021)',
    'جزيرة غمام (2021)',
    'نجيب زبيب (2022)',
    'البرنس (2020) - محمد رمضان',
    'الاختيار 3 (2022)',
    'موسى (2021) - محمد رمضان',
    'ونسنا (2023)',
    'نعمة الأفوكاتو (2024) - مي عمر',
    'الوصية (2018)',
    'أعلى نسبة مشاهدة (2024)',
    'خالد نور وولده نور خالد (2024)',
    'العميل (2022)',
    'جزيرة غمام (2021)',
    'القاهرة كابول (2021)',
    'حب عمري (2020)',
    'لعبة نيوتن (2021) - منة شلبي',
    'ضد مجهول (2022)',
    'ثانوية نسا (2021)',
    'بنات ألفة (2024)',
    'سفاح الجيزة (2023)'
  ],
  ramadan: [
    'الكبير أوي (2010-2023) - أحمد مكي',
    'الوصية (2018) - أحمد أمين',
    'خلصانة بشياكة (2017)',
    'نيللي وشريهان (2016)',
    'لمعي القط (2017)',
    'بابا المجال (2021)',
    'جزيرة غمام (2021)',
    'المداح 1-4 (2021-2024)',
    'الاختيار 3 (2022)',
    'جعفر العمدة (2023)',
    'تحت الوصاية (2023)',
    'العتاولة (2024)',
    'كامل العدد (2023-2024)',
    'مليحة (2024)',
    'حالة خاصة (2024)',
    'نعمة الأفوكاتو (2024)',
    'أعلى نسبة مشاهدة (2024)'
  ]
};

// ═══════════════════════════════════════
//   🎯 الأقسام
// ═══════════════════════════════════════
const CATEGORIES = {
  football: {
    name: 'كرة القدم',
    desc: 'كرة القدم — لاعبين، أندية، بطولات، تاريخ، إنجازات',
    example: 'ميسي، رونالدو، كأس العالم، دوري الأبطال',
    hasPlayerImage: true   // ← يستخدم TheSportsDB
  },
  
  movies: {
  name: 'أفلام',
  desc: 'أفلام مصرية فقط — كلاسيكية وحديثة، ممثلين مصريين، مخرجين، قصص، أحداث',
  example: 'الإرهاب والكباب، الكيف، الفيل الأزرق، كازابلانكا',
  hasPlayerImage: false
},
series: {
  name: 'مسلسلات',
  desc: 'مسلسلات مصرية فقط — دراما، كوميديا، رمضان، تاريخية، أحداث وشخصيات',
  example: 'ليالي الحلمية، رأفت الهجان، الاختيار، ما وراء الطبيعة',
  hasPlayerImage: false
},
  general: {
    name: 'معلومات عامة',
    desc: 'معلومات عامة — جغرافية، عواصم، معالم، حقائق، اختراعات',
    example: 'عواصم الدول، أطول أنهار، عجائب الدنيا',
    hasPlayerImage: false
  },
  science: {
    name: 'علوم',
    desc: 'علوم — فيزيا، كيميا، أحياء، فضاء، طب',
    example: 'الكواكب، الذرة، جسم الإنسان، الاكتشافات',
    hasPlayerImage: false
  },
  history: {
    name: 'تاريخ',
    desc: 'تاريخ — إسلامي، عالمي، حروب، حضارات، شخصيات تاريخية',
    example: 'الحضارة المصرية، الحروب العالمية، الفتوحات الإسلامية',
    hasPlayerImage: false
  },
  music: {
    name: 'موسيقى وفن',
    desc: 'موسيقى وفن — مطربين عرب وأجانب، أغاني، فرق، لوحات فنية',
    example: 'أم كلثوم، عبد الحليم، البيتلز، فنانون عالميون',
    hasPlayerImage: false
  },
  tech: {
    name: 'تكنولوجيا',
    desc: 'تكنولوجيا — برمجة، اختراعات، شركات، AI، إنترنت',
    example: 'أبل، جوجل، الذكاء الاصطناعي، البرمجة',
    hasPlayerImage: false
  },
  sports: {
    name: 'رياضات أخرى',
    desc: 'رياضات — تنس، سلة، أولمبياد، ملاكمة، سباحة، ألعاب قوى',
    example: 'مايكل جوردان، أولمبياد، التنس، كرة السلة',
    hasPlayerImage: false
  },
  religion: {
    name: 'دين',
    desc: 'معلومات إسلامية — أنبياء، صحابة، قرآن، فقه، سيرة نبوية',
    example: 'الأنبياء، الصحابة، السيرة النبوية، الفقه',
    hasPlayerImage: false
  }
};

// ═══════════════════════════════════════
//   Fallback للموديلات
// ═══════════════════════════════════════
async function generateWithFallback(prompt) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      console.log(`✅ Success with: ${model}`);
      return response.text;
    } catch (err) {
      const msg = err.message || '';
      const isRetryable =
        msg.includes('503') || msg.includes('UNAVAILABLE') ||
        msg.includes('429') || msg.includes('404') ||
        msg.includes('NOT_FOUND') || msg.includes('no longer available') ||
        msg.includes('not found');

      if (isRetryable) {
        console.warn(`⚠️ ${model} فشل، بجرب اللي بعده...`);
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error('كل الموديلات مش شغالة حالياً. آخر إيرور: ' + (lastError?.message || ''));
}

// ═══════════════════════════════════════
//   🔍 التحقق من الأسئلة (Verification)
// ═══════════════════════════════════════
async function verifyQuestions(questions, categories) {
  if (!questions || questions.length === 0) return questions;

  // نتحقق بس لو فيه أفلام/مسلسلات
  const hasMoviesOrSeries = categories.some(c => c === 'movies' || c === 'series');
  if (!hasMoviesOrSeries) return questions;

  const moviesOnlyQuestions = questions.filter(q => 
    q.category === 'movies' || q.category === 'series'
  );

  if (moviesOnlyQuestions.length === 0) return questions;

  console.log('🔍 جاري التحقق من', moviesOnlyQuestions.length, 'سؤال...');

  const questionsList = moviesOnlyQuestions.map((q, i) => 
    `${i + 1}. السؤال: ${q.q}\n   الإجابة: ${q.options[q.correct]}`
  ).join('\n\n');

  const prompt = `
أنت خبير سينما مصرية. راجع الأسئلة دي:

${questionsList}

لكل سؤال، تأكد من:
1. الفيلم/المسلسل **مصري 100%** ومش أجنبي
2. الإجابة **صحيحة 100%** — لو مش متأكد، اكتب "حذف"
3. المعلومة موجودة فعلاً (الممثل، المخرج، الأحداث)

أرجع JSON فقط بالشكل ده:
{
  "results": [
    { "index": 1, "valid": true },
    { "index": 2, "valid": false, "reason": "الفيلم أجنبي" },
    { "index": 3, "valid": true }
  ]
}
`;

  try {
    const text = await generateWithFallback(prompt);
    let clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const result = JSON.parse(clean);

    const validIndices = new Set(
      (result.results || [])
        .filter(r => r.valid === true)
        .map(r => r.index - 1)
    );

    // نرجّع الأسئلة الأصلية (مع فلترة الأفلام/المسلسلات)
    let movieIndex = 0;
    const filtered = questions.filter(q => {
      if (q.category === 'movies' || q.category === 'series') {
        const isValid = validIndices.has(movieIndex);
        movieIndex++;
        if (!isValid) {
          console.log('❌ سؤال مرفوض:', q.q);
        }
        return isValid;
      }
      return true;
    });

    console.log('✅ قبل:', questions.length, '→ بعد:', filtered.length);
    return filtered;
  } catch (err) {
    console.warn('⚠️ فشل التحقق، نرجع الأسئلة الأصلية:', err.message);
    return questions;
  }
}

// ═══════════════════════════════════════
//   اختبار
// ═══════════════════════════════════════
app.get('/api/test', async (req, res) => {
  try {
    const text = await generateWithFallback(
      'ولّد سؤال واحد عن كرة القدم بالعربي مع 4 اختيارات والإجابة الصحيحة. أرجع JSON فقط بالشكل: {"q":"...","options":["أ","ب","ج","د"],"correct":0}'
    );
    res.json({ success: true, raw: text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
//   🎯 توليد أسئلة حسب القسم
// ═══════════════════════════════════════
// ═══════════════════════════════════════
//   🎯 توليد أسئلة حسب قسم واحد أو أكثر
// ═══════════════════════════════════════
app.post('/api/questions', async (req, res) => {
  try {
    // نقبل: category (قسم واحد) أو categories (مصفوفة)
    let categories = req.body.categories;
    if (!categories && req.body.category) {
      categories = [req.body.category];
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = ['football'];
    }
    // حد أقصى 4 أقسام
    categories = categories.slice(0, 4);

    const topic = (req.body.topic || '').trim();
    const difficulty = req.body.difficulty || 'متوسط';
    const totalCount = Math.min(Math.max(parseInt(req.body.count) || 5, 1), 20);

    // ═══════════════════════════════════════
    //   توزيع الأسئلة على الأقسام
    // ═══════════════════════════════════════
    const numCats = categories.length;
    const baseCount = Math.floor(totalCount / numCats);
    const remainder = totalCount % numCats;

    const distribution = categories.map((cat, i) => ({
      category: cat,
      count: baseCount + (i < remainder ? 1 : 0)
    }));

    console.log('📊 توزيع:', distribution.map(d => `${d.category}:${d.count}`).join(', '));

    // ═══════════════════════════════════════
    //   نبني prompt موحّد
    // ═══════════════════════════════════════
    const isFootballOnly = categories.length === 1 && categories[0] === 'football';

    const categoryDetails = distribution.map(d => {
      const cat = CATEGORIES[d.category] || CATEGORIES.football;
      return `- **${cat.name}** (${d.count} أسئلة): ${cat.desc}`;
    }).join('\n');

    // تعليمات خاصة للأفلام/المسلسلات
    const hasMovies = categories.includes('movies');
const hasSeries = categories.includes('series');
const hasMoviesOrSeries = hasMovies || hasSeries;

let moviesHint = '';
if (hasMoviesOrSeries) {
  const moviesList = EGYPTIAN_MOVIES.classic
    .concat(EGYPTIAN_MOVIES.modern)
    .map(m => `- ${m}`)
    .join('\n');

  const seriesList = EGYPTIAN_SERIES.classic
    .concat(EGYPTIAN_SERIES.modern)
    .map(s => `- ${s}`)
    .join('\n');

  moviesHint = `
═══════════════════════════════════════
🚫 قواعد صارمة (لا تتجاوزها):
═══════════════════════════════════════

❌ **ممنوع تماماً**:
- الأفلام الأجنبية (Hollywood, Disney, Netflix)
- جوائز الأوسكار أو الجولدن جلوب
- الأفلام الأمريكية أو الأوروبية
- الأفلام الهندية أو التركية
- الاقتباسات الشهيرة من الأفلام

✅ **المسموح فقط**:
- الأفلام المصرية 🇪🇬
- المسلسلات المصرية 🇪🇬

═══════════════════════════════════════
🎬 قائمة الأفلام المصرية المسموحة:
═══════════════════════════════════════

${moviesList}

═══════════════════════════════════════
📺 قائمة المسلسلات المصرية المسموحة:
═══════════════════════════════════════

${seriesList}

═══════════════════════════════════════
📝 نوع الأسئلة المطلوبة:
═══════════════════════════════════════

نوّع بين الأنواع دي:

1️⃣ **وصف أحداث** (40%):
   مثال: "فيلم مصري عن موظف بيهرب من الإرهابيين وبيتعرف على شخصيات غريبة في شقة، بيحاول يرجع لحياته — إيه اسم الفيلم؟"
   الإجابة: الإرهاب والكباب

2️⃣ **ممثلين وأدوار** (30%):
   مثال: "مين الممثل اللي لعب دور البطولة في فيلم الإرهاب والكباب؟"
   الإجابة: عادل إمام

3️⃣ **مخرجين** (15%):
   مثال: "مين مخرج فيلم الكيف؟"
   الإجابة: علي عبد الخالق

4️⃣ **شخصيات وأحداث داخلية** (15%):
   مثال: "في فيلم الفيل الأزرق، إيه اسم الشخصية اللي لعبها كريم عبد العزيز؟"
   الإجابة: يحيى

⚠️ قواعد:
- استخدم **بس** الأفلام/المسلسلات من القوائم اللي فوق.
- متخترعش أفلام مش موجودة في القائمة.
- لو مش متأكد من معلومة → استخدم فيلم تاني أنت واثق فيه.
- الأسئلة لازم تكون دقيقة 100%.
`;
}

    const topicLine = topic
      ? `الموضوع المحدد لكل الأسئلة: "${topic}"`
      : `اختر مواضيع متنوعة ومختلفة داخل كل قسم`;

    const imageHint = isFootballOnly
      ? `- "player": اسم لاعب كرة قدم مشهور مرتبط بالسؤال (حقيقي وموجود)
- "showPlayerImage": true`
      : `- "categoryName": اسم القسم بالعربي (مثال: "أفلام"، "تاريخ"، "علوم")
- "keyword": كلمة إنجليزية واحدة للبحث عن صورة (مثال: "cinema", "history", "science", "football")
- "player": لو السؤال كورة → اسم اللاعب، وإلا اتركه فارغ
- "showPlayerImage": true فقط لو كورة`;

    const prompt = `
أنت خبير أسئلة ومعرفة عامة. ولّد **${totalCount} سؤال** موزّعين على الأقسام دي:

${categoryDetails}

${topicLine}

مستوى الصعوبة: "${difficulty}"
الأسئلة كلها بالعربي.

⚠️ تعليمات عامة:
- كل سؤال له 4 اختيارات وإجابة صحيحة واحدة.
- تأكد إن كل الأسئلة **مختلفة**.
- التأكد من **دقة المعلومات** — مفيش تخمين.
🚨 تعليمات صارمة للأسئلة:
- **مفيش أي أسئلة عن أفلام أجنبية** (هوليوود، ديزني، نتفليكس).
- **مفيش أي أسئلة عن الأوسكار**.
- **مفيش اقتباسات أفلام** — استخدم وصف الأحداث بس.
- التركيز **حصراً** على المحتوى المصري.

${moviesHint}

مع كل سؤال أضف:
- "explain": شرح قصير (سطر واحد) للإجابة الصحيحة
- "category": مفتاح القسم بالإنجليزي (${categories.join(', ')})
${imageHint}

⚠️ مهم جداً: خلط الأسئلة عشوائياً (مش مجموعة كورة ورا بعضها).

أرجع JSON فقط بالشكل ده:
{
  "questions": [
    {
      "q": "نص السؤال",
      "options": ["اختيار1", "اختيار2", "اختيار3", "اختيار4"],
      "correct": 0,
      "explain": "شرح قصير",
      "category": "football",
      ${isFootballOnly ? '"player": "اسم اللاعب",\n      "showPlayerImage": true' : '"keyword": "cinema",\n      "categoryName": "أفلام",\n      "showPlayerImage": false'}
    }
  ]
}
`;

    const text = await generateWithFallback(prompt);

    let clean = text.trim();
    clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');

    const data = JSON.parse(clean);

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('صيغة الرد مش متوقعة من الـ AI');
    }

    // شفل عشوائي عشان نخلط الأقسام
    data.questions.sort(() => Math.random() - 0.5);

    // نقص للعدد المطلوب بالظبط
    data.questions = data.questions.slice(0, totalCount);

    console.log('✅ تم توليد', data.questions.length, 'سؤال');

    // 🔍 التحقق من أسئلة الأفلام/المسلسلات
    data.questions = await verifyQuestions(data.questions, categories);

    // لو بعد التحقق عدد قليل، نجيب أسئلة إضافية
    if (data.questions.length < totalCount) {
      console.log('⚠️ عدد قليل بعد التحقق:', data.questions.length, '— جاري استكمال...');
      // نحاول نجيب العدد الناقص
      try {
        const needed = totalCount - data.questions.length;
        const retryPrompt = prompt.replace(
          `ولّد **${totalCount} سؤال**`,
          `ولّد **${needed} سؤال إضافي**`
        );
        const retryText = await generateWithFallback(retryPrompt);
        let retryClean = retryText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        const retryData = JSON.parse(retryClean);
        
        if (retryData.questions && Array.isArray(retryData.questions)) {
          const retryVerified = await verifyQuestions(retryData.questions, categories);
          data.questions = data.questions.concat(retryVerified.slice(0, needed));
        }
      } catch (e) {
        console.warn('⚠️ فشل الاستكمال:', e.message);
      }
    }

    console.log('🎯 النهائي:', data.questions.length, 'سؤال');
    res.json({ success: true, questions: data.questions });
  } catch (err) {
    console.error('❌ Questions Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
//   🖼️ صورة اللاعب (كرة قدم بس)
// ═══════════════════════════════════════
app.get('/api/player-image', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.json({ success: false, error: 'name مطلوب' });

    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`;
    const r = await fetch(url);
    const data = await r.json();

    const player = data?.player?.[0];
    if (!player) return res.json({ success: false, error: 'اللاعب مش موجود' });

    const image = player.strCutout || player.strThumb || player.strRender || null;

    res.json({
      success: !!image,
      image,
      name: player.strPlayer,
      team: player.strTeam
    });
  } catch (err) {
    console.error('❌ Player image error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
//   🖼️ صورة عامة (Unsplash للأقسام التانية)
// ═══════════════════════════════════════
// ═══════════════════════════════════════
//   🖼️ صورة عامة (Picsum للأقسام التانية)
// ═══════════════════════════════════════
app.get('/api/category-image', async (req, res) => {
  try {
    const category = req.query.category || 'general';
    const keyword = req.query.keyword || category;

    // Picsum — صور عشوائية بجودة عالية
    const seed = encodeURIComponent(keyword + '-' + category);
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    res.json({
      success: true,
      image: imageUrl,
      keyword
    });
  } catch (err) {
    console.error('❌ Category image error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
//   🤖 شرح مفصل للإجابة
// ═══════════════════════════════════════
app.post('/api/explain', async (req, res) => {
  try {
    const { question, correctAnswer, userAnswer } = req.body;

    if (!question || !correctAnswer) {
      return res.json({ success: false, error: 'بيانات ناقصة' });
    }

    const prompt = `
السؤال: ${question}
الإجابة الصحيحة: ${correctAnswer}
${userAnswer ? `إجابة المستخدم: ${userAnswer}` : 'المستخدم مجاوبش (الوقت خلص)'}

اشرح بالعربي في 2-3 أسطر بسيطة:
1. ليه الإجابة دي صح
2. معلومة إضافية مفيدة أو طريفة مرتبطة

اكتب الشرح بشكل مختصر وممتع، بدون مقدمات.
`;

    const text = await generateWithFallback(prompt);
    res.json({ success: true, explain: text.trim() });
  } catch (err) {
    console.error('❌ Explain Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Quiz Master Server running at http://localhost:${PORT}`);
  console.log(`📋 Available models: ${MODELS.join(' → ')}`);
  console.log(`🎯 Categories: ${Object.keys(CATEGORIES).join(', ')}`);
});
// ═══════════════════════════════════════
//   🚀 Vercel Export
// ═══════════════════════════════════════
export default app;