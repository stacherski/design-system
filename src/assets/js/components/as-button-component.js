document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-button') === undefined) {

        // variant attribute -> existing button class
        const VARIANTS = {
            primary: '',
            outline: 'btn-outline',
            transparent: 'btn-transparent',
            warning: 'btn-warning',
            error: 'btn-error',
            success: 'btn-success'
        }
        // attributes forwarded as they are to the native <button>
        const FORWARDED = ['popovertarget', 'popovertargetaction', 'name', 'value', 'form']

        class ASButton extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            static get observedAttributes() {
                return ['icon-name', 'icon-position', 'variant', 'size', 'label', 'type', 'disabled', 'loading', 'href', 'target', 'button-class', ...FORWARDED]
            }

            connectedCallback() {
                // build once: connectedCallback also runs when the element is moved
                if (this.ready)
                    return
                this.ready = true
                this.build()
                this.broadcastEvent('as-button:created', { id: this.id })
            }

            attributeChangedCallback(name, oldValue, newValue) {
                // before the first build connectedCallback does the work
                if (this.ready && this.control && oldValue !== newValue)
                    this.sync()
            }

            build() {
                // the element content becomes the button text
                const nodes = [...this.childNodes]
                this.text = null
                if (nodes.some(n => n.nodeType !== Node.TEXT_NODE || n.textContent.trim())) {
                    this.text = document.createElement('span')
                    this.text.append(...nodes)
                }

                this.control = null
                this.sync()
            }

            // reads every attribute fresh, so each render reflects the current state
            sync() {
                const href = this.getAttribute('href')
                const tag = href !== null ? 'a' : 'button'

                // switching between <button> and <a> needs a new control element
                if (!this.control || this.control.localName !== tag) {
                    this.control?.remove()
                    this.control = document.createElement(tag)
                    this.control.addEventListener('click', e => this.handleClick(e))
                    this.append(this.control)
                }
                const control = this.control

                // classes
                const variant = this.getAttribute('variant') || 'primary'
                const classes = ['btn', VARIANTS[variant], ...(this.getAttribute('button-class') || '').split(/\s+/)]
                control.className = classes.filter(Boolean).join(' ')

                // size
                const size = this.getAttribute('size')
                size ? control.setAttribute('size', size) : control.removeAttribute('size')

                // button or link specific attributes
                const disabled = this.hasAttribute('disabled') || this.hasAttribute('loading')
                if (tag === 'button') {
                    control.setAttribute('type', this.getAttribute('type') || 'button')
                    control.toggleAttribute('disabled', disabled)
                    FORWARDED.forEach(attr => this.hasAttribute(attr) ? control.setAttribute(attr, this.getAttribute(attr)) : control.removeAttribute(attr))
                } else {
                    control.setAttribute('href', href)
                    this.hasAttribute('target') ? control.setAttribute('target', this.getAttribute('target')) : control.removeAttribute('target')
                    if (this.getAttribute('target') === '_blank')
                        control.setAttribute('rel', 'noopener noreferrer')
                    // links have no disabled state, expose it and take it out of the tab order
                    disabled ? control.setAttribute('aria-disabled', 'true') : control.removeAttribute('aria-disabled')
                    disabled ? control.setAttribute('tabindex', '-1') : control.removeAttribute('tabindex')
                }

                // accessible name and state
                const label = this.getAttribute('label')
                label ? control.setAttribute('aria-label', label) : control.removeAttribute('aria-label')
                this.hasAttribute('loading') ? control.setAttribute('aria-busy', 'true') : control.removeAttribute('aria-busy')

                // icon
                const iconName = this.getAttribute('icon-name')
                if (iconName) {
                    if (!this.icon) {
                        this.icon = document.createElement('as-icon')
                    }
                    this.icon.setAttribute('name', iconName)
                    // button size m / l carries over to the icon
                    size === 'm' || size === 'l' ? this.icon.setAttribute('size', size) : this.icon.removeAttribute('size')
                } else if (this.icon) {
                    this.icon.remove()
                    this.icon = null
                }

                // content order: icon + text, icon position decides which comes first
                const end = this.getAttribute('icon-position') === 'end'
                control.replaceChildren(...[end ? this.text : this.icon, end ? this.icon : this.text].filter(Boolean))

                if (!this.text && !label && !this.hasAttribute('aria-label'))
                    console.warn('as-button without text needs a label attribute to have an accessible name', this)
            }

            handleClick(e) {
                if (this.hasAttribute('disabled') || this.hasAttribute('loading')) {
                    // covers the <a> case, native buttons are disabled and never get here
                    e.preventDefault()
                    return
                }
                this.broadcastEvent('as-button:click', { id: this.id })
            }

            // delegate to the native control
            focus(options) {
                this.control?.focus(options)
            }

            click() {
                this.control?.click()
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
        window.customElements.define("as-button", ASButton)
    }
})
