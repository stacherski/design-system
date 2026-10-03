document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-svg-to-base') === undefined) {
        class ASSVG2Base64Element extends HTMLElement {
            connectedCallback() {
                this.innerHTML = `
                    <div class="data-line">
                        <label>SVG file</label>
                        <input type="file" accept="image/svg+xml">
                    </div>
                    <div class="data-line">
                        <label>Or paste SVG / code</label>
                        <textarea placeholder="<svg ...></svg>"></textarea>
                    </div>
                    <div class="data-line">
                        <label>CSS variable name</label>
                        <input type="text" placeholder="--as-icon-telephone">
                    </div>
                    <button class="btn" type="button">Generate</button>
                    <div class="data-list">
                        <label>Icon preview</label>
                        <div class="preview" aria-label="Icon preview"></div>
                    </div>
                    <div class="data-list">
                        <label>Copy CSS</label>
                        <code class="token icon" aria-live="polite"></code>
                    </div>
                `

                this.fileInput = this.querySelector('input[type="file"]')
                this.textarea = this.querySelector('textarea')
                this.nameInput = this.querySelector('input[type="text"]')
                this.button = this.querySelector('button')
                this.output = this.querySelector('code')
                this.preview = this.querySelector('.preview')

                this.button.addEventListener('click', () => this.generate())
            }

            generate() {
                const name = this.nameInput.value.trim()

                if (!name) {
                    new Toast('Please specify a CSS variable name...')
                    return
                }

                if (this.textarea.value.trim()) {
                    this.encodeAndApply(this.textarea.value)
                    return
                }

                const file = this.fileInput.files[0]
                if (!file) {
                    new Toast('Please upload SVG file or paste SVG code into the box...')
                    return
                }

                const reader = new FileReader()
                reader.readAsText(file)
                reader.onload = () => this.encodeAndApply(reader.result)
            }

            encodeAndApply(content) {
                const encoded = btoa(unescape(encodeURIComponent(content)))
                const value = `url(\"data:image/svg+xml;base64,${encoded}\")`

                this.output.textContent = `${this.nameInput.value.trim()}: ${value};`

                this.preview.style.maskImage = value
                this.preview.style.webkitMaskImage = value
                this.preview.style.maskRepeat = 'no-repeat'
                this.preview.style.webkitMaskRepeat = 'no-repeat'
                this.preview.style.maskPosition = 'center'
                this.preview.style.webkitMaskPosition = 'center'
                this.preview.style.maskSize = 'contain'
                this.preview.style.webkitMaskSize = 'contain'

                new Toast('Code generated!')
                this.broadcastEvent('as-svg-to-base:generated')
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
        window.customElements.define("as-svg-to-base", ASSVG2Base64Element)
    }
})