// Kid-facing chrome strings, keyed by the pack's language. Arabic packs get
// Arabic chrome — same kid, learning Arabic school content.
// Parent area stays English for now.

export type UiKey =
  | "play"
  | "lessonWords"
  | "sayIt"
  | "sayItSub"
  | "read"
  | "readSub"
  | "journey"
  | "journeySub"
  | "stickers"
  | "stickersSub"
  | "boss"
  | "bossSub"
  | "petComing"
  | "petHatched"
  | "petBuddy"
  | "newWord"
  | "hearIt"
  | "slow"
  | "again"
  | "iKnowIt"
  | "fillGap"
  | "spellWord"
  | "listenSpell"
  | "tapOrder"
  | "spelledIt"
  | "traceIt"
  | "traceHint"
  | "erase"
  | "almost"
  | "niceOne"
  | "greatJob"
  | "playAgain"
  | "home"
  | "dayStreak";

const EN: Record<UiKey, string> = {
  play: "▶ Play",
  lessonWords: "📖 this lesson's words",
  sayIt: "Say it!",
  sayItSub: "record & listen",
  read: "Read",
  readSub: "the story",
  journey: "Journey",
  journeySub: "your path",
  stickers: "Stickers",
  stickersSub: "your prizes",
  boss: "Boss",
  bossSub: "tricky words",
  petComing: "Your buddy is coming!",
  petHatched: "Buddy hatched!",
  petBuddy: "Buddy the fox!",
  newWord: "New word",
  hearIt: "Hear it",
  slow: "Slow",
  again: "Again",
  iKnowIt: "I know it",
  fillGap: "Fill the gap",
  spellWord: "Spell the word",
  listenSpell: "Listen and spell",
  tapOrder: "tap the letters in order…",
  spelledIt: "You spelled it! ⭐",
  traceIt: "Trace the word",
  traceHint: "follow the dots with your finger",
  erase: "Erase",
  almost: "Almost — try again.",
  niceOne: "Nice one! ⭐",
  greatJob: "Great job!",
  playAgain: "Play again",
  home: "Home",
  dayStreak: "day streak",
};

const AR: Record<UiKey, string> = {
  play: "▶ العب",
  lessonWords: "📖 كلمات الدرس",
  sayIt: "قُلها!",
  sayItSub: "سجِّل واسمع",
  read: "اقرأ",
  readSub: "القصة",
  journey: "رحلتك",
  journeySub: "طريقك",
  stickers: "ملصقاتك",
  stickersSub: "جوائزك",
  boss: "الزعيم",
  bossSub: "كلمات صعبة",
  petComing: "صديقك قادم!",
  petHatched: "فقَسَ صديقك!",
  petBuddy: "بادي الثعلب!",
  newWord: "كلمة جديدة",
  hearIt: "اسمعها",
  slow: "ببطء",
  again: "مرة أخرى",
  iKnowIt: "أعرفها",
  fillGap: "املأ الفراغ",
  spellWord: "تهجَّ الكلمة",
  listenSpell: "اسمع وتهجَّ",
  tapOrder: "اضغط الحروف بالترتيب…",
  spelledIt: "تهجَّيتها صح! ⭐",
  traceIt: "تتبَّع الكلمة",
  traceHint: "امشِ بإصبعك على النقاط",
  erase: "امسح",
  almost: "قريب — حاول مرة أخرى.",
  niceOne: "أحسنت! ⭐",
  greatJob: "عمل رائع!",
  playAgain: "العب مرة أخرى",
  home: "الرئيسية",
  dayStreak: "أيام متتالية",
};

export const t = (lang: string | undefined, key: UiKey): string =>
  (lang === "ar" ? AR : EN)[key];
