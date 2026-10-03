// Fails the build when a token pair drops below its WCAG AA minimum.
// Reads the real tokens from src/assets/css/components/as-tokens-component.css.
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/assets/css/components/as-tokens-component.css', import.meta.url), 'utf8')
const T = Object.fromEntries([...css.matchAll(/--as-color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(m => [m[1], m[2]]))
const factor = Number(css.match(/--as-color-lightness-factor:\s*([\d.]+)/)[1])
const neutralMul = Number(css.match(/--as-color-text-neutral:[^;]*calc\(l \+ ([\d.]+) \*/)[1])

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
const lum = c => c.map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

// hsl(from c h s calc(l ± n))
function shiftL(h, delta) {
  const [r, g, b] = hex(h), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  const d = max - min, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let H = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  H = (H * 60 + 360) % 360
  const L = Math.min(1, Math.max(0, l + delta / 100)), C = (1 - Math.abs(2 * L - 1)) * s
  const X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = L - C / 2
  const [R, G, B] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(H / 60) % 6]
  return [R + m, G + m, B + m]
}
// hsl(from c h 0 calc(l + n))
const grey = (h, delta) => { const [r, g, b] = hex(h); const L = Math.min(1, (Math.max(r, g, b) + Math.min(r, g, b)) / 2 + delta / 100); return [L, L, L] }
const rgbHex = c => '#' + c.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')

const navBgStrong = rgbHex(shiftL(T['background-nav'], -factor))
const pairs = [ // [label, foreground, background, minimum ratio]
  ['text / background',               hex(T.text),                         hex(T.background),            4.5],
  ['text / panel',                    hex(T.text),                         hex(T['background-panel']),   4.5],
  ['button text / accent',            hex(T['text-button']),               hex(T.accent),                4.5],
  ['button text / accent-weak',       hex(T['text-button']),               shiftL(T.accent, factor),     4.5],
  ['text-neutral / panel',            grey(T.text, neutralMul * factor),   hex(T['background-panel']),   4.5],
  ['text-neutral / background',       grey(T.text, neutralMul * factor),   hex(T.background),            4.5],
  ['nav active text / nav bg',        hex(T['text-nav-active']),           hex(T['background-nav']),     4.5],
  ['nav active text / nav bg strong', hex(T['text-nav-active']),           hex(navBgStrong),             4.5],
  ['button text / warning surface',   hex(T['text-button']),               hex(T['status-warning-text-bg']), 4.5],
    ['button text / error',             hex(T['text-button']),               hex(T['status-error']),       4.5],
  ['button text / success',           hex(T['text-button']),               hex(T['status-success']),     4.5],
  ['input border / panel (3:1)',      hex(T['border-input']),              hex(T['background-panel']),   3],
  ['focus ring (accent) / panel',     hex(T.accent),                       hex(T['background-panel']),   3],
]
let failed = 0
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg), ok = r >= min
  if (!ok) failed++
  console.log(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}  (min ${min})  ${label}`)
}
process.exit(failed ? 1 : 0)
