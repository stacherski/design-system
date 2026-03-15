/**
 * main.js
 * Replace / extend this file with the actual design system JS bundle.
 *
 * Included here: simple tab-switching for the component detail pages.
 */

// RESOURCE #79 BEGIN 
document.addEventListener('DOMContentLoaded', navigation)

function navigation() {

  const navLinksLevelOne = document.querySelectorAll('nav div.l1.wrapper')
  const navLinksLevelTwo = document.querySelectorAll('nav div.l2.wrapper')

  navLinksLevelOne.forEach(link => {
    const icon = document.createElement('ts-icon')
    icon.setAttribute('name', '--ts-icon-caret-up')
    icon.setAttribute('size', 'l')
    link.append(icon)

    icon.addEventListener('click', () => {
      link.parentNode.toggleAttribute('active')
    })

  })
}
// RESOURCE #79 END
