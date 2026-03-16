document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-class-toggle') === undefined) {
        class ASClassToggle extends HTMLElement {
            connectedCallback() {
                // Table Actions ID
                this.classToggleId = crypto.randomUUID()

                this.targetElements = this.getAttribute('target-element').split('|')
                this.targetClasses = this.getAttribute('target-class').replaceAll('.', '').split('|') || ['toggle']
                this.targetState = this.getAttribute('target-state') || false

                this.buttonClass = this.getAttribute('button-class') || ''
                this.buttonText = this.getAttribute('button-text') || ''

                this.iconName = this.getAttribute('icon-name') || false
                this.iconRotate = this.getAttribute('icon-rotate') || '0deg'

                // Initialize
                if (!this.targetElements)
                    return
                this.init()
            }

            init() {
                this.innerHTML = `
                    <button class="${this.buttonClass}">${this.buttonText}${this.iconName ? '<as-icon name="' + this.iconName + '"></as-icon>' : ''}</button>
                `
                setTimeout(() => {
                    this.button = this.querySelector('button')
                    this.button.addEventListener('click', this.toggleClasses.bind(this))
                    this.icon = this.button.querySelector('as-icon')
                    this.toggleClasses()
                }, 1)

            }

            toggleClass() {
                this.targetState ? this.targetElement.classList.add(this.targetClass) : this.targetElement.classList.remove(this.targetClass)
                if (this.icon)
                    this.targetState ? this.icon.style.setProperty('--rotate', this.iconRotate) : this.icon.style.removeProperty('--rotate')
                this.targetState = !this.targetState
            }

            toggleClasses() {
                if (this.targetState) {
                    this.targetElements.forEach((el, idx) => document.querySelector(el).classList.add(this.targetClasses[idx]))
                }
                else {
                    this.targetElements.forEach((el, idx) => document.querySelector(el).classList.remove(this.targetClasses[idx]))
                }

                if (this.icon)
                    this.targetState ? this.icon.style.setProperty('--rotate', this.iconRotate) : this.icon.style.removeProperty('--rotate')
                this.targetState = !this.targetState
            }


            isEmpty(obj) {
                for (const prop in obj)
                    if (Object.hasOwn(obj, prop))
                        return false;
                return true;
            }

            broadcastEvent(name, detail = {}) {
                const cEvent = (this.isEmpty(detail)) ? new CustomEvent(name) : new CustomEvent(name, { detail: detail })
                this.dispatchEvent(cEvent)
            }

        }
        window.customElements.define("as-class-toggle", ASClassToggle)
    }
})