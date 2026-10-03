if (window.customElements.get('as-tab-group') === undefined) {

    class ASTabGroup extends HTMLElement {

        constructor() {
            super()
            this.ready = false
            this.tabGroupId = this.getAttribute('id') || crypto.randomUUID()
        }

        connectedCallback() {
            // Defer so child elements are fully parsed before init runs.
            // This is critical when the component is rendered inside a tab panel.
            Promise.resolve().then(() => this.init())
        }

        init() {
            // Use :scope to limit to DIRECT children only.
            // Without this, a nested as-tab-group's tabs would also be matched.
            this.tabs = this.querySelectorAll(':scope > as-tab')
            this.panels = this.querySelectorAll(':scope > as-tab-panel')

            this.hasSelected = false
            this.combined = []
            this.currentTab = 0

            // ARIA tabs pattern: tabs live inside a tablist
            if (this.tabs.length && !this.tabs[0].parentElement.matches('[role="tablist"]')) {
                this.tablist = document.createElement('div')
                this.tablist.setAttribute('role', 'tablist')
                this.tabs[0].before(this.tablist)
                this.tablist.append(...this.tabs)
            }

            this.tabs.forEach((tab, index) => {
                if (!tab.hasAttribute('id'))
                    tab.setAttribute('id', `tab-${this.tabGroupId}-${index}`)
                tab.setAttribute('tabindex', '-1')
                tab.setAttribute('role', 'tab')
                const panel = this.panels[index]
                if (panel) {
                    if (!panel.hasAttribute('id'))
                        panel.setAttribute('id', `panel-${this.tabGroupId}-${index}`)
                    panel.setAttribute('role', 'tabpanel')
                    panel.setAttribute('aria-labelledby', tab.id)
                    tab.setAttribute('aria-controls', panel.id)
                }
                this.combined.push({ index, tab, panel })

                if (tab.hasAttribute('selected')) {
                    this.currentTab = index
                    this.hasSelected = true
                }
            })

            if (!this.hasSelected) {
                this.tabs[0]?.setAttribute('selected', '')
                this.hasSelected = true
            }

            this.combined.forEach(set => {
                set.tab.addEventListener('click', this.tabAction.bind(this, set))
                set.tab.addEventListener('keydown', e => {
                    const last = this.combined.length - 1
                    let next
                    if (['Space', 'Enter'].includes(e.code)) next = set.index
                    else if (['ArrowLeft', 'ArrowUp'].includes(e.code)) next = (set.index - 1 + this.combined.length) % this.combined.length
                    else if (['ArrowRight', 'ArrowDown'].includes(e.code)) next = (set.index + 1) % this.combined.length
                    else if (e.code === 'Home') next = 0
                    else if (e.code === 'End') next = last
                    // other keys (Tab included) must not change the selection
                    if (next === undefined) return
                    e.preventDefault()
                    this.tabAction(this.combined[next])
                    this.combined[next].tab.focus()
                })
            })

            if (!this.ready) {
                this.broadcastEvent('as-tab-group:created', {
                    id: this.tabGroupId,
                    tabs: this.combined.map(t => t.tab.id).join(',')
                })
                this.tabAction(this.combined[this.currentTab])
                this.ready = true
            }
        }

        tabAction(set) {
            this.tabs.forEach(tab => {
                tab.removeAttribute('selected')
                tab.setAttribute('aria-selected', 'false')
                tab.setAttribute('tabindex', '-1')
            })
            this.panels.forEach(panel => {
                panel.setAttribute('hidden', '')
            })

            set.tab.setAttribute('aria-selected', 'true')
            set.tab.setAttribute('tabindex', '0')
            set.tab.setAttribute('selected', '')
            set.panel?.removeAttribute('hidden')
            this.currentTab = set.index

            this.broadcastEvent('as-tab-group:selected', {
                id: this.tabGroupId,
                tab: set.tab.id
            })
        }

        isEmpty(obj) {
            return !Object.keys(obj).some(k => Object.hasOwn(obj, k))
        }

        broadcastEvent(name, detail = {}) {
            const cEvent = this.isEmpty(detail)
                ? new CustomEvent(name, { bubbles: true })
                : new CustomEvent(name, { detail, bubbles: true })
            this.dispatchEvent(cEvent)
        }
    }

    window.customElements.define('as-tab-group', ASTabGroup)
}