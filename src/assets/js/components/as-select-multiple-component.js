document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-select-multiple') === undefined) {
        class ASSelectMultiple extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.selectId = crypto.randomUUID()
                //this.setAttribute('id',this.selectId)

                this.select = this.querySelector('select[multiple]')
                if (!this.select) {
                    this.broadcastEvent('as-select-multiple:created', {
                        id: this.selectId,
                        action: 'not-created'
                    })
                    console.error('No <select multiple> found inside <as-select-multiple>.')
                    return
                }

                this.select.hidden = true

                this.setAttribute('role', 'group')
                this.setAttribute('aria-label', this.getAttribute('label') || 'Multi-select')

                this.locale = this.hasAttribute('locale') ? this.getAttribute('locale').split('|') : ['Select multiple options', 'Search...', 'more']
                this.placeholder = this.getAttribute('data-placeholder') || this.locale[0]

                if (this.ready)
                    return

                this.render()
                this.bindEvents()


            }

            render() {
                const frag = new DocumentFragment()

                this.trigger = document.createElement('button')
                this.trigger.type = 'button'
                this.trigger.setAttribute('trigger', '')
                this.trigger.setAttribute('aria-haspopup', 'listbox')
                this.trigger.setAttribute('aria-expanded', 'false')
                this.trigger.setAttribute('popovertarget', this.selectId)
                this.trigger.style.setProperty('anchor-name', `--${this.selectId}`)

                this.dropdown = document.createElement('div')
                this.dropdown.setAttribute('dropdown', '')
                this.dropdown.setAttribute('role', 'listbox')
                this.dropdown.hidden = true
                this.dropdown.setAttribute('id', this.selectId)
                this.dropdown.setAttribute('popover', '')
                this.dropdown.style.setProperty('position-anchor', `--${this.selectId}`)

                // Search input
                this.searchInput = document.createElement('input')
                this.searchInput.type = 'text'
                this.searchInput.placeholder = this.locale[1]
                this.searchInput.setAttribute('search', '')

                // Separate scrollable list container
                this.optionsList = document.createElement('div')
                this.optionsList.setAttribute('options-list', '')

                this.dropdown.append(this.searchInput, this.optionsList)

                this.populateDropdown()

                const wrapper = document.createElement('div')
                wrapper.setAttribute('wrapper', '')
                wrapper.append(this.trigger, this.dropdown)

                frag.append(wrapper)
                this.append(frag)

                this.updateView()
                this.broadcastEvent('as-select-multiple:created', {
                    id: this.selectId,
                    action: 'created'
                })
                this.ready = true
            }

            populateDropdown(filter = '') {
                // Clear only the inner options list, keep search input intact
                this.optionsList.innerHTML = ''
                const frag = new DocumentFragment()

                Array.from(this.select.options)
                    .filter(opt => !opt.selected && opt.text.toLowerCase().includes(filter.toLowerCase()))
                    .forEach(opt => {
                        const item = document.createElement('div')
                        item.setAttribute('option', '')
                        item.setAttribute('role', 'option')
                        item.setAttribute('data-value', opt.value)
                        item.tabIndex = -1
                        item.textContent = opt.text
                        frag.append(item)
                    })

                this.optionsList.append(frag)
                this.focusIndex = 0
                this.focusOption(0)
            }

            bindEvents() {
                this.trigger.addEventListener('click', e => {
                    //check if any of the buttons holding selected options are clicked
                    const btn = e.target.closest('[selected]')

                    // and remove it
                    if (btn) {
                        e.stopPropagation()
                        const value = btn.getAttribute('data-value')
                        const opt = Array.from(this.select.options).find(o => o.value === value)
                        if (opt) opt.selected = false
                        this.updateView()
                        this.select.dispatchEvent(new Event('change'))
                        this.broadcastEvent('as-select-multiple:deselected', {
                            id: this.selectId,
                            action: 'deselected',
                            name: opt.text,
                            value: opt.value
                        })
                        return
                    }
                    this.calculateDropdownPosition()
                })

                this.optionsList.addEventListener('click', e => {
                    const item = e.target.closest('[option]')
                    if (!item) return
                    const value = item.getAttribute('data-value')
                    const opt = Array.from(this.select.options).find(o => o.value === value)
                    if (opt) opt.selected = true
                    this.updateView()
                    this.select.dispatchEvent(new Event('change'))
                    this.broadcastEvent('as-select-multiple:selected', {
                        id: this.selectId,
                        action: 'selected',
                        name: opt.text,
                        value: opt.value
                    })
                })

                this.searchInput.addEventListener('input', e => {
                    const val = e.target.value
                    this.populateDropdown(val)
                    // Keep focus stable
                    this.searchInput.focus()
                    this.broadcastEvent('as-select-multiple:search', {
                        id: this.selectId,
                        action: 'search',
                        searchword: val
                    })
                })

                // Keyboard navigation (dropdown-level)
                this.dropdown.addEventListener('keydown', e => {
                    const items = Array.from(this.optionsList.querySelectorAll('[option]'))
                    if (!items.length) return

                    if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        this.focusIndex = (this.focusIndex + 1) % items.length
                        this.focusOption(this.focusIndex)
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        this.focusIndex = (this.focusIndex - 1 + items.length) % items.length
                        this.focusOption(this.focusIndex)
                    } else if (['Enter', ' '].includes(e.key)) {
                        e.preventDefault()
                        const item = items[this.focusIndex]
                        if (item) {
                            const value = item.getAttribute('data-value')
                            const opt = Array.from(this.select.options).find(o => o.value === value)
                            if (opt) opt.selected = true
                            this.updateView()
                            this.select.dispatchEvent(new Event('change'))
                            this.broadcastEvent('as-select-multiple:selected', {
                                id: this.selectId,
                                action: 'selected',
                                name: opt.text,
                                value: opt.value
                            })
                            this.searchInput.focus()
                        }
                    } else if (e.key === 'Escape') {
                        e.preventDefault()
                        this.closeDropdown()
                        this.trigger.focus()
                    }
                })

                this.dropdown.addEventListener('toggle', e => {
                    this.broadcastEvent('as-select-multiple:show', {
                        id: this.selectId,
                        action: 'show'
                    })

                    if (e.newState === 'open') {
                        const expanded = this.trigger.getAttribute('aria-expanded') === 'true'
                        this.trigger.setAttribute('aria-expanded', String(!expanded))
                        this.searchInput.focus()
                        this.dropdown.hidden = expanded
                        if (!expanded) {
                            this.searchInput.value = ''
                            this.populateDropdown('')
                            this.searchInput.focus()
                        }
                    }
                    else {
                        this.trigger.setAttribute('aria-expanded', false)
                    }

                })
            }


            calculateDropdownPosition() {
                const trigger = this.trigger.getBoundingClientRect()
                this.dropdown.style.setProperty('--width', trigger.right - trigger.left + 'px')
                //this.dropdown.showPopover()
            }

            focusOption(index) {
                const items = Array.from(this.optionsList.querySelectorAll('[option]'))
                items.forEach((el, i) => el.toggleAttribute('focused', i === index))
                if (items[index]) {
                    items[index].focus()
                    const listRect = this.optionsList.getBoundingClientRect()
                    const itemRect = items[index].getBoundingClientRect()
                    if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom)
                        items[index].scrollIntoView({
                            block: 'nearest'
                        })
                }
            }

            updateView() {
                this.trigger.innerHTML = ''
                const frag = new DocumentFragment()
                const selected = Array.from(this.select.selectedOptions)
                const all = Array.from(this.select.options)

                if (selected.length) {
                    selected.forEach(opt => {
                        const btn = document.createElement('button')
                        btn.classList.add('btn')
                        btn.setAttribute('selected', '')
                        btn.setAttribute('data-value', opt.value)
                        btn.textContent = opt.text

                        const icon = document.createElement('as-icon')
                        icon.setAttribute('name', '--as-icon-plus')
                        icon.setAttribute('rotate', '45deg')
                        btn.append(icon)

                        frag.append(btn)
                    })
                    const remaining = all.length - selected.length
                    if (remaining > 0) {
                        const more = document.createElement('span')
                        more.setAttribute('more', '')
                        more.textContent = `+${remaining} ${this.locale[2]}`
                        frag.append(more)
                    }
                } else {
                    const placeholder = document.createElement('span')
                    placeholder.setAttribute('placeholder', '')
                    placeholder.textContent = this.placeholder
                    frag.append(placeholder)
                }

                this.trigger.append(frag)
                this.populateDropdown(this.searchInput?.value || '')
                this.calculateDropdownPosition()
            }

            closeDropdown() {
                this.dropdown.hidden = true
                this.trigger.setAttribute('aria-expanded', 'false')
                this.broadcastEvent('as-select-multiple:hide', {
                    id: this.selectId,
                    action: 'hide'
                })
                this.dropdown.hidePopover()
            }

            isEmpty(obj) {
                for (const prop in obj) {
                    if (Object.hasOwn(obj, prop))
                        return false;
                }
                return true;
            }

            broadcastEvent(name, detail = {}, bubbles = true) {
                const cEvent = (this.isEmpty(detail)) ? new CustomEvent(name, {
                    bubbles: bubbles
                }) : new CustomEvent(name, {
                    detail: detail,
                    bubbles: bubbles
                })
                this.dispatchEvent(cEvent)
                console.log(cEvent)
            }

        }
        window.customElements.define("as-select-multiple", ASSelectMultiple)
    }
})