const SMALL_KANA: Record<string, string> = {
  'ぁ': 'ちいさい あ',
  'ぃ': 'ちいさい い',
  'ぅ': 'ちいさい う',
  'ぇ': 'ちいさい え',
  'ぉ': 'ちいさい お',
  'っ': 'ちいさい つ',
  'ゃ': 'ちいさい や',
  'ゅ': 'ちいさい ゆ',
  'ょ': 'ちいさい よ',
  'ゎ': 'ちいさい わ',
}

export function normalizeReading(value: string): string {
  return value.normalize('NFC').replace(/[\s　]+/g, '')
}

export function splitKana(value: string): string[] {
  return Array.from(normalizeReading(value))
}

export function speechForKana(kana: string): string {
  return SMALL_KANA[kana] ?? kana
}

export function isHiraganaReading(value: string): boolean {
  const normalized = normalizeReading(value)
  return normalized.length > 0 && /^[\u3041-\u309fー]+$/u.test(normalized)
}

export function readingVersion(reading: string): string {
  return normalizeReading(reading)
}
