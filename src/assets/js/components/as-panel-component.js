document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-panel') === undefined) {
        class ASPanelElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
                this._onResize = e => this.resizeContent(e)
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

                if (!this.ready)
                    this.init()
                // global listener lives only while connected
                if (this.ready)
                    window.addEventListener('resize', this._onResize)
            }

            disconnectedCallback() {
                window.removeEventListener('resize', this._onResize)
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

                // heading acts as the disclosure button
                this.panelHeading.setAttribute('role', 'button')
                this.panelHeading.setAttribute('tabindex', '0')
                if (this.panelBody) {
                    if (!this.panelBody.id)
                        this.panelBody.id = `${this.panelId}-body`
                    this.panelHeading.setAttribute('aria-controls', this.panelBody.id)
                }

                this.addListeners()
                this.rotateIcon()

                this.ready = true
                this.broadcastEvent('as-panel:created', { id: this.panelId })
            }

            addListeners() {
                this.panelHeading.addEventListener('click', this.toggleContent.bind(this))
                this.panelHeading.addEventListener('keydown', e => {
                    if (e.code === 'Enter' || e.code === 'Space') {
                        e.preventDefault()
                        this.toggleContent()
                    }
                })
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
                this.panelHeading.setAttribute('aria-expanded', String(!this.hasAttribute('hide')))
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