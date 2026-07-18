import { describe, expect, it } from 'vitest'
import {
  countColors,
  hasAlphaChannel,
  isOpaqueBackgroundColor,
  isTransparentColor,
  shouldTraverseBackgroundColor,
} from './colors'

describe('color visibility helpers', () => {
  it.each(['', 'transparent', 'rgba(0, 0, 0, 0)', 'rgb(1 2 3 / 0)', '#0000', '#11223300'])(
    'recognizes %s as transparent',
    (color) => expect(isTransparentColor(color)).toBe(true)
  )

  it.each(['rgb(1, 2, 3)', '#123', '#112233', 'hsl(0 0% 0%)'])('keeps %s visible', (color) =>
    expect(isTransparentColor(color)).toBe(false)
  )

  it.each([
    ['rgba(1, 2, 3, 1)', false],
    ['rgb(1 2 3 / 50%)', true],
    ['rgb(1 2 3 / 100%)', false],
    ['#123f', false],
    ['#11223380', true],
  ])('detects whether %s has a non-opaque alpha channel', (color, expected) => {
    expect(hasAlphaChannel(color as string)).toBe(expected)
  })

  it('only treats visible colors without transparency as opaque backgrounds', () => {
    expect(isOpaqueBackgroundColor('rgb(1, 2, 3)')).toBe(true)
    expect(isOpaqueBackgroundColor('transparent')).toBe(false)
    expect(isOpaqueBackgroundColor('rgb(1 2 3 / 50%)')).toBe(false)
    expect(shouldTraverseBackgroundColor('#11223380')).toBe(true)
  })
})

describe('countColors', () => {
  it('combines matching authored and computed colors while preserving order', () => {
    expect(
      countColors([
        { color: 'var(--brand)', computedColor: 'rgb(1, 2, 3)', value: 10 },
        { color: '#fff', computedColor: 'rgb(255, 255, 255)', value: 5 },
        { color: 'var(--brand)', computedColor: 'rgb(1, 2, 3)', value: 7 },
      ])
    ).toEqual([
      { color: 'var(--brand)', computedColor: 'rgb(1, 2, 3)', value: 17 },
      { color: '#fff', computedColor: 'rgb(255, 255, 255)', value: 5 },
    ])
  })

  it('does not merge the same authored color when computed colors differ', () => {
    expect(
      countColors([
        { color: 'currentColor', computedColor: 'rgb(0, 0, 0)', value: 1 },
        { color: 'currentColor', computedColor: 'rgb(255, 255, 255)', value: 2 },
        { color: '', computedColor: '', value: 100 },
      ])
    ).toHaveLength(2)
  })
})
