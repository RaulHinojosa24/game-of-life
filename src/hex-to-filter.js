/**
 * Massive credits to Barrett Sonntag
 * Original source code: https://codepen.io/sosuke/pen/Pjoqqp
 */

class Color {
  constructor (r, g, b) {
    this.set(r, g, b)
  }

  toString () {
    return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`
  }

  set (r, g, b) {
    this.r = this.clamp(r)
    this.g = this.clamp(g)
    this.b = this.clamp(b)
  }

  hueRotate (angle = 0) {
    const rad = (angle / 180) * Math.PI
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)
    this.multiply([
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072
    ])
  }

  grayscale (value = 1) {
    this.multiply(this.createGrayscaleMatrix(value))
  }

  sepia (value = 1) {
    this.multiply(this.createSepiaMatrix(value))
  }

  saturate (value = 1) {
    this.multiply(this.createSaturateMatrix(value))
  }

  multiply (matrix) {
    const newR = this.clamp(this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2])
    const newG = this.clamp(this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5])
    const newB = this.clamp(this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8])
    this.set(newR, newG, newB)
  }

  brightness (value = 1) {
    this.linear(value)
  }

  contrast (value = 1) {
    this.linear(value, -(0.5 * value) + 0.5)
  }

  linear (slope = 1, intercept = 0) {
    this.r = this.clamp(this.r * slope + intercept * 255)
    this.g = this.clamp(this.g * slope + intercept * 255)
    this.b = this.clamp(this.b * slope + intercept * 255)
  }

  invert (value = 1) {
    this.r = this.clamp((value + this.r / 255 * (1 - 2 * value)) * 255)
    this.g = this.clamp((value + this.g / 255 * (1 - 2 * value)) * 255)
    this.b = this.clamp((value + this.b / 255 * (1 - 2 * value)) * 255)
  }

  hsl () {
    const r = this.r / 255
    const g = this.g / 255
    const b = this.b / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h, s

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return { h: h * 100, s: s * 100, l: l * 100 }
  }

  clamp (value) {
    return Math.max(0, Math.min(255, value))
  }

  createGrayscaleMatrix (value) {
    const v = 1 - value
    return [
      0.2126 + 0.7874 * v, 0.7152 - 0.7152 * v, 0.0722 - 0.0722 * v,
      0.2126 - 0.2126 * v, 0.7152 + 0.2848 * v, 0.0722 - 0.0722 * v,
      0.2126 - 0.2126 * v, 0.7152 - 0.7152 * v, 0.0722 + 0.9278 * v
    ]
  }

  createSepiaMatrix (value) {
    const v = 1 - value
    return [
      0.393 + 0.607 * v, 0.769 - 0.769 * v, 0.189 - 0.189 * v,
      0.349 - 0.349 * v, 0.686 + 0.314 * v, 0.168 - 0.168 * v,
      0.272 - 0.272 * v, 0.534 - 0.534 * v, 0.131 + 0.869 * v
    ]
  }

  createSaturateMatrix (value) {
    return [
      0.213 + 0.787 * value, 0.715 - 0.715 * value, 0.072 - 0.072 * value,
      0.213 - 0.213 * value, 0.715 + 0.285 * value, 0.072 - 0.072 * value,
      0.213 - 0.213 * value, 0.715 - 0.715 * value, 0.072 + 0.928 * value
    ]
  }
}

class Solver {
  constructor (target, baseColor) {
    this.target = target
    this.targetHSL = target.hsl()
    this.reusedColor = new Color(0, 0, 0)
  }

  solve () {
    const result = this.solveNarrow(this.solveWide())
    return {
      values: result.values,
      loss: result.loss,
      filter: this.css(result.values)
    }
  }

  solveWide () {
    const A = 5
    const c = 15
    const a = [60, 180, 18000, 600, 1.2, 1.2]

    let best = { loss: Infinity }
    for (let i = 0; best.loss > 25 && i < 3; i++) {
      const initial = [50, 20, 3750, 50, 100, 100]
      const result = this.spsa(A, a, c, initial, 1000)
      if (result.loss < best.loss) {
        best = result
      }
    }
    return best
  }

  solveNarrow (wide) {
    const A = wide.loss
    const c = 2
    const A1 = A + 1
    const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1]
    return this.spsa(A, a, c, wide.values, 500)
  }

  spsa (A, a, c, values, iters) {
    const alpha = 1
    const gamma = 1 / 6

    let best = null
    let bestLoss = Infinity
    const deltas = new Array(6)
    const highArgs = new Array(6)
    const lowArgs = new Array(6)

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma)
      for (let i = 0; i < 6; i++) {
        deltas[i] = Math.random() > 0.5 ? 1 : -1
        highArgs[i] = values[i] + ck * deltas[i]
        lowArgs[i] = values[i] - ck * deltas[i]
      }

      const lossDiff = this.loss(highArgs) - this.loss(lowArgs)
      for (let i = 0; i < 6; i++) {
        const g = lossDiff / (2 * ck) * deltas[i]
        const ak = a[i] / Math.pow(A + k + 1, alpha)
        values[i] = this.fix(values[i] - ak * g, i)
      }

      const loss = this.loss(values)
      if (loss < bestLoss) {
        best = [...values]
        bestLoss = loss
      }
    }
    return { values: best, loss: bestLoss }
  }

  fix (value, idx) {
    const maxValues = [100, 100, 7500, 360, 200, 200]
    const max = maxValues[idx]

    if (idx === 3) {
      value = ((value % max) + max) % max // Ensure value is within [0, max)
    } else {
      value = Math.max(0, Math.min(max, value))
    }
    return value
  }

  loss (filters) {
    const color = this.reusedColor
    color.set(0, 0, 0)

    color.invert(filters[0] / 100)
    color.sepia(filters[1] / 100)
    color.saturate(filters[2] / 100)
    color.hueRotate(filters[3] * 3.6)
    color.brightness(filters[4] / 100)
    color.contrast(filters[5] / 100)

    const colorHSL = color.hsl()
    return (
      Math.abs(color.r - this.target.r) +
      Math.abs(color.g - this.target.g) +
      Math.abs(color.b - this.target.b) +
      Math.abs(colorHSL.h - this.targetHSL.h) +
      Math.abs(colorHSL.s - this.targetHSL.s) +
      Math.abs(colorHSL.l - this.targetHSL.l)
    )
  }

  css (filters) {
    return `invert(${Math.round(filters[0])}%) sepia(${Math.round(filters[1])}%) saturate(${Math.round(filters[2])}%) hue-rotate(${Math.round(filters[3] * 3.6)}deg) brightness(${Math.round(filters[4])}%) contrast(${Math.round(filters[5])}%)`
  }
}

function hexToRgb (hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null
}

export const generateFilter = (hex) => {
  const rgb = hexToRgb(hex)
  const color = new Color(...rgb)
  const solver = new Solver(color)
  const result = solver.solve()
  return result.filter
}
