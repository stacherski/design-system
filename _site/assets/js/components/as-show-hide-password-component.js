document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-show-hide-password') === undefined) {

        class ASShowHidePassword extends HTMLElement {

            connectedCallback() {
                this.buttonLabels = this.hasAttribute('labels') ? this.getAttribute('labels').split(',') : ['Show', 'Hide']
                this.icons = this.hasAttribute('icons') ? this.getAttribute('icons').split(',') : null
                // Initialize
                this.init()
            }

            init() {

                try {
                    this.password = this.querySelector('[type="password"]')
                    this.showhide = document.createElement('a')
                    this.showhide.setAttribute('tabindex', '-1')
                    this.showhide.classList.add('btn')
                    if (this.icons) {
                        this.icon = document.createElement('as-icon')
                        this.icon.setAttribute('name', this.icons[0])
                        this.icon.setAttribute('label', this.buttonLabels[0])
                        this.showhide.append(this.icon)
                    } else
                        this.showhide.textContent = this.buttonLabels[0]

                    this._buttonListenerID = this.showhide.addEventListener('click', e => this.showhidepass(e).bind(this))
                    this.password.after(this.showhide)
                }
                catch (error) {
                    throw new Error('Input is not of type password')
                    this.broadcastEvent('as-show-hide-password:error', { fieldid: this.password.id })
                }
            }

            showhidepass(e) {
                e.preventDefault()
                if (this.password.type == 'password') {
                    this.password.type = 'text'
                    if (this.icons) {
                        this.icon.setAttribute('new-name', this.icons[1])
                        this.icon.setAttribute('aria-label', this.buttonLabels[1])
                    } else
                        this.showhide.textContent = this.buttonLabels[1]
                    this.broadcastEvent('as-show-hide-password:show', { fieldid: this.password.id })
                } else {
                    this.password.type = 'password'
                    if (this.icons) {
                        this.icon.setAttribute('new-name', this.icons[0])
                        this.icon.setAttribute('aria-label', this.buttonLabels[0])
                    } else
                        this.showhide.textContent = this.buttonLabels[0]
                    this.broadcastEvent('as-show-hide-password:hide', { fieldid: this.password.id })
                }
                this.showhide.toggleAttribute('hide')
            }

            disconnectedCalback() {
                this._buttonListenerID = showhide.removeEventListener('click', this.showhidepass.bind(this))
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
        window.customElements.define("as-show-hide-password", ASShowHidePassword)
    }
})