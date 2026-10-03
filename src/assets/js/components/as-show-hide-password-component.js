document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-show-hide-password') === undefined) {

        class ASShowHidePassword extends HTMLElement {

            connectedCallback() {
                if (this.showhide) {
                    // moved in the DOM: the button is already built, only restore the listener removed on disconnect
                    this.showhide.addEventListener('click', this._onClick)
                    return
                }
                this.buttonLabels = this.hasAttribute('labels') ? this.getAttribute('labels').split(',') : ['Show', 'Hide']
                this.icons = this.hasAttribute('icons') ? this.getAttribute('icons').split(',') : null
                // Initialize
                this.init()
            }

            init() {

                this.password = this.querySelector('[type="password"]')
                if (!this.password) {
                    this.broadcastEvent('as-show-hide-password:error', { fieldid: null })
                    throw new Error('Input is not of type password')
                }
                this.showhide = document.createElement('as-button')
                if (this.password.id)
                    this.showhide.setAttribute('aria-controls', this.password.id)
                if (this.icons) {
                    // icon stays decorative; the label is the accessible name
                    this.showhide.setAttribute('icon-name', this.icons[0])
                    this.showhide.setAttribute('label', this.buttonLabels[0])
                } else
                    this.showhide.text = this.buttonLabels[0]

                this._onClick = e => this.showhidepass(e)
                this.showhide.addEventListener('click', this._onClick)
                this.password.after(this.showhide)
            }

            showhidepass(e) {
                e.preventDefault()
                if (this.password.type == 'password') {
                    this.password.type = 'text'
                    if (this.icons) {
                        this.showhide.setAttribute('icon-name', this.icons[1])
                        this.showhide.setAttribute('label', this.buttonLabels[1])
                    } else
                        this.showhide.text = this.buttonLabels[1]
                    this.broadcastEvent('as-show-hide-password:show', { fieldid: this.password.id })
                } else {
                    this.password.type = 'password'
                    if (this.icons) {
                        this.showhide.setAttribute('icon-name', this.icons[0])
                        this.showhide.setAttribute('label', this.buttonLabels[0])
                    } else
                        this.showhide.text = this.buttonLabels[0]
                    this.broadcastEvent('as-show-hide-password:hide', { fieldid: this.password.id })
                }
                this.showhide.toggleAttribute('hide')
            }

            disconnectedCallback() {
                this.showhide?.removeEventListener('click', this._onClick)
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