document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-char-counter') === undefined) {
        class ASCharCounter extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                // Table Actions ID
                this.charCounterId = crypto.randomUUID()

                if (this.ready || !this.hasAttribute('data-input'))
                    return
                // Initialize
                this.init()
            }

            init() {
                /// default options
                this.input = document.querySelector(this.getAttribute('data-input'))

                if (!this.input)
                    return

                this.textLength = 140

                this.innerHTML = `
                    <div><as-icon name="font" size="m"></as-icon><span class="chars">0</span></div>
                    <div><as-icon name="envelope-solid" size="m"></as-icon><span class="texts">1</span></div>
                `

                this.input.addEventListener('input', e => this.count())

                this.chars = this.querySelector('.chars')
                this.texts = this.querySelector('.texts')

                this.count()

                this.broadcastEvent('as-char-counter:created', { id: this.charCounterId, fieldid: this.getAttribute('data-input') })
                this.ready = true

            }

            count() {
                const chars = this.input.value.length
                const texts = Math.ceil(chars / this.textLength)

                this.chars.innerHTML = chars
                this.texts.innerHTML = texts

                this.broadcastEvent('as-char-counter:count', { id: this.charCounterId, fieldid: this.getAttribute('data-input'), chars: chars, texts: texts })
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
        window.customElements.define("as-char-counter", ASCharCounter)
    }
})