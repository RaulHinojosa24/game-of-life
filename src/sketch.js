import P5 from 'p5'
import { generateFilter } from './hex-to-filter'

const main = document.querySelector('main')
const boardCanvas = document.querySelector('#boardCanvas')
const gridCanvas = document.querySelector('#gridCanvas')
const playPauseButton = document.querySelector('#playpause')
const shuffleButton = document.querySelector('#shuffle')
const resetButton = document.querySelector('#reset')
const speedInput = document.querySelector('#speed')
const sizeInput = document.querySelector('#size')
const colorInput = document.querySelector('#color')
const glowInput = document.querySelector('#glow')
const gridInput = document.querySelector('#grid')
const drawInput = document.querySelector('#draw')
const populationSpan = document.querySelector('#population')
const generationSpan = document.querySelector('#generation')
let prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

const getDefaultCellColor = () => prefersDark ? '#ffffff' : '#000000'
const getDefaultGridColor = () => prefersDark ? '#000000aa' : '#ffffffaa'
const minMaxCellSize = [1, 60]
const minMaxGlowSpread = [5, 10]
const minMaxSpeed = [1, 60]

let strokeSize = 1
let cellSize = 30
let speed = 20
let cellColor = getDefaultCellColor()
let cellColorFilter = generateFilter(cellColor)
let cellGlow = true
let displayGrid = true
let drawingMode = false
let isRunning = false

let lastDrawnCell = { x: -1, y: -1 }

let columnCount
let rowCount

let currentPopulation = 0
let currentGeneration = 0
let currentCells = []
let nextCells = []

const w = main.scrollWidth - 1
const h = main.scrollHeight - 1

colorInput.value = cellColor
glowInput.checked = cellGlow
speedInput.value = speed
sizeInput.value = cellSize
gridInput.checked = displayGrid
drawInput.checked = drawingMode

const board = new P5(p5 => {
  p5.gameActions = {
    togglePlayPause: (value) => {
      if (isRunning) {
        p5.noLoop()
      } else {
        if (!currentPopulation) return
        p5.loop()
      }

      isRunning = value !== undefined ? value : !isRunning
      playPauseButton.innerHTML = `${isRunning ? 'PAUSE' : 'PLAY'} (P)`
    },
    shuffle: () => {
      p5.noLoop()
      p5.gameActions.togglePlayPause(false)
      randomizeBoard()
      paintBoard()
      updateGeneration(0)
    },
    reset: () => {
      p5.noLoop()
      p5.gameActions.togglePlayPause(false)
      generate(true)
      paintBoard()
      updateGeneration(0)
    },
    setSpeed: (value) => {
      speed = value
      speedInput.value = value
      p5.frameRate(value)
    },
    setCellSize: (value) => {
      cellSize = value
      strokeSize = value > 20
        ? 1
        : (value / 20).toFixed(1)
      sizeInput.value = value
      updateCanvasSize()
      updateGridSize()
      grid.resize()
      p5.gameActions.reset()
    },
    setCellColor: (value) => {
      cellColor = value
      cellColorFilter = generateFilter(value)
      colorInput.value = value
      updateBoardFilters()
    },
    toggleGrid: (value) => {
      const cleanValue = value !== undefined ? value : !displayGrid
      displayGrid = cleanValue
      gridInput.checked = cleanValue
      grid.display(cleanValue)
    },
    toggleDrawingMode: (value) => {
      const cleanValue = value !== undefined ? value : !drawingMode
      drawingMode = cleanValue
      drawInput.checked = cleanValue

      boardCanvas.style.cursor = cleanValue ? 'url(\'pencil.ico\'), pointer' : 'auto'
    }
  }

  p5.setup = () => {
    p5.frameRate(speed)
    p5.createCanvas(w - w % cellSize, h - h % cellSize, boardCanvas)
    p5.clear()

    updateGridSize()
    updateBoardFilters()
    p5.gameActions.shuffle()

    p5.noLoop()
    p5.describe(
      'A grid of squares alternating between black and white, visually representing a simulation of John Conway\'s Game of Life. With each tick, a new generation is born, evolving dynamically over time according to predefined rules.'
    )
  }

  p5.mouseClicked = (event) => {
    if (
      event.target.tagName !== 'CANVAS' ||
      !drawingMode ||
      (p5.mouseX < 0 || p5.mouseY < 0 || p5.mouseX > columnCount * cellSize || p5.mouseY >= rowCount * cellSize)
    ) return

    const cellX = p5.floor(p5.mouseX / cellSize)
    const cellY = p5.floor(p5.mouseY / cellSize)

    if (cellX === lastDrawnCell.x && cellY === lastDrawnCell.y) {
      lastDrawnCell = { x: -1, y: -1 }
      return
    }

    toggleCell(cellX, cellY)

    lastDrawnCell = { x: -1, y: -1 }
  }

  p5.mouseDragged = (event) => {
    if (
      event.target.tagName !== 'CANVAS' ||
      !drawingMode ||
      (p5.mouseX < 0 || p5.mouseY < 0 || p5.mouseX > columnCount * cellSize || p5.mouseY >= rowCount * cellSize)
    ) return

    const cellX = p5.floor(p5.mouseX / cellSize)
    const cellY = p5.floor(p5.mouseY / cellSize)

    if (cellX === lastDrawnCell.x && cellY === lastDrawnCell.y) return

    toggleCell(cellX, cellY)

    lastDrawnCell = { x: cellX, y: cellY }
  }

  p5.keyPressed = () => {
    let newSpeed, newCellSize

    switch (p5.keyCode) {
      // P
      case 80:
        p5.gameActions.togglePlayPause()
        break
      // R
      case 82:
        p5.gameActions.reset()
        break
      // S
      case 83:
        p5.gameActions.shuffle()
        break
      // G
      case 71:
        p5.gameActions.toggleGrid()
        break
      // D
      case 68:
        p5.gameActions.toggleDrawingMode()
        break
      // UP
      case 38:
        newSpeed = p5.min(minMaxSpeed[1], speed + 1)
        p5.gameActions.setSpeed(newSpeed)
        break
      // DOWN
      case 40:
        newSpeed = p5.max(minMaxSpeed[0], speed - 1)
        p5.gameActions.setSpeed(newSpeed)
        break
      // LEFT
      case 37:
        newCellSize = p5.max(minMaxCellSize[0], cellSize - 1)
        p5.gameActions.setCellSize(newCellSize)
        break
      // RIGHT
      case 39:
        newCellSize = p5.min(minMaxCellSize[1], cellSize + 1)
        p5.gameActions.setCellSize(newCellSize)
        break
      default:
        break
    }
  }

  function toggleCell (x, y) {
    const nextCellValue = currentCells[y][x] ? 0 : 1
    currentCells[y][x] = nextCellValue
    updatePopulation(nextCellValue ? 1 : -1)
    paintCell(x, y)
  }

  function updateGridSize () {
    columnCount = p5.floor(p5.width / cellSize)
    rowCount = p5.floor(p5.height / cellSize)

    for (let row = 0; row < rowCount; row++) {
      currentCells[row] = new Array(columnCount).fill(0)
      nextCells[row] = new Array(columnCount).fill(0)
    }
  }

  function updateCanvasSize () {
    p5.resizeCanvas(w - w % cellSize, h - h % cellSize)
  }

  function updateGeneration (value) {
    currentGeneration = value !== undefined
      ? value
      : currentGeneration + 1

    generationSpan.innerHTML = currentGeneration
  }

  function updatePopulation (amount) {
    currentPopulation = amount === true
      ? 0
      : currentPopulation + amount

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

        updatePopulation(1)

        paintCell(col, row)
      }
    }
  }

  function paintCell (x, y) {
    const cellValue = currentCells[y][x]

    p5.fill(0)
    p5.noStroke()
    if (!cellValue) p5.erase()

    p5.square(x * cellSize, y * cellSize, cellSize)
    p5.noErase()
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
})

const grid = new P5(p5 => {
  p5.setup = () => {
    p5.createCanvas(cellSize * columnCount, cellSize * rowCount, gridCanvas)
    p5.noLoop()

    p5.resize()
  }

  p5.resize = () => {
    p5.resizeCanvas(cellSize * columnCount, cellSize * rowCount)
    p5.clear()
    p5.strokeWeight(strokeSize)
    p5.stroke(getDefaultGridColor())

    for (let row = 0; row <= rowCount; row++) {
      p5.line(0, cellSize * row, p5.width, cellSize * row)
    }
    for (let col = 0; col <= columnCount; col++) {
      p5.line(cellSize * col, 0, cellSize * col, p5.height)
    }
  }

  p5.display = (value) => {
    gridCanvas.style.display = value ? 'block' : 'none'
  }
})

playPauseButton.addEventListener('click', board.gameActions.togglePlayPause)
shuffleButton.addEventListener('click', board.gameActions.shuffle)
resetButton.addEventListener('click', board.gameActions.reset)
speedInput.addEventListener('input', (e) => {
  const newSpeed = +e.target.value
  board.gameActions.setSpeed(newSpeed)
})
sizeInput.addEventListener('input', (e) => {
  const newCellSize = +e.target.value
  board.gameActions.setCellSize(newCellSize)
  updateBoardFilters()
})
colorInput.addEventListener('input', (e) => {
  const newCellColor = e.target.value
  board.gameActions.setCellColor(newCellColor)
})
glowInput.addEventListener('change', (e) => {
  cellGlow = e.target.checked
  updateBoardFilters()
})
gridInput.addEventListener('change', (e) => {
  board.gameActions.toggleGrid()
})
drawInput.addEventListener('change', (e) => {
  board.gameActions.toggleDrawingMode()
})
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  prefersDark = event.matches
  board.gameActions.setCellColor(getDefaultCellColor())
  grid.resize()
})

const updateBoardFilters = () => {
  const shadowSpread = (cellSize - minMaxCellSize[0]) / (minMaxCellSize[1] - minMaxCellSize[0]) * (minMaxGlowSpread[1] - minMaxGlowSpread[0]) + minMaxGlowSpread[0]

  boardCanvas.style.filter = `${cellColorFilter} ${cellGlow ? `drop-shadow(0px 0px ${shadowSpread}px ${cellColor})` : ''}`
}
