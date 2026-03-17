document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-tab') === undefined) {
        class ASTab extends HTMLElement {

            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.tabId = this.getAttribute('id') || crypto.randomUUID()
                this.iconName = this.hasAttribute('icon-name') ? this.getAttribute('icon-name') : ''

                // Initialize
                if (this.ready)
                    return

                this.init()
            }

            init() {
                if (this.iconName.length > 0) {
                    const icon = document.createElement('as-icon')
                    icon.setAttribute('name', this.iconName)
                    this.prepend(icon)
                }

                this.ready = true
            }
        }

        // register new custom element
        window.customElements.define("as-tab", ASTab)
    }
})