document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-drawer') === undefined) {
        class ASDrawer extends HTMLElement {
            connectedCallback() {
                // Drawer ID
                this.drawerId = this.getAttribute("id") || crypto.randomUUID()
                // set default ID
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.drawerId)
                /// default options
                this.settings = {}
                this.settings.position = this.getAttribute('position') || 'bottom'
                this.settings.button = this.getAttribute('button-text') || 'Open drawer'
                this.settings.delay = this.getAttribute('delay') || 10
                this.settings.transitionTime = this.getAttribute('transition-time') || 400
                ///
                this.settings.content = this.innerHTML
                this.broadcastEvent('as-drawer:created', { id: this.drawerId, position: this.settings.position })
                this.render()
            }

            render() {
                // render Drawer structure
                this.innerHTML = `
                    <button opendrawer class="btn btn__solid_primary">${this.settings.button}</button>
                    <div hidden class="as-drawer ${this.settings.position}" role="dialog" data-id="${this.drawerId}">${this.settings.content}<!--<button class="btn" closedrawer><as-icon name="--as-icon-times-solid"></as-icon> Close</button>--></div>
                `
                this.style.setProperty('--as-drawer-transition-time', `${this.settings.transitionTime}ms`)
                this.openbutton = this.querySelector('button[opendrawer]')
                //this.closebutton = this.querySelector('button[closedrawer]')
                this.drawer = this.querySelector('.as-drawer')

                this.body = document.querySelector('body')
                this.bindEvents()
            }

            bindEvents() {
                this.openbutton.addEventListener('click', e => this.openDrawer())
                //this.closebutton.addEventListener('click', e => this.closeDrawer())
            }

            openDrawer() {
                this.broadcastEvent('as-drawer:before-open', { id: this.drawerId, position: this.settings.position })
                //// OVERLAY
                this.overlay = document.createElement('div');
                this.overlay.classList.add('as-overlay');
                this.overlay.setAttribute('data-id', this.drawerId);
                this.body.appendChild(this.overlay);
                this.overlay.addEventListener('click', e => this.closeDrawer());
                //this.closebutton.focus()

                //// DELAY
                setTimeout(() => {
                    this.drawer.removeAttribute('hidden')
                    setTimeout(() => {
                        this.drawer.setAttribute('data-state', 'open')
                        this.overlay.setAttribute('data-state', 'open')
                    }, 1)
                }, this.settings.delay)

                setTimeout(() => this.broadcastEvent('as-drawer:after-open', { id: this.drawerId, position: this.settings.position }), this.settings.transitionTime)

            }
            closeDrawer() {
                this.broadcastEvent('as-drawer:before-close', { id: this.drawerId, position: this.settings.position })
                this.drawer.removeAttribute('data-state')
                this.overlay.removeAttribute('data-state')
                this.overlay.addEventListener('transitionend', e => e.target.remove())
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