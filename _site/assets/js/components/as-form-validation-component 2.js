document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-form-validation') === undefined) {
        class ASFormValidationElement extends HTMLElement {
            #input
            #errorMessage

            #handleInvalid(e) {
                // disable built in validation
                e.preventDefault();
            }

            #handleInput() {
                // remove error message when typing in within input field
                if (this.#input)
                    this.#errorMessage.textContent = ''
            }

            #handleBlur() {
                // if the input field is NOT valid dsplay error messages
                if (this.#input && !this.#input.validity.valid) {
                    this.#errorMessage.textContent = this.#customErrorMessage[this.#getFirstInvalid(this.#input.validity)];
                    this.broadcastEvent('as-form-validation:error', { fieldid: this.#input.id, type: this.#getFirstInvalid(this.#input.validity), message: this.#customErrorMessage[this.#getFirstInvalid(this.#input.validity)] })
                } else
                    this.broadcastEvent('as-form-validation:success', { fieldid: this.#input.id })
            }

            #getFirstInvalid(validityState) {
                // console.log(validityState)
                // look through ValidityState object which is returned from input.validity
                // return state if any of the keys in the object are true
                for (const key in validityState) {
                    if (validityState[key])
                        return key
                }
            }

            get #customErrorMessage() {
                return {
                    valueMissing: this.getAttribute('value-missing') || 'This field is required',
                    tooLong: this.getAttribute('too-long') || 'This field is too long',
                    tooShort: this.getAttribute('too-short') || 'This field is too short',
                    rangeOverflow: this.getAttribute('range-overflow') || 'This field has a number that is too big',
                    rangeUnderflow: this.getAttribute('range-underflow') || 'This field has a number that is too small',
                    typeMismatch: this.getAttribute('type-mismatch') || 'This field is the wrong type',
                    patternMismatch: this.getAttribute('pattern-mismatch') || 'This fields value does not match the pattern',
                }
            }

            #bindEvents() {
                this.#input.addEventListener('invalid', this.#handleInvalid.bind(this))
                this.#input.addEventListener('input', this.#handleInput.bind(this))
                this.#input.addEventListener('blur', this.#handleBlur.bind(this))
            }

            #unbindEvents() {
                this.#input.removeEventListener('invalid', this.#handleInvalid)
                this.#input.removeEventListener('input', this.#handleInput)
                this.#input.removeEventListener('blur', this.#handleBlur)
            }

            connectedCallback() {
                this.#input = this.querySelector('input,textarea')

                this.#errorMessage = document.createElement('span')
                this.#errorMessage.setAttribute('error-message', '')
                this.#errorMessage.setAttribute('aria-live', 'polite')
                this.append(this.#errorMessage)

                this.#bindEvents()
            }

            disconnectedCallback() {
                this.#unbindEvents()
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
                console.log(cEvent)
            }
        }
        window.customElements.define("as-form-validation", ASFormValidationElement)
    }
})