// Comprehensive Turkish & English profanity/inappropriate words filter

const BLOCKED_WORDS = [
  // === TURKISH PROFANITY & SLURS ===
  'amk', 'amq', 'amına', 'amınakoyim', 'amınakoyayım', 'amınıza', 'amcık', 'amcik',
  'ananı', 'ananızı', 'anasını', 'anasini', 'ananıskim', 'anasının',
  'orospu', 'orospuçocuğu', 'orospucocugu', 'orosbucocugu', 'oç', 'oc',
  'piç', 'pic', 'piçkurusu',
  'siktir', 'sikeyim', 'sikerim', 'siktirgit', 'sikiş', 'sikis', 'sikim', 'sikimi',
  'yarrak', 'yarrağ', 'yarrag', 'yarrağımı', 'yarak',
  'göt', 'got', 'götünü', 'gotunu', 'götveren', 'gotveren',
  'pezevenk', 'kahpe', 'ibne', 'gavat', 'döl', 'dol',
  'kaltak', 'şerefsiz', 'serefsiz', 'haysiyetsiz',
  'puşt', 'pust', 'dangalak', 'gerizekalı', 'gerizekali', 'geri zekalı', 'geri zekali',
  'aptal', 'salak', 'mal', 'bok', 'boktan',
  'hassiktir', 'hssktr', 'lan', 'ulan',
  'taşak', 'tasak', 'taşşak', 'tassak',
  'dalyarak', 'dalyarrak',
  'aq', 'mk', 'mq', 'sktr', 'sktir', 'sktrgt', 'amg', 'amj',
  'yavşak', 'yavsak', 'kevaşe', 'kevase', 'sürtük', 'surtuk', 'fahişe', 'fahise',
  'meme', 'götoş', 'gotos', 'dölü', 'dolu',
  'kezban', 'kodumun', 'kodumunun',
  'züppeli', 'hıyar', 'hiyar', 'çük', 'cuk',
  'orosbu', 'orsbcocugu', 'orsbucocugu',
  'tipini', 'ananın', 'ananin', 'bacını', 'bacini', 'bacın',
  'sikik', 'sikicem', 'sikici', 'sikilmiş',
  'amına koyayım', 'amına koyim', 'ananı sikeyim', 'seni sikeyim',
  'senin ananı', 'senin bacını',

  // === TURKISH SEXUAL TERMS ===
  'seks', 'cinsel', 'oral', 'anal', 'vajina', 'penis', 'mastürbasyon', 'masturbasyon',
  'porno', 'pornografi', 'erotik', 'sikiş', 'sikis',
  'sakso', 'tecavüz', 'tecavuz', 'taciz',
  'travesti', 'fuhuş', 'fuhus',

  // === ENGLISH PROFANITY ===
  'fuck', 'fucker', 'fucking', 'fck', 'fuk', 'fcking',
  'shit', 'shitty', 'bullshit',
  'bitch', 'biatch',
  'asshole', 'arsehole', 'ass',
  'dick', 'dickhead',
  'pussy', 'pussies',
  'whore', 'slut', 'slutty',
  'bastard', 'cunt',
  'nigger', 'nigga', 'negro',
  'faggot', 'fag',
  'retard', 'retarded',
  'motherfucker', 'mofo',
  'cock', 'cocksucker',
  'wanker', 'twat', 'prick',
  'damn', 'dammit',
  'stfu', 'gtfo', 'lmfao',

  // === ENGLISH SEXUAL TERMS ===
  'porn', 'pornography', 'hentai', 'xxx',
  'blowjob', 'handjob', 'rimjob',
  'orgasm', 'erection', 'dildo', 'vibrator',
  'nude', 'nudes', 'naked',
  'boobs', 'tits', 'titties',
  'cum', 'cumshot', 'jizz',
  'milf', 'gilf',
  'rape', 'molest',

  // === HATE SPEECH / DISCRIMINATION ===
  'nazi', 'hitler',
  'ırkçı', 'irkci', 'ırkçılık',
  'homofobik', 'transfobik',
];

// Leet-speak / character substitution map
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  '+': 't', '€': 'e', '£': 'l',
};

// Normalize Turkish characters and leet-speak for matching
function normalize(text: string): string {
  let result = text.toLowerCase();

  // Replace leet-speak characters
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    result = result.split(leet).join(char);
  }

  // Normalize Turkish characters
  result = result
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g');

  // Remove repeated characters (e.g., "fuuuck" → "fuck")
  result = result.replace(/(.)\1{2,}/g, '$1');

  // Remove separators used to bypass (dots, dashes, underscores, spaces between single chars)
  result = result.replace(/[.\-_*~]/g, '');

  // Remove non-alphanumeric except spaces
  result = result.replace(/[^a-z0-9\s]/g, '');

  return result;
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  // Also check version without any spaces (catches "s i k t i r")
  const noSpaces = normalized.replace(/\s+/g, '');

  return BLOCKED_WORDS.some(blocked => {
    const normalizedBlocked = normalize(blocked);
    const blockedNoSpaces = normalizedBlocked.replace(/\s+/g, '');

    // Check in original normalized text (word boundary or substring)
    const words = normalized.split(/\s+/);
    const wordMatch = words.some(word => word === normalizedBlocked || word.includes(normalizedBlocked));

    // Check in no-spaces version (catches spaced-out bypasses like "s.i.k.t.i.r")
    const noSpaceMatch = noSpaces.includes(blockedNoSpaces);

    return wordMatch || noSpaceMatch;
  });
}

export function getProfanityError(): string {
  return 'Uygunsuz veya hakaret içeren kelimeler kullanılamaz';
}
