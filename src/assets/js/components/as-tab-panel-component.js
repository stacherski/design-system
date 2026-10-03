if (window.customElements.get('as-tab-panel') === undefined) {

    class ASTabPanel extends HTMLElement {

        static get observedAttributes() {
            return ['hidden']
        }

        connectedCallback() {
            // as-tab-group pairs panels with tabs and sets aria-labelledby; the panel owns its own role
            this.setAttribute('role', 'tabpanel')
            // panels without focusable content stay reachable from the keyboard
            if (!this.hasAttribute('tabindex'))
                this.setAttribute('tabindex', '0')
        }

        attributeChangedCallback(name, oldValue, newValue) {
            // the group re-applies hidden on every selection, only report real changes
            const wasHidden = oldValue !== null
            const isHidden = newValue !== null
            if (wasHidden === isHidden)
                return
            this.broadcastEvent(isHidden ? 'as-tab-panel:hidden' : 'as-tab-panel:shown', { id: this.id })
        }

        broadcastEvent(name, detail = {}) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
        }
    }

    window.customElements.define('as-tab-panel', ASTabPanel)
}
