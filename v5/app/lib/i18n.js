/* NeuroDifference i18n — runtime RU→EN overlay.
 * Views keep emitting Russian source strings. When lang === "en" we walk the
 * rendered DOM and swap known phrases + attributes (placeholder/aria-label/
 * title). No per-view edits, no build step, idempotent. Compound names, ids and
 * dose notes are English already, so they never match a Russian key.
 * Adding a translation later = one line in PHRASES or PATTERNS. Nothing else.
 */

let lang = "ru";

export const LANGS = [
  ["ru", "Русский"],
  ["en", "English"],
];

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next === "en" ? "en" : "ru";
  try {
    document.documentElement.setAttribute("lang", lang);
  } catch (e) {
    /* no document during tests */
  }
}

/* Exact matches on a trimmed text node / attribute value. */
const PHRASES = {
  /* --- navigation sections --- */
  "Обучение": "Learning",
  "Клиника": "Clinic",
  "Атлас": "Atlas",
  "Инструменты": "Tools",
  "Приложение": "App",

  /* --- navigation items / route titles --- */
  "Главная": "Home",
  "Препараты": "Compounds",
  "Карта мозга": "Brain map",
  "Карточки": "Flashcards",
  "Состояния": "Conditions",
  "Состояние": "Condition",
  "Анализы": "Bloodwork",
  "Показатель": "Marker",
  "PK-кривые": "PK curves",
  "Сборка стека": "Stack builder",
  "Поиск по симптомам": "Symptom search",
  "Красные флаги": "Red flags",
  "Биохимический атлас": "Biochemical atlas",
  "Карта органов": "Organ map",
  "Карта конвергенции": "Convergence map",
  "Калькулятор пептидов": "Peptide calculator",
  "Лаборатория доз": "Dose lab",
  "План снижения": "Taper plan",
  "Сравнение": "Compare",
  "Взаимодействия": "Interactions",
  "Доказательность": "Evidence",
  "Исследования": "Research",
  "Спроси индекс": "Ask the index",
  "Блокнот": "Notebook",
  "Настройки": "Settings",
  "Аудит данных": "Data audit",
  "Мишень": "Target",
  "Путь": "Pathway",
  "Мозг": "Brain",
  "Ещё": "More",
  "Системы": "Systems",

  /* --- shell / brand / topbar / drawer / search --- */
  "доказательность · препараты": "evidence · compounds",
  "доказательность · препараты · пути": "evidence · compounds · pathways",
  "Открыть меню": "Open menu",
  "Поиск": "Search",
  "Карточки к повторению": "Cards due for review",
  "Искать везде": "Search everywhere",
  "Не удалось отрисовать этот экран": "This screen failed to render",
  "Перезагрузить": "Reload",
  "Готова новая версия": "A new version is ready",
  "Перезагрузи, чтобы подхватить свежую сборку": "Reload to pick up the latest build",
  "Обновить": "Update",
  "Позже": "Later",

  /* --- common buttons / labels --- */
  "Назад": "Back",
  "Все": "All",
  "Применить": "Apply",
  "Авто": "Auto",
  "Сохранить": "Save",
  "Отмена": "Cancel",
  "Закрыть": "Close",
  "Сбросить всё": "Reset everything",
  "Экспорт бэкапа": "Export backup",
  "Импорт": "Import",
  "Копировать JSON": "Copy JSON",
  "Добавить препараты": "Add compounds",
  "Добавить препарат": "Add compound",
  "Проверить взаимодействия": "Check interactions",
  "Подписаться": "Subscribe",
  "Скрыть": "Hide",
  "Скрыть плашку подписки": "Hide subscribe plate",
  "живьём": "live",
  "график": "chart",
  "пресет": "preset",
  "свой": "custom",
  "яркость нормализуется при применении": "brightness is normalised on apply",
  "применяется сразу": "applies instantly",
  "только локально": "local only",
  "опционально": "optional",
  "пройдено": "completed",
  "Все уроки": "All lessons",
  "Все уроки пройдены": "All lessons completed",
  "Отлично. Повтори карточки, чтобы механизмы остались свежими.": "Nice. Review your cards to keep the mechanisms fresh.",
  "Продолжить": "Continue",
  "Повторить карточки": "Review cards",
  "К препаратам": "Browse compounds",
  "Открыть проверку": "Open checker",
  "Открыть путь": "Open pathway",
  "Читать запись": "Read entry",
  "В стек": "Add to stack",

  /* --- home --- */
  "Ещё не спишь.": "Still awake.",
  "Доброе утро.": "Good morning.",
  "Добрый день.": "Good afternoon.",
  "Добрый вечер.": "Good evening.",
  "Карта нейрофармакологии с градацией доказательности: препараты, рецепторные системы, взаимодействия и математика, которая за ними стоит.":
    "A neuropharmacology map graded by evidence: compounds, receptor systems, interactions and the maths behind them.",
  "Прогресс уровня": "Level progress",
  "Быстрые действия": "Quick actions",
  "Сразу к нужному инструменту": "Jump straight to a tool",
  "PK-симулятор": "PK simulator",
  "Кривые концентрации, полувыведение и накопление": "Concentration curves, half-life and accumulation",
  "Проверка взаимодействий": "Interaction checker",
  "Комбинации против базы правил": "Combinations checked against the rule base",
  "Проводник путей": "Pathway explorer",
  "Синтез, рецепторы и мишени препаратов": "Synthesis, receptors and drug targets",
  "План снижения дозы": "Dose taper plan",
  "Из полувыведения — в график снижения": "From half-life to a taper schedule",
  "Сравнение препаратов": "Compare compounds",
  "Две-три монографии, факт за фактом": "Two or three monographs, fact by fact",
  "Живые исследования": "Live research",
  "Поиск PubMed по запросу — ничего не хранится": "PubMed search on demand — nothing is stored",
  "Спроси библиотеку": "Ask the library",
  "Ответы простым языком из локальных данных": "Plain-language answers from local data",
  "Твой стек": "Your stack",
  "Добавь препараты, чтобы проверить их вместе": "Add compounds to check them together",
  "В стеке пока пусто": "Your stack is empty",
  "Открой любой препарат и нажми «В стек» — движок взаимодействий будет начеку.":
    "Open any compound and hit “Add to stack” — the interaction engine stays on guard.",
  "Курсы": "Courses",
  "От мембранного потенциала до грамотности доказательности": "From membrane potential to evidence literacy",
  "Препарат дня": "Compound of the day",
  "Система дня": "System of the day",
  "Ключ доказательности": "Evidence key",
  "нейромедиаторные пути": "neurotransmitter pathways",
  "квизов ещё не было": "no quizzes yet",
  "В этой комбинации серьёзное взаимодействие": "This combination has a serious interaction",
  "Обнаружено взаимодействие высокого риска": "A high-risk interaction was detected",
  "Есть взаимодействия, о которых стоит знать": "There are interactions worth knowing about",

  /* --- subscribe plate --- */
  "Бесплатный доступ — ничего не закрыто": "Free access — nothing is locked",
  "Все монографии, пути и квизы открыты. Подпишись на Telegram: новые препараты, учебные дропы и заметки о релизах.":
    "Every monograph, pathway and quiz is open. Subscribe on Telegram for new compounds, study drops and release notes.",
  "Скрыто — вернуть можно в настройках": "Hidden — bring it back in settings",

  /* --- settings --- */
  "Всё хранится локально в этом браузере. Без аккаунта, без синхронизации, без слежки.":
    "Everything is stored locally in this browser. No account, no sync, no tracking.",
  "Внешний вид": "Appearance",
  "Скин": "Skin",
  "Акцент": "Accent",
  "Плотность": "Density",
  "Анимации": "Animations",
  "Пульсация на карте мозга и hover-переходы. Выключи, чтобы экономить батарею.":
    "Pulses on the brain map and hover transitions. Turn off to save battery.",
  "Плашка подписки": "Subscribe plate",
  "Баннер «бесплатный доступ» со ссылкой на Telegram. Можно скрыть — ничего в приложении от этого не закроется.":
    "The “free access” banner with a Telegram link. Hide it if you like — nothing in the app gets locked.",
  "Размер текста": "Text size",
  "Масштабирует все экраны. На маленьких телефонах удобно 110–115%.":
    "Scales every screen. On small phones 110–115% is comfortable.",
  "Фильтр доказательности": "Evidence filter",
  "Скрывать препараты ниже выбранного порога доказательности. Применяется к списку препаратов.":
    "Hide compounds below the chosen evidence threshold. Applies to the compound list.",
  "Полувыведение кофеина": "Caffeine half-life",
  "Активность CYP1A2 у людей варьирует примерно 2–9 ч. Меняет кривую кофеина по умолчанию в лаборатории.":
    "Human CYP1A2 activity varies roughly 2–9 h. Changes the default caffeine curve in the lab.",
  "Данные": "Data",
  "Удаляет XP, серию, прогресс уроков, расписание карточек, стек, заметки и сохранённое. Отменить нельзя.":
    "Deletes XP, streak, lesson progress, card schedule, stack, notes and saved items. Cannot be undone.",
  "О приложении": "About",
  "NeuroDifference — личный учебный инструмент: энциклопедия препаратов с градацией доказательности, атлас нейромедиаторов, песочница фармакокинетики и курсы с интервальным повторением. Это не медицинское изделие.":
    "NeuroDifference is a personal study tool: a compound encyclopaedia graded by evidence, a neurotransmitter atlas, a pharmacokinetics sandbox and courses with spaced repetition. It is not a medical device.",
  "Не медицинская рекомендация": "Not medical advice",
  "Ничто здесь не является рекомендацией принимать, комбинировать, снижать или отменять какое-либо вещество. Дозировки — справочные величины из литературы, не назначения. Поговори с врачом, который знает твою историю.":
    "Nothing here is a recommendation to take, combine, taper or stop any substance. Doses are reference values from the literature, not prescriptions. Talk to a doctor who knows your history.",
  "Твой прогресс": "Your progress",
  "Серия": "Streak",
  "Уроков пройдено": "Lessons completed",
  "Точность квизов": "Quiz accuracy",
  "Сохранено": "Saved",
  "В стеке": "In stack",
  "Заметки": "Notes",
  "Горячие клавиши": "Keyboard shortcuts",
  "Стек пуст. Добавляй препараты со страниц записей, чтобы отслеживать, что реально принимаешь.":
    "Stack is empty. Add compounds from their entries to track what you actually take.",
  "Показывать все": "Show all",
  "От анекдотических": "From anecdotal",
  "От доклинических": "From preclinical",
  "От ограниченных": "From limited",
  "От умеренных": "From moderate",
  "Только сильные": "Strong only",
  "Ключ NCBI (опционально)": "NCBI key (optional)",
  "Свой ключ NCBI E-utilities поднимает живой поиск с 3 до 10 запросов в секунду. Хранится только на этом устройстве и отправляется только в NCBI. Без ключа всё работает.":
    "Your own NCBI E-utilities key raises live search from 3 to 10 requests per second. Stored only on this device and sent only to NCBI. Everything works without a key.",

  /* --- settings: accents / skins / densities --- */
  "Фиолетовый": "Violet",
  "Янтарный": "Amber",
  "Бирюзовый": "Teal",
  "Розовый": "Rose",
  "Зелёный": "Green",
  "Синий": "Blue",
  "Циан": "Cyan",
  "Лаймовый": "Lime",
  "Оранжевый": "Orange",
  "Маджента": "Magenta",
  "Аврора": "Aurora",
  "Мягкий свет за матовыми карточками": "Soft light behind matte cards",
  "Осциллограф": "Oscilloscope",
  "Фосфорные трассы на сетке": "Phosphor traces on a grid",
  "Призма": "Prism",
  "Спектральные градиенты, жёсткие края": "Spectral gradients, hard edges",
  "Просторная": "Comfortable",
  "Компактная": "Compact",

  /* --- core: evidence labels --- */
  "Сильная": "Strong",
  "Умеренная": "Moderate",
  "Ограниченная": "Limited",
  "Доклиника": "Preclinical",
  "Анекдотическая": "Anecdotal",
  "Сильные доказательства на людях": "Strong human evidence",
  "Умеренные доказательства": "Moderate evidence",
  "Ограниченные данные на людях": "Limited human data",
  "Доклиника / животные": "Preclinical / animal",
  "Только анекдотические": "Anecdotal only",

  /* --- core: disclaimers --- */
  "Только образовательный справочник — не медицинская рекомендация.":
    "Educational reference only — not medical advice.",
  "Образовательный справочник — не медицинская рекомендация.":
    "Educational reference — not medical advice.",
  "Образовательный справочник, не медицинская рекомендация.":
    "Educational reference, not medical advice.",
  "NeuroDifference обобщает опубликованную фармакологию для обучения и грамотности снижения вреда.":
    "NeuroDifference summarises published pharmacology for learning and harm-reduction literacy.",
  "Дозы — справочные точки из литературы, никогда не назначение. Всё, что ты кладёшь в свой организм —":
    "Doses are reference points from the literature, never a prescription. Anything you put into your body —",
  "особенно рецептурное, пептиды или комбинации — должно обсуждаться с врачом или фармацевтом.":
    "especially prescription drugs, peptides or combinations — should be discussed with a doctor or pharmacist.",

  /* --- toasts / misc --- */
  "Скопировано": "Copied",
  "JSON состояния скопирован": "State JSON copied",
  "Бэкап скачан": "Backup downloaded",
  "Бэкап восстановлен": "Backup restored",
  "Всё сброшено": "Everything reset",
  "Фильтр доказательности обновлён": "Evidence filter updated",
  "Ключ PubMed сохранён на этом устройстве": "PubMed key saved on this device",
  "Ключ PubMed удалён — анонимный лимит": "PubMed key removed — anonymous limit",
  "Плашка подписки возвращена": "Subscribe plate restored",
  "Плашка подписки скрыта": "Subscribe plate hidden",
  "Введи hex-цвет, например #8b7bff": "Enter a hex colour, e.g. #8b7bff",
  "Заменить все текущие данные этим бэкапом?": "Replace all current data with this backup?",
  "Удалить весь прогресс, заметки, стек и настройки на этом устройстве?":
    "Delete all progress, notes, stack and settings on this device?",
  "Последняя проверка — отменить нельзя. Сбросить?": "Last check — this cannot be undone. Reset?",
  "нейромедиаторная система": "neurotransmitter system",
  "Уроки": "Lessons",
  "Страницы": "Pages",
  "Поиск по всему приложению": "Search the whole app",
  "Препараты, системы, уроки…": "Compounds, systems, lessons…",
  "Ничего не найдено. Попробуй название препарата, нейромедиатор или «взаимодействия».": "Nothing found. Try a compound name, a neurotransmitter or “interactions”.",
  "дашборд": "dashboard",
  "интервальное повторение": "spaced repetition",
  "регионы и пути": "regions and pathways",
  "пути, ферменты и мишени": "pathways, enzymes and targets",
  "органы, гормоны и болезни": "organs, hormones and diseases",
  "нити препаратов в регионы": "compound threads into regions",
  "арифметика разведения": "reconstitution arithmetic",
  "песочница фармакокинетики": "pharmacokinetics sandbox",
  "безопасность стека": "stack safety",
  "исследовательские темы": "research topics",
  "поисковый ассистент": "search assistant",
  "твои заметки": "your notes",
  "вид и данные": "appearance and data",
};

/* Dynamic strings carrying numbers. Tested against the trimmed text. */
const PATTERNS = [
  [/^Уровень (\d+)$/, "Level $1"],
  [/^(\d+) препаратов$/, "$1 compounds"],
  [/^(\d+) систем$/, "$1 systems"],
  [/^(\d+) уроков$/, "$1 lessons"],
  [/^(\d+) карточек$/, "$1 flashcards"],
  [/^(\d+) правил взаимодействий$/, "$1 interaction rules"],
  [/^(\d+) классов$/, "$1 classes"],
  [/^(\d+) дн\. подряд( 🔥)?$/, "$1 day streak$2"],
  [/^(\d+) дн\.$/, "$1 days"],
  [/^(\d+) ч$/, "$1 h"],
  [/^(\d+) мин$/, "$1 min"],
  [/^точность квизов (\d+)%$/, "quiz accuracy $1%"],
  [/^(\d+) зрелых · (\d+) всего$/, "$1 mature · $2 total"],
  [/^(\d+) преп\. · сигналов: (\d+)$/, "$1 compounds · signals: $2"],
  [/^Сигналов: (\d+)\. Посмотри детали, прежде чем доверять этому стеку\.$/, "$1 signals. Review the details before trusting this stack."],
  [/^Убрать (.+)$/, "Remove $1"],
  [/^(.+) убран из стека$/, "$1 removed from stack"],
  [/^Импорт не удался: (.+)$/, "Import failed: $1"],
  [/^Элемент$/, "Item"],
];

function tr(value) {
  if (lang !== "en" || !value) return value;
  const key = value.trim();
  if (!key) return value;
  const hit = PHRASES[key];
  if (hit != null) return hit;
  for (const [re, rep] of PATTERNS) {
    if (re.test(key)) return key.replace(re, rep);
  }
  return value;
}

/** Explicit helper for code paths that build strings (toasts, etc.). */
export function t(ru) {
  return tr(ru);
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);
const ATTRS = ["placeholder", "aria-label", "title"];

/**
 * Translate a rendered subtree in place. No-op when lang === "ru".
 * Skips user-editable content and anything marked data-notx (compound names,
 * dose notes and rendered markdown are never touched).
 */
export function applyI18n(root) {
  if (lang !== "en") return;
  const scope = root || document.body;
  if (!scope || !scope.querySelectorAll) return;

  scope.querySelectorAll("[placeholder],[aria-label],[title]").forEach((el) => {
    if (el.closest("[data-notx]")) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const nv = tr(v);
      if (nv !== v) el.setAttribute(a, nv);
    }
  });

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    const p = node.parentElement;
    if (!p || SKIP_TAGS.has(p.tagName) || p.closest("[data-notx]")) continue;
    const v = node.nodeValue;
    if (!v || !v.trim()) continue;
    const nv = tr(v);
    if (nv !== v) node.nodeValue = nv;
  }
}

export default { LANGS, getLang, setLang, t, applyI18n };