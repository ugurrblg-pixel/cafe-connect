// Turkish profanity/inappropriate words filter
const BLOCKED_WORDS = [
  // Common Turkish profanity & slurs
  'amk', 'amına', 'amınakoyim', 'ananı', 'ananızı', 'orospu', 'orospuçocuğu',
  'piç', 'siktir', 'sikeyim', 'sikerim', 'siktirgit', 'yarrak', 'yarrağ',
  'göt', 'götünü', 'pezevenk', 'kahpe', 'ibne', 'gavat', 'döl', 'meme',
  'kaltak', 'şerefsiz', 'haysiyetsiz', 'puşt', 'dangalak', 'gerizekalı',
  'aptal', 'salak', 'mal', 'geri zekalı', 'bok', 'boktan', 'hassiktir',
  'lan', 'ulan', 'amcık', 'taşak', 'dalyarak', 'oç', 'aq', 'mk',
  'sktr', 'sktir', 'yavşak', 'kevaşe', 'sürtük', 'fahişe',
  // English profanity basics
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'whore', 'slut',
  'bastard', 'cunt', 'nigger', 'faggot', 'retard',
];

// Normalize Turkish characters for matching
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/[^a-z0-9\s]/g, '');
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);
  
  return BLOCKED_WORDS.some(blocked => {
    const normalizedBlocked = normalize(blocked);
    // Check exact word match or substring in longer words
    return words.some(word => word === normalizedBlocked || word.includes(normalizedBlocked));
  });
}

export function getProfanityError(): string {
  return 'Uygunsuz veya hakaret içeren kelimeler kullanılamaz';
}
