const toggleControlsButton = document.querySelector('#toggle-controls')
const flipSideButton = document.querySelector('#flip-side')
const nav = document.querySelector('nav')

toggleControlsButton.addEventListener('click', () => {
  nav.classList.toggle('open')
  toggleControlsButton.blur()
})
flipSideButton.addEventListener('click', () => {
  nav.classList.toggle('right')
})
