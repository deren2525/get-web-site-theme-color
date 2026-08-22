export type WeightedColor = {
  color: string
  computedColor: string
  value: number
}

const getAlpha = (color: string): number | null => {
  const normalizedColor = color.trim().toLowerCase()
  const hex = normalizedColor.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i)?.[1]
  if (hex) {
    const alpha = hex.length === 4 ? hex[3]! + hex[3]! : hex.slice(6, 8)
    return Number.parseInt(alpha, 16) / 255
  }

  const functionalColor = normalizedColor.match(/^rgba?\((.*)\)$/)?.[1]
  if (!functionalColor) return null

  const slashAlpha = functionalColor.split('/')[1]?.trim()
  const commaParts = functionalColor.split(',')
  const alpha = slashAlpha ?? (commaParts.length === 4 ? commaParts[3]!.trim() : null)
  if (alpha === null) return null

  const numericAlpha = Number.parseFloat(alpha)
  if (!Number.isFinite(numericAlpha)) return null
  return alpha.endsWith('%') ? numericAlpha / 100 : numericAlpha
}

export const isTransparentColor = (color: string): boolean => {
  const normalizedColor = color.trim().toLowerCase()
  if (!normalizedColor || normalizedColor === 'transparent') return true
  return getAlpha(normalizedColor) === 0
}

export const hasAlphaChannel = (color: string): boolean => {
  const alpha = getAlpha(color)
  return alpha !== null && alpha < 1
}

export const isVisibleColor = (color: string): boolean =>
  Boolean(color) && !isTransparentColor(color)

export const isOpaqueBackgroundColor = (color: string): boolean =>
  isVisibleColor(color) && !hasAlphaChannel(color)

export const shouldTraverseBackgroundColor = (color: string): boolean =>
  isTransparentColor(color) || hasAlphaChannel(color)

export const countColors = (data: WeightedColor[]): WeightedColor[] => {
  const count = new Map<string, WeightedColor>()

  data.forEach(({ color, computedColor, value }) => {
    if (!color) return

    const key = `${color}\n${computedColor}`
    const current = count.get(key)
    if (current) {
      current.value += value
    } else {
      count.set(key, { color, computedColor, value })
    }
  })

  return Array.from(count.values())
}
