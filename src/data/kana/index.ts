const modules = import.meta.glob('./glyphs/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const glyphs = new Map<string, string>()

for (const [path, svg] of Object.entries(modules)) {
  const match = path.match(/\/([^/]+)\.svg$/u)
  if (match) glyphs.set(match[1], svg)
}

export function getGlyphSvg(kana: string): string | undefined {
  return glyphs.get(kana.normalize('NFC'))
}

export function hasGlyph(kana: string): boolean {
  return glyphs.has(kana.normalize('NFC'))
}

export const glyphSource = {
  name: 'strokesvg',
  url: 'https://github.com/zhengkyl/strokesvg',
  license: 'SIL Open Font License 1.1（Klee One由来のかなSVG）',
}
