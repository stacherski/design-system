document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-button-group') === undefined) {
        class ASButtonGroup extends HTMLElement {

            static get observedAttributes() {
                return ['label']
            }

            connectedCallback() {
                // the group is announced as one set of related buttons
                if (!this.hasAttribute('role'))
                    this.setAttribute('role', 'group')
                this.syncLabel()
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue !== newValue)
                    this.syncLabel()
            }

            syncLabel() {
                // only touch aria-label when label is used, an author set aria-label stays as it is
                const label = this.getAttribute('label')
                if (label)
                    this.setAttribute('aria-label', label)
                else if (this._labelled)
                    this.removeAttribute('aria-label')
                this._labelled = !!label
            }
        }
        // register new custom element
        window.customElements.define("as-button-group", ASButtonGroup)
    }
})
