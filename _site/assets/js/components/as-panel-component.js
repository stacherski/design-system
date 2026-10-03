document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-panel') === undefined) {
        class ASPanelElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                // Panel ID
                this.panelId = this.getAttribute("id") || crypto.randomUUID()
                this.setAttribute('id', this.panelId)

                /// default options
                this.settings = {}
                this.settings.headingClass = this.getAttribute('heading-class') || '.panel-heading'
                this.settings.bodyClass = this.getAttribute('body-class') || '.panel-body'
                this.settings.breakpoint = this.getAttribute('breakpoint') || 800
                this.settings.iconName = this.getAttribute('icon-name') || 'plus'
                this.settings.rotate = this.getAttribute('rotate') || '-45deg'
                ///

                if (this.ready)
                    return
                this.init()
            }

            init() {
                if (this.ready)
                    return
                this.removeAttribute('hidden')

                this.panelHeading = this.querySelector(`${this.settings.headingClass}`)
                if (!this.panelHeading)
                    return

                this.panelBody = this.querySelector(`${this.settings.bodyClass}`)
                this.icon = document.createElement('as-icon')
                this.icon.setAttribute('name', `${this.settings.iconName}`)
                this.icon.setAttribute('size', 'l')

                this.panelHeading.append(this.icon)

                this.addListeners()
                this.rotateIcon()

                this.ready = true
                this.broadcastEvent('as-panel:created', { id: this.panelId })
            }

            addListeners() {
                this.panelHeading.addEventListener('click', this.toggleContent.bind(this))
                window.addEventListener('resize', (e) => this.resizeContent(e))
            }

            resizeContent(e) {
                if (e.target.innerWidth > this.settings.breakpoint) {
                    this.removeAttribute('hide')
                    this.rotateIcon()
                    this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: 'open' })
                    return
                }
                if (e.target.innerWidth < this.settings.breakpoint) {
                    this.setAttribute('hide', '')
                    this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: 'closed' })
                }

                this.rotateIcon()

            }

            toggleContent() {
                this.toggleAttribute('hide')
                setTimeout(() => this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: this.hasAttribute('hide') ? 'closed' : 'open' }), 1)
                setTimeout(() => this.rotateIcon(), 1)
            }

            rotateIcon() {
                !this.hasAttribute('hide') ? this.icon.style.setProperty('--rotate', `${this.settings.rotate}`) : this.icon.style.setProperty('--rotate', '0')
            }

            isEmpty(obj) {
                for (const prop in obj) {
                    if (Object.hasOwn(obj, prop))
                        return false;
                }
                return true;
            }

            broadcastEvent(name, detail = {}) {
                const cEvent = (this.isEmpty(detail)) ? new CustomEvent(name, { bubbles: true }) : new CustomEvent(name, { detail: detail, bubbles: true })
                this.dispatchEvent(cEvent)
                //console.log(cEvent)
            }
        }
        // register new custom element
        window.customElements.define("as-panel", ASPanelElement)
    }
})