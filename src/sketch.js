import P5 from 'p5'
import { generateFilter } from './hex-to-filter'
import { WELCOME_TEMPLATE } from './assets/templates'

const main = document.querySelector('main')
const boardCanvas = document.querySelector('#boardCanvas')
const gridCanvas = document.querySelector('#gridCanvas')
const playPauseButton = document.querySelector('#playpause')
const shuffleButton = document.querySelector('#shuffle')
const resetButton = document.querySelector('#reset')
const speedInput = document.querySelector('#speed')
const sizeInput = document.querySelector('#size')
const colorInput = document.querySelector('#color')
const colorInputLabel = document.querySelector('label:has(#color)')
const glowInput = document.querySelector('#neon')
const gridInput = document.querySelector('#grid')
const drawInput = document.querySelector('#draw')
const boundariesInput = document.querySelector('#boundaries')
const populationSpan = document.querySelector('#population')
const generationSpan = document.querySelector('#generation')
let prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

const getDefaultCellColor = () => prefersDark ? '#ffffff' : '#000000'
const getDefaultGridColor = () => prefersDark ? '#000000aa' : '#ffffffaa'
const minMaxCellSize = [1, 60]
const minMaxGlowSpread = [5, 10]
const minMaxSpeed = [1, 60]
const TEMPLATE_MARGINS = 5

let clientW = main.clientWidth - 1
let clientH = main.clientHeight - 1

let cellSize = 30
let strokeSize = cellSize > 20
  ? 1
  : (cellSize / 20).toFixed(1)
let speed = 60
let cellColor
let cellColorFilter
let cellGlow = true
let displayGrid = true
let drawingMode = false
let boardBoundaries = false
let isRunning = false
let userInteracted = false

function setUserInteracted (value) {
  if (userInteracted) return
  userInteracted = value
}

let cellColorChanged = false
let lastDrawnCell = { x: -1, y: -1 }

let prevColumnCount
let prevRowCount
let columnCount
let rowCount

let currentPopulation = 0
let currentGeneration = 0
let currentCells = []
let nextCells = []
let prevCells = []

colorInput.value = cellColor
glowInput.checked = cellGlow
speedInput.value = speed
sizeInput.value = cellSize
gridInput.checked = displayGrid
drawInput.checked = drawingMode
boundariesInput.checked = boardBoundaries

let boardImage

let resizeTimeout
let cellResizeTimeout

const grid = new P5(p5 => {
  p5.setup = () => {
    p5.createCanvas(cellSize * columnCount, cellSize * rowCount, gridCanvas)
    p5.noSmooth()
    p5.noLoop()

    p5.resize()
    p5.display(displayGrid)
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

const board = new P5(p5 => {
  p5.gameActions = {
    togglePlayPause: (value, byAdmin) => {
      if (!byAdmin) setUserInteracted(true)
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
      updateGeneration(0)
      randomizeBoard()
      paintBoard()
    },
    reset: (byAdmin) => {
      p5.noLoop()
      p5.gameActions.togglePlayPause(false, byAdmin)
      p5.clear()
      generate(true)
      updatePopulation(true)
      updateGeneration(0)
      updateVisualData()
    },
    setSpeed: (value) => {
      if (value === speed) return
      speed = value
      speedInput.value = value
      p5.frameRate(value)
    },
    setCellSize: (value) => {
      if (value === cellSize) return
      setUserInteracted(true)

      clearTimeout(cellResizeTimeout)

      cellResizeTimeout = setTimeout(() => {
        cellSize = value
        strokeSize = value > 20
          ? 1
          : (value / 20).toFixed(1)
        sizeInput.value = value
        updateBoardSize()
        p5.gameActions.scaleBoard()
      }, 100)
    },
    setCellColor: (value) => {
      if (value === cellColor) return
      cellColor = value
      cellColorFilter = generateFilter(value)
      colorInput.value = value
      colorInputLabel.style.background = value
      updateBoardFilters()
    },
    toggleGrid: (value) => {
      if (value === displayGrid) return
      const cleanValue = value !== undefined ? value : !displayGrid
      displayGrid = cleanValue
      gridInput.checked = cleanValue
      grid.display(cleanValue)
    },
    toggleDrawingMode: (value) => {
      if (value === drawingMode) return
      const cleanValue = value !== undefined ? value : !drawingMode
      drawingMode = cleanValue
      drawInput.checked = cleanValue

      boardCanvas.style.cursor = cleanValue ? 'url(\'pencil.ico\'), pointer' : 'auto'
    },
    toggleBoardBoundaries: (value) => {
      if (value === boardBoundaries) return
      const cleanValue = value !== undefined ? value : !boardBoundaries
      boardBoundaries = cleanValue
      boundariesInput.checked = cleanValue
      updateBoardFilters()
    },
    loadTemplate: (template) => {
      p5.gameActions.reset(true)
      cellSize = getTemplateCellSize(template)
      updateBoardSize()

      const marginTop = Math.floor((rowCount - template.length) / 2)
      const marginLeft = Math.floor((columnCount - template[0].length) / 2)

      for (let y = 0; y < template.length; y++) {
        const row = template[y]

        for (let x = 0; x < row.length; x++) {
          const cell = row[x]
          if (!cell) continue

          const idx = index(x + marginLeft, y + marginTop)
          currentCells[idx] = cell
        }
      }

      paintBoard()
    },
    scaleBoard: () => {
      const wDiff = columnCount - prevColumnCount
      const wDiffHalf = Math.floor(wDiff / 2)
      const hDiff = rowCount - prevRowCount
      const hDiffHalf = Math.floor(hDiff / 2)

      for (let y = 0; y < rowCount; y++) {
        const prevY = y - hDiffHalf
        if (prevY < 0 || prevY >= prevRowCount) continue

        const newArr = prevCells.slice(prevColumnCount * prevY + Math.max(0, 0 - wDiffHalf), prevColumnCount * prevY + Math.min(prevColumnCount + wDiffHalf, prevColumnCount))

        currentCells.set(newArr, index(Math.max(0, 0 + wDiffHalf), y))
      }

      paintBoard()
    }
  }

  p5.setup = () => {
    p5.frameRate(speed)
    p5.createCanvas(clientW - clientW % cellSize, clientH - clientH % cellSize, boardCanvas)
    p5.noSmooth()
    p5.fill(0)
    p5.noStroke()

    p5.gameActions.setCellColor(getDefaultCellColor())
    p5.gameActions.loadTemplate(WELCOME_TEMPLATE)

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

    setUserInteracted(true)

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

    setUserInteracted(true)

    const cellX = p5.floor(p5.mouseX / cellSize)
    const cellY = p5.floor(p5.mouseY / cellSize)

    if (cellX === lastDrawnCell.x && cellY === lastDrawnCell.y) return

    toggleCell(cellX, cellY)

    lastDrawnCell = { x: cellX, y: cellY }
  }

  p5.keyPressed = () => {
    let newSpeed, newCellSize, element

    // function longPress (actions) {
    //   actions()
    //   const timeout = setTimeout(() => {
    //     if (!p5.keyIsPressed) {
    //       clearTimeout(timeout)
    //       return
    //     }

    //     const interval = setInterval(() => {
    //       actions()
    //       if (!p5.keyIsPressed) clearInterval(interval)
    //     }, 50)
    //   }, 200)
    // }

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
      // C
      case 67:
        element = document.createElement('input')
        element.type = 'color'
        element.value = cellColor
        element.addEventListener('input', (e) => {
          cellColorChanged = true
          const newCellColor = e.target.value
          board.gameActions.setCellColor(newCellColor)
        })
        element.click()
        break
      // N
      case 78:
        cellGlow = !cellGlow
        glowInput.checked = cellGlow
        updateBoardFilters()
        break
      // B
      case 66:
        p5.gameActions.toggleBoardBoundaries()
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

  p5.windowResized = () => {
    clearTimeout(resizeTimeout)

    resizeTimeout = setTimeout(() => {
      clientW = main.clientWidth - 1
      clientH = main.clientHeight - 1

      updateBoardSize()

      if (userInteracted) p5.gameActions.scaleBoard()
      else p5.gameActions.loadTemplate(WELCOME_TEMPLATE)
    }, 100)
  }

  function toggleCell (x, y) {
    const cellIndex = index(x, y)
    const nextCellValue = currentCells[cellIndex] ? 0 : 1
    currentCells[cellIndex] = nextCellValue

    updatePopulation(nextCellValue ? 1 : -1)
    updateVisualData()

    if (!nextCellValue) p5.erase()
    p5.square(x * cellSize, y * cellSize, cellSize)
    if (!nextCellValue) p5.noErase()
  }

  function updateGridSize () {
    prevColumnCount = columnCount
    prevRowCount = rowCount
    columnCount = Math.floor(p5.width / cellSize)
    rowCount = Math.floor(p5.height / cellSize)

    const totalCells = rowCount * columnCount
    prevCells = currentCells
    currentCells = new Uint8Array(totalCells)
    nextCells = new Uint8Array(totalCells)
  }

  function index (x, y) {
    if (x < 0 || y < 0 || x >= columnCount || y >= rowCount) {
      return undefined
    }
    return y * columnCount + x
  }

  function updateBoardSize () {
    p5.resizeCanvas(clientW - clientW % cellSize, clientH - clientH % cellSize)
    updateGridSize()
    updateBoardFilters()
    grid.resize()
  }

  function updateGeneration (value) {
    currentGeneration = value !== undefined
      ? value
      : currentGeneration + 1
  }

  function updatePopulation (amount) {
    currentPopulation = amount === true
      ? 0
      : currentPopulation + amount
  }

  p5.draw = () => {
    if (!isRunning) return
    if (!currentPopulation) p5.gameActions.togglePlayPause(false)
    generate()
    updateGeneration()
    paintBoard()
  }

  function paintBoard () {
    updatePopulation(true)
    p5.clear()
    boardImage = p5.createImage(p5.width, p5.height)
    boardImage.loadPixels()
    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < columnCount; x++) {
        const cellIndex = index(x, y)

        if (!currentCells[cellIndex]) continue

        updatePopulation(1)
        paintCell(x, y)
      }
    }
    updateVisualData()
    boardImage.updatePixels()
    p5.image(boardImage, 0, 0)
  }

  function paintCell (x, y) {
    const pixel = y * 4 * columnCount * cellSize * cellSize + x * cellSize * 4

    for (let j = 0; j < cellSize; j++) {
      const yInc = j * columnCount * cellSize * 4
      for (let i = 0; i < cellSize; i++) {
        const xInc = i * 4
        boardImage.pixels[pixel + yInc + xInc] = 0
        boardImage.pixels[pixel + yInc + xInc + 1] = 0
        boardImage.pixels[pixel + yInc + xInc + 2] = 0
        boardImage.pixels[pixel + yInc + xInc + 3] = 255
      }
    }
  }

  function randomizeBoard () {
    for (let i = 0; i < currentCells.length; i++) {
      currentCells[i] = Math.random() > 0.5 ? 1 : 0
    }
  }

  function generate (reset) {
    for (let y = 0; y < rowCount; y++) {
      for (let x = 0; x < columnCount; x++) {
        const cellIndex = index(x, y)

        if (reset) {
          nextCells[cellIndex] = 0
          continue
        }

        const left = boardBoundaries
          ? x - 1
          : (x - 1 + columnCount) % columnCount
        const right = boardBoundaries
          ? x + 1
          : (x + 1) % columnCount
        const above = boardBoundaries
          ? y - 1
          : (y - 1 + rowCount) % rowCount
        const below = boardBoundaries
          ? y + 1
          : (y + 1) % rowCount

        const neighbours =
          (currentCells[index(left, above)] || 0) +
          (currentCells[index(x, above)] || 0) +
          (currentCells[index(right, above)] || 0) +
          (currentCells[index(left, y)] || 0) +
          (currentCells[index(right, y)] || 0) +
          (currentCells[index(left, below)] || 0) +
          (currentCells[index(x, below)] || 0) +
          (currentCells[index(right, below)] || 0)

        nextCells[cellIndex] =
          neighbours === 3 || (neighbours === 2 && currentCells[cellIndex]) ? 1 : 0
      }
    }

    [currentCells, nextCells] = [nextCells, currentCells]
  }
})

playPauseButton.addEventListener('click', () => board.gameActions.togglePlayPause())
shuffleButton.addEventListener('click', board.gameActions.shuffle)
resetButton.addEventListener('click', board.gameActions.reset)
boundariesInput.addEventListener('click', () => board.gameActions.toggleBoardBoundaries())
speedInput.addEventListener('input', (e) => {
  const newSpeed = +e.target.value
  board.gameActions.setSpeed(newSpeed)
})
sizeInput.addEventListener('input', (e) => {
  const newCellSize = +e.target.value
  board.gameActions.setCellSize(newCellSize)
})
colorInput.addEventListener('input', (e) => {
  cellColorChanged = true
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
  if (!cellColorChanged) {
    board.gameActions.setCellColor(getDefaultCellColor())
  }
  grid.resize()
})

function updateBoardFilters () {
  const shadowSpread = (cellSize - minMaxCellSize[0]) / (minMaxCellSize[1] - minMaxCellSize[0]) * (minMaxGlowSpread[1] - minMaxGlowSpread[0]) + minMaxGlowSpread[0]

  boardCanvas.style.filter = `${cellColorFilter} ${cellGlow ? `drop-shadow(0px 0px ${shadowSpread}px ${cellColor})` : ''}`

  boardCanvas.style.boxShadow = boardBoundaries
    ? '0 0 0 100vh black'
    : 'none'
}

function updateVisualData () {
  generationSpan.innerHTML = currentGeneration
  populationSpan.innerHTML = currentPopulation
}

function getTemplateCellSize (template) {
  const neededWidth = template[0].length + TEMPLATE_MARGINS * 2
  const neededHeight = template.length + TEMPLATE_MARGINS * 2

  let size = minMaxCellSize[1]

  for (; size >= minMaxCellSize[0]; size--) {
    if (neededWidth * size <= clientW &&
      neededHeight * size <= clientH
    ) break
  }

  return Math.max(size, minMaxCellSize[0])
}
