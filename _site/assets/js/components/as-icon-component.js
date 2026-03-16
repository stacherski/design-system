document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-icon') === undefined) {
        class ASIconElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.icon = this.getAttribute('name') || 'user'
                this.isIconVar = this.icon.indexOf('--') > -1 ? true : false

                this.hasColor = this.hasAttribute('color') && this.getAttribute('color').length >= 3
                this.color = this.hasColor ? this.getAttribute('color') : '--as-color-accent'
                this.isColorVar = this.color.indexOf('--') > -1 ? true : false

                this.isImage = this.hasAttribute('image') ? true : false

                this.size = this.getAttribute('size') || 'default'
                this.label = this.getAttribute('label') || undefined

                this.isRotated = this.hasAttribute('rotate')

                if (this.ready)
                    return
                this.render()
            }

            // Specify observed attributes for detecting changes
            static get observedAttributes() {
                return ["new-name"];
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (name === 'new-name') {
                    this.icon = newValue
                    this.render()
                }
            }

            render() {
                this.style.setProperty('--icon', this.isIconVar ? `var(${this.icon})` : `var(--as-icon-${this.icon})`)

                if (this.hasColor)
                    this.style.setProperty('--color-icon', this.isColorVar ? `var(${this.color})` : `${this.color}`)

                this.style.setProperty('--size', `var(--as-size-${this.size})`)

                if (this.label !== undefined)
                    this.setAttribute('aria-label', this.label)
                else
                    this.setAttribute('aria-hidden', true)

                if (this.isRotated)
                    this.style.setProperty('--rotate', this.getAttribute('rotate'))

                if (this.isImage) {
                    const image = document.createElement('img')
                    const customProps = window.getComputedStyle(document.documentElement)
                    const name = this.isIconVar ? `${this.icon}` : `--as-icon-${this.icon}`
                    let data = customProps.getPropertyValue(name).replace('url(', '').replace(')', '').replaceAll('\\', '')
                    image.src = data
                    this.append(image)
                }

                this.removeAttribute('new-name')
                this.removeAttribute('color')
                this.removeAttribute('label')

                this.ready = true
            }
        }
        window.customElements.define("as-icon", ASIconElement)
    }
})