const toggleControlsButton = document.querySelector('#toggle-controls')
const flipSideButton = document.querySelector('#flip-side')
const modalElement = document.querySelector('.modal')
const aboutButton = document.querySelector('#about')
const closeModalButtons = document.querySelectorAll('.modal button')
const nav = document.querySelector('nav')

toggleControlsButton.addEventListener('click', () => {
  nav.classList.toggle('open')
  toggleControlsButton.blur()
})
flipSideButton.addEventListener('click', () => {
  nav.classList.toggle('right')
})
aboutButton.addEventListener('click', () => {
  modalElement.classList.toggle('open')
})
closeModalButtons.forEach(button => {
  button.addEventListener('click', () => {
    modalElement.classList.toggle('open')
  })
})
