/* eslint-disable no-new */
import P5 from 'p5'

const main = document.querySelector('main')
const playPauseButton = document.querySelector('#playpause')
const randomButton = document.querySelector('#random')
const resetButton = document.querySelector('#reset')
const speedInput = document.querySelector('#speed')
const sizeInput = document.querySelector('#size')
const colorInput = document.querySelector('#color')
const gridInput = document.querySelector('#grid')
const populationSpan = document.querySelector('#population')
const generationSpan = document.querySelector('#generation')
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

const getStrokeSize = (cellSize) => {
  return cellSize > 20
    ? 1
    : (cellSize / 20).toFixed(1)
}

let cellSize = 30
let speed = 60
let columnCount
let rowCount
let currentPopulation = 0
let currentGeneration = 0
let currentCells = []
let nextCells = []
let isRunning = false
let cellColor = prefersDark ? '#ffffff' : '#000000'
const blankCellColor = prefersDark ? 0 : 255
let displayGrid = true
const w = main.scrollWidth
const h = main.scrollHeight

colorInput.value = cellColor
speedInput.value = speed
sizeInput.value = cellSize
gridInput.checked = displayGrid

const sketch = (p) => {
  const buttonActions = {
    play: () => {
      if (!currentGeneration) return
      p.loop()
      p.updateIsRunning(true)
    },
    pause: () => {
      p.noLoop()
      p.updateIsRunning(false)
    },
    randomize: () => {
      p.noLoop()
      p.updateIsRunning(false)
      p.randomizeBoard()
      p.paintBoard(true)
      p.updateGeneration(1)
    },
    reset: () => {
      p.noLoop()
      p.updateIsRunning(false)
      p.generate(true)
      p.paintBoard(true)
      p.updateGeneration(0)
    }
  }

  p.updateGridSize = () => {
    columnCount = p.floor(p.width / cellSize)
    rowCount = p.floor(p.height / cellSize)

    for (let row = 0; row < rowCount; row++) {
      currentCells[row] = new Array(columnCount).fill(0)
      nextCells[row] = new Array(columnCount).fill(0)
    }
  }

  p.updateCanvasSize = () => {
    p.resizeCanvas(w - w % cellSize, h - h % cellSize)
  }

  p.setup = () => {
    p.frameRate(speed)
    p.createCanvas(w - w % cellSize, h - h % cellSize)
    p.background(blankCellColor)

    p.updateGridSize()

    p.paintBoard(true)
    p.noLoop()
    p.describe(
      "Grid of squares that switch between white and black, demonstrating a simulation of John Conway's Game of Life. When clicked, the simulation resets."
    )

    playPauseButton.addEventListener('click', buttonActions.play)
    randomButton.addEventListener('click', buttonActions.randomize)
    resetButton.addEventListener('click', buttonActions.reset)
    speedInput.addEventListener('input', (e) => {
      speed = +e.target.value
      p.frameRate(speed)
    })
    sizeInput.addEventListener('input', (e) => {
      cellSize = +e.target.value

      p.updateCanvasSize()
      p.updateGridSize()
      buttonActions.reset()
    })
    colorInput.addEventListener('change', (e) => {
      cellColor = e.target.value
      p.paintBoard(false)
    })
    gridInput.addEventListener('change', (e) => {
      displayGrid = e.target.checked
      p.paintBoard(true)
    })
  }

  p.updateIsRunning = (state) => {
    isRunning = state
    playPauseButton.innerHTML = isRunning ? 'PAUSE' : 'PLAY'
    playPauseButton.removeEventListener('click', isRunning ? buttonActions.play : buttonActions.pause)
    playPauseButton.addEventListener('click', isRunning ? buttonActions.pause : buttonActions.play)
  }

  p.updateGeneration = (value) => {
    currentGeneration = value !== undefined
      ? value
      : currentGeneration + 1

    generationSpan.innerHTML = currentGeneration
  }

  p.updatePopulation = (reset) => {
    currentPopulation = reset
      ? 0
      : currentPopulation + 1

    populationSpan.innerHTML = currentPopulation
  }

  p.draw = () => {
    if (!isRunning) return
    p.generate()
    p.updateGeneration()
    p.paintBoard()
  }

  p.paintBoard = (doItAll) => {
    if (doItAll !== false) {
      p.updatePopulation(true)
    }

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        const currentCell = currentCells[row][col] || 0
        const previousCell = nextCells[row][col] || 0

        if (doItAll !== false && currentCell) {
          p.updatePopulation()
        }

        if (doItAll === true ||
          (doItAll === false && currentCell) ||
          (doItAll === undefined && currentCell !== previousCell)) {
          p.fill(currentCell ? cellColor : blankCellColor)
          p.strokeWeight(displayGrid
            ? getStrokeSize(cellSize)
            : 0)
          p.stroke(100)
          p.rect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }
  }

  p.randomizeBoard = () => {
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        currentCells[row][col] = p.random([0, 1])
      }
    }
  }

  p.generate = (reset) => {
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        if (reset) {
          nextCells[row][col] = 0
          continue
        }

        const left = (col - 1 + columnCount) % columnCount
        const right = (col + 1) % columnCount
        const above = (row - 1 + rowCount) % rowCount
        const below = (row + 1) % rowCount

        const neighbours =
          currentCells[above][left] +
          currentCells[above][col] +
          currentCells[above][right] +
          currentCells[row][left] +
          currentCells[row][right] +
          currentCells[below][left] +
          currentCells[below][col] +
          currentCells[below][right]

        nextCells[row][col] = (
          neighbours === 3 || (neighbours === 2 && currentCells[row][col])
        )
          ? 1
          : 0
      }
    }

    [currentCells, nextCells] = [nextCells, currentCells]
  }
}

new P5(sketch)
