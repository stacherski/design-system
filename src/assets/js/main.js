document.addEventListener('DOMContentLoaded', navigation)

function navigation() {

  const navLinksLevelOne = document.querySelectorAll('nav div.l1.wrapper')
  const navLinksLevelTwo = document.querySelectorAll('nav div.l2.wrapper')

  navLinksLevelOne.forEach(link => {
    const icon = document.createElement('as-icon')
    icon.setAttribute('name', '--as-icon-caret-up')
    icon.setAttribute('size', 'l')
    link.append(icon)

    icon.addEventListener('click', () => {
      link.parentNode.toggleAttribute('active')
    })

  })
}

window.AS = window.AS || {}