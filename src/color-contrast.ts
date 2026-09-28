/** Pick readable text for a solid hex color used as a dynamic surface. */
export function contrastTextColor(color: string): '#0b1529' | '#ffffff' {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (!hex) return '#ffffff'

  const normalized = hex.length === 3
    ? [...hex].map((part) => part + part).join('')
    : hex
  const channels = [0, 2, 4].map((index) => {
    const value = Number.parseInt(normalized.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]

  return luminance > 0.179 ? '#0b1529' : '#ffffff'
}
