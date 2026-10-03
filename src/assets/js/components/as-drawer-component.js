document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-drawer') === undefined) {
        class ASDrawer extends HTMLElement {
            connectedCallback() {
                // build once: connectedCallback also runs when the element is moved
                if (this.ready)
                    return
                this.ready = true

                // Drawer ID
                this.drawerId = this.getAttribute("id") || crypto.randomUUID()
                // set default ID
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.drawerId)
                /// default options
                this.settings = {}
                this.settings.position = this.getAttribute('position') || 'bottom'
                this.settings.button = this.getAttribute('button-text') || 'Open drawer'
                this.settings.closeButton = this.getAttribute('close-text') || 'Close'
                this.settings.delay = this.getAttribute('delay') || 10
                this.settings.transitionTime = this.getAttribute('transition-time') || 500
                ///
                this.settings.content = this.innerHTML
                this.broadcastEvent('as-drawer:created', { id: this.drawerId, position: this.settings.position })
                this.render()
            }

            render() {
                // render Drawer structure
                this.innerHTML = `
                    <button opendrawer class="btn btn__solid_primary">${this.settings.button}</button>
                    <div hidden class="as-drawer ${this.settings.position}" role="dialog" aria-modal="true" aria-label="${this.getAttribute('label') || this.settings.button}" data-id="${this.drawerId}">${this.settings.content}<button type="button" class="btn" closedrawer><as-icon name="--as-icon-times-solid"></as-icon> ${this.settings.closeButton}</button></div>
                `
                this.style.setProperty('--as-drawer-transition-time', `${this.settings.transitionTime}ms`)
                this.openbutton = this.querySelector('button[opendrawer]')
                this.closebutton = this.querySelector('button[closedrawer]')
                this.drawer = this.querySelector('.as-drawer')

                this.body = document.querySelector('body')
                this.bindEvents()
            }

            bindEvents() {
                this.openbutton.addEventListener('click', e => this.openDrawer())
                this.closebutton.addEventListener('click', e => this.closeDrawer())
                this._onKeydown = e => this.handleKeydown(e)
            }

            handleKeydown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault()
                    this.closeDrawer()
                    return
                }
                if (e.key !== 'Tab')
                    return
                // keep focus inside the modal drawer
                const focusable = [...this.drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
                if (!focusable.length)
                    return
                const first = focusable[0], last = focusable[focusable.length - 1]
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }

            openDrawer() {
                if (this.overlay?.isConnected)
                    return
                this.broadcastEvent('as-drawer:before-open', { id: this.drawerId, position: this.settings.position })
                //// OVERLAY
                this.overlay = document.createElement('div');
                this.overlay.classList.add('as-overlay');
                this.overlay.setAttribute('data-id', this.drawerId);
                this.body.appendChild(this.overlay);
                this.overlay.addEventListener('click', e => this.closeDrawer());
                document.addEventListener('keydown', this._onKeydown)

                //// DELAY
                setTimeout(() => {
                    this.drawer.removeAttribute('hidden')
                    setTimeout(() => {
                        this.drawer.setAttribute('data-state', 'open')
                        this.overlay.setAttribute('data-state', 'open')
                        this.closebutton.focus()
                    }, 1)
                }, this.settings.delay)

                setTimeout(() => this.broadcastEvent('as-drawer:after-open', { id: this.drawerId, position: this.settings.position }), this.settings.transitionTime)

            }
            closeDrawer() {
                if (!this.overlay?.isConnected || !this.drawer.hasAttribute('data-state'))
                    return
                document.removeEventListener('keydown', this._onKeydown)
                this.broadcastEvent('as-drawer:before-close', { id: this.drawerId, position: this.settings.position })
                this.drawer.removeAttribute('data-state')
                this.overlay.removeAttribute('data-state')
                this.overlay.addEventListener('transitionend', e => e.target.remove())
                // hide once the transition is done so closed content leaves the tab order and the a11y tree, then give focus back
                setTimeout(() => {
                    this.drawer.setAttribute('hidden', '')
                    this.openbutton.focus()
                }, this.settings.transitionTime)
                setTimeout(() => this.broadcastEvent('as-drawer:after-close', { id: this.drawerId, position: this.settings.position }), this.settings.transitionTime)
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
            }
        }
        // register new custom element
        window.customElements.define("as-drawer", ASDrawer)
    }
})