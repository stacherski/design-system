document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-icon') === undefined) {
        class ASIconElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                if (this.ready)
                    return
                this.render()
            }

            // Specify observed attributes for detecting changes
            static get observedAttributes() {
                return ["name", "size", "color", "label", "rotate", "image"]
            }

            attributeChangedCallback(name, oldValue, newValue) {
                // before first render connectedCallback does the initial render
                if (this.ready && oldValue !== newValue)
                    this.render()
            }

            // reads every attribute fresh, so each render reflects the current state
            render() {
                this.icon = this.getAttribute('name') || 'user'
                this.isIconVar = this.icon.indexOf('--') > -1

                this.hasColor = this.hasAttribute('color') && this.getAttribute('color').length >= 3
                this.color = this.hasColor ? this.getAttribute('color') : '--as-color-accent'
                this.isColorVar = this.color.indexOf('--') > -1

                this.isImage = this.hasAttribute('image')
                this.size = this.getAttribute('size') || 'default'
                this.label = this.getAttribute('label') || undefined
                this.isRotated = this.hasAttribute('rotate')

                this.style.setProperty('--icon', this.isIconVar ? `var(${this.icon})` : `var(--as-icon-${this.icon})`)

                if (this.hasColor)
                    this.style.setProperty('--color-icon', this.isColorVar ? `var(${this.color})` : `${this.color}`)
                else
                    this.style.removeProperty('--color-icon')

                this.style.setProperty('--size', `var(--as-size-${this.size})`)

                if (this.label !== undefined) {
                    this.setAttribute('aria-label', this.label)
                    this.removeAttribute('aria-hidden')
                } else {
                    this.removeAttribute('aria-label')
                    this.setAttribute('aria-hidden', true)
                }

                // --rotate may also be driven from outside (e.g. as-panel), only clear what this attribute set
                if (this.isRotated) {
                    this.style.setProperty('--rotate', this.getAttribute('rotate'))
                    this._rotateFromAttr = true
                } else if (this._rotateFromAttr) {
                    this.style.removeProperty('--rotate')
                    this._rotateFromAttr = false
                }

                if (this.isImage) {
                    this.querySelector('img')?.remove()
                    const image = document.createElement('img')
                    const customProps = window.getComputedStyle(document.documentElement)
                    const name = this.isIconVar ? `${this.icon}` : `--as-icon-${this.icon}`
                    let data = customProps.getPropertyValue(name).replace('url(', '').replace(')', '').replaceAll('\\', '')
                    image.src = data
                    this.append(image)
                } else {
                    this.querySelector('img')?.remove()
                }

                this.ready = true
            }
        }
        window.customElements.define("as-icon", ASIconElement)
    }
})