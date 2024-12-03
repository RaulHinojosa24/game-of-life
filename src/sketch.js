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

let strokeSize = 1
let cellSize = 30
let speed = 60
let cellColor = prefersDark ? '#ffffff' : '#000000'
let displayGrid = true

let columnCount
let rowCount

let isRunning = false
let currentPopulation = 0
let currentGeneration = 0
let currentCells = []
let nextCells = []

const w = main.scrollWidth
const h = main.scrollHeight

colorInput.value = cellColor
speedInput.value = speed
sizeInput.value = cellSize
gridInput.checked = displayGrid

const sketch = (p5) => {
  let grid

  const buttonActions = {
    play: () => {
      if (!currentGeneration) return
      p5.loop()
      updateIsRunning(true)
    },
    pause: () => {
      p5.noLoop()
      updateIsRunning(false)
    },
    randomize: () => {
      p5.noLoop()
      updateIsRunning(false)
      randomizeBoard()
      paintBoard()
      updateGeneration(1)
    },
    reset: () => {
      p5.noLoop()
      updateIsRunning(false)
      generate(true)
      paintBoard()
      updateGeneration(0)
    }
  }

  p5.setup = () => {
    p5.frameRate(speed)
    p5.createCanvas(w - w % cellSize, h - h % cellSize)
    p5.clear()

    updateGridSize()
    paintBoard()

    p5.noLoop()
    p5.describe(
      "Grid of squares that switch between white and black, demonstrating a simulation of John Conway's Game of Life. When clicked, the simulation resets."
    )

    playPauseButton.addEventListener('click', buttonActions.play)
    randomButton.addEventListener('click', buttonActions.randomize)
    resetButton.addEventListener('click', buttonActions.reset)
    speedInput.addEventListener('input', (e) => {
      speed = +e.target.value
      p5.frameRate(speed)
    })
    sizeInput.addEventListener('input', (e) => {
      cellSize = +e.target.value
      strokeSize = cellSize > 20
        ? 1
        : (cellSize / 20).toFixed(1)

      updateCanvasSize()
      updateGridSize()
      buttonActions.reset()
    })
    colorInput.addEventListener('change', (e) => {
      cellColor = e.target.value
      paintBoard()
    })
    gridInput.addEventListener('change', (e) => {
      displayGrid = e.target.checked
      paintBoard()
    })
  }

  function updateGridSize () {
    columnCount = p5.floor(p5.width / cellSize)
    rowCount = p5.floor(p5.height / cellSize)

    for (let row = 0; row < rowCount; row++) {
      currentCells[row] = new Array(columnCount).fill(0)
      nextCells[row] = new Array(columnCount).fill(0)
    }

    updateGridImage()
  }

  function updateCanvasSize () {
    p5.resizeCanvas(w - w % cellSize, h - h % cellSize)
  }

  function updateGridImage () {
    grid = p5.createGraphics(p5.width, p5.height)
    grid.clear()

    grid.strokeWeight(strokeSize)
    grid.stroke(100)

    for (let row = 0; row <= rowCount; row++) {
      grid.line(0, cellSize * row, p5.width, cellSize * row)
    }
    for (let col = 0; col <= columnCount; col++) {
      grid.line(cellSize * col, 0, cellSize * col, p5.height)
    }
  }

  function updateIsRunning (state) {
    isRunning = state
    playPauseButton.innerHTML = isRunning ? 'PAUSE' : 'PLAY'
    playPauseButton.removeEventListener('click', isRunning ? buttonActions.play : buttonActions.pause)
    playPauseButton.addEventListener('click', isRunning ? buttonActions.pause : buttonActions.play)
  }

  function updateGeneration (value) {
    currentGeneration = value !== undefined
      ? value
      : currentGeneration + 1

    generationSpan.innerHTML = currentGeneration
  }

  function updatePopulation (reset) {
    currentPopulation = reset
      ? 0
      : currentPopulation + 1

    populationSpan.innerHTML = currentPopulation
  }

  p5.draw = () => {
    if (!isRunning) return
    generate()
    updateGeneration()
    paintBoard()
  }

  function paintBoard () {
    updatePopulation(true)
    p5.clear()

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        const currentCell = currentCells[row][col] || 0

        if (!currentCell) continue

        updatePopulation()

        p5.fill(cellColor)
        p5.noStroke()
        p5.rect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }

    if (displayGrid) {
      p5.image(grid, 0, 0)
    }
  }

  function randomizeBoard () {
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        currentCells[row][col] = p5.random([0, 1])
      }
    }
  }

  function generate (reset) {
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
