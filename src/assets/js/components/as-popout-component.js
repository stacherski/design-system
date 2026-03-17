document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-popout') === undefined) {
        class ASPopoutElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }
            connectedCallback() {
                // Popout ID
                this.popoutId = this.getAttribute("popout-id") || crypto.randomUUID()
                /// default options
                this.settings = {}
                this.settings.buttonText = this.getAttribute('button-text') || 'Open popout'
                this.settings.buttonClass = this.getAttribute('button-class') || 'btn'
                this.settings.buttonIcon = this.getAttribute('button-icon') || 'dot'
                this.settings.hasIcon = this.hasAttribute('button-icon')
                this.settings.breakpoint = this.getAttribute('breakpoint') || '0'

                ///
                this.settings.content = Array.from(this.childNodes)
                if (this.ready)
                    return
                this.init()
            }

            init() {
                if (this.ready)
                    return

                this.removeAttribute('hidden')
                // render Popout structure
                this.innerHTML = `
                    <button style="anchor-name: --${this.popoutId}" popovertarget="${this.popoutId}" class="${this.settings.buttonClass}">${this.settings.buttonText}${this.settings.hasIcon ? '<as-icon name=' + this.settings.buttonIcon + '></as-icon>' : ''}</button>
                    <div hidden pop popover id="${this.popoutId}" style="position-anchor: --${this.popoutId};"></div>
                `

                this.querySelector('[popovertarget]').addEventListener('click', e => {
                    this.settings.isInline = this.isBelowBreakpoint()
                    const popover = this.querySelector('[pop]')
                    this.setHidden(popover)

                    if (this.settings.isInline)
                        popover.removeAttribute('popover')
                    else popover.setAttribute('popover', '')
                })

                window.addEventListener('resize', e => {
                    this.settings.isInline = this.isBelowBreakpoint()
                })

                this.querySelector('[pop]').addEventListener('toggle', e => {
                    (e.newState === 'open') ? this.broadcastEvent('as-popout:toggle', { id: this.popoutId, state: 'open' }) : this.broadcastEvent('as-popout:toggle', { id: this.popoutId, state: 'close' })
                    if (e.newState === 'closed')
                        e.target.setAttribute('hidden', '')
                })
                this.broadcastEvent('as-popout:created', { id: this.popoutId })

                const popover = this.querySelector('[pop]')
                this.settings.content.forEach(node => popover.appendChild(node))

                this.ready = true
            }

            setHidden(el) {
                (el.hasAttribute('hidden') ? el.removeAttribute('hidden') : el.setAttribute('hidden', ''))
            }

            isBelowBreakpoint() {
                return window.innerWidth < this.settings.breakpoint
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
        window.customElements.define("as-popout", ASPopoutElement)
    }
})