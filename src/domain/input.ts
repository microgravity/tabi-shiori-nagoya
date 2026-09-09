export interface Point {
  x: number
  y: number
}

export function pointInViewBox(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  size = 600,
): Point {
  return {
    x: ((clientX - rect.left) / rect.width) * size,
    y: ((clientY - rect.top) / rect.height) * size,
  }
}

export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function hasMeaningfulInk(strokes: Point[][]): boolean {
  return strokes.some((stroke) => {
    let distance = 0
    for (let index = 1; index < stroke.length; index += 1) {
      distance += pointDistance(stroke[index - 1], stroke[index])
    }
    return distance >= 12
  })
}
