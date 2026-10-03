document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-select') === undefined) {
        class ASSelectElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }
            // window/document listeners are tracked so they only live while the element is connected
            addGlobal(target, type, fn) {
                // the same function reference is only ever registered once
                this._globals ??= []
                if (!this._globals.some(g => g[0] === target && g[1] === type && g[2] === fn))
                    this._globals.push([target, type, fn])
                target.addEventListener(type, fn)
            }

            attachGlobals() {
                this._globals?.forEach(([target, type, fn]) => target.addEventListener(type, fn))
            }

            detachGlobals() {
                this._globals?.forEach(([target, type, fn]) => target.removeEventListener(type, fn))
            }

            disconnectedCallback() {
                this.detachGlobals()
            }

            connectedCallback() {
                // keep the id across re-connects, the popover and aria-controls point at it
                this.selectId ??= crypto.randomUUID()
                this.setAttribute('id', this.selectId)
                this.body = document.querySelector('body')
                this.select = this.querySelector('select')

                if (!this.select) {
                    throw new Error('Invalid element within as-select, expected <SELECT> element')
                    this.ready = true
                    return
                }
                if (this.ready) {
                    this.attachGlobals()
                    return
                }
                this.init()
            }

            // Specify observed attributes for detecting changes
            static get observedAttributes() {
                return ["updated"];
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (name === 'updated' && oldValue === null) {
                    this.broadcastEvent('as-select:updated', { id: this.selectId, action: 'updated' }, false)
                    this.tsSelectWrapper.remove()
                    this.tsSelectDropdown.remove()
                    this.icon.remove()
                    // init() bails out when ready, rebuild the UI from the updated <select>
                    this.ready = false
                    this.init()
                    this.removeAttribute('updated')
                    this.setSelectTriggerValue()
                }
            }

            init() {
                this.broadcastEvent('as-select:created', { id: this.selectId, action: 'created' }, false)
                if (this.ready)
                    return
                this.createUI()
                this.addEventListeners()
            }

            createUI() {
                this.tsSelectWrapper = document.createElement('div')

                this.icon = document.createElement('as-icon')
                this.icon.setAttribute('name', '--as-icon-caret-down')

                this.tsSelectTrigger = document.createElement('input')
                this.tsSelectTrigger.setAttribute('popovertarget', this.selectId)
                //this.tsSelectTrigger.setAttribute('popovertargetaction','toggle')
                this.tsSelectTrigger.setAttribute('tabindex', 0)
                this.tsSelectTrigger.setAttribute('role', 'combobox')
                this.tsSelectTrigger.setAttribute('aria-autocomplete', 'list')
                this.tsSelectTrigger.setAttribute('aria-haspopup', 'listbox')
                this.tsSelectTrigger.setAttribute('aria-expanded', 'false')
                this.tsSelectTrigger.setAttribute('aria-controls', this.selectId)
                this.setTriggerLabel()
                this.tsSelectTrigger.style.setProperty('anchor-name', `--${this.selectId}`)
                this.setSelectTriggerValue()

                this.tsSelectDropdown = document.createElement('div')
                this.tsSelectDropdown.setAttribute('id', this.selectId)
                this.tsSelectDropdown.setAttribute('popover', '')
                this.tsSelectDropdown.setAttribute('dropdown', '')
                this.tsSelectDropdown.style.setProperty('position-anchor', `--${this.selectId}`)

                this.tsSelectWrapper.append(this.tsSelectTrigger, this.tsSelectDropdown, this.icon)

                this.append(this.tsSelectWrapper)
                this.ready = true
            }

            setTriggerLabel() {
                // the visible input has to be named like the <select> it stands in for
                const id = this.select.id
                const label = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || this.select.closest('label')
                if (this.select.hasAttribute('aria-label'))
                    this.tsSelectTrigger.setAttribute('aria-label', this.select.getAttribute('aria-label'))
                else if (this.select.hasAttribute('aria-labelledby'))
                    this.tsSelectTrigger.setAttribute('aria-labelledby', this.select.getAttribute('aria-labelledby'))
                else if (label && label.textContent.trim())
                    this.tsSelectTrigger.setAttribute('aria-label', label.textContent.trim())
                else
                    this.tsSelectTrigger.setAttribute('aria-label', this.select.name || 'Select an option')
            }

            forSelectTrigger(e) {
                this.setIndex()
                this.propagateSelectDropdown(e)
                this.showDropdown(e)
            }

            addEventListeners() {
                this.select.addEventListener('change', this.updateUI.bind(this))
                const evts = ['click']
                evts.forEach(event => this.tsSelectTrigger.addEventListener(event, e => this.forSelectTrigger(e)))

                this.tsSelectTrigger.addEventListener('input', e => this.forSelectTrigger(e))

                // same reference on every rebuild, so it is only registered once
                this.addEventListener('keydown', this._onKeydown ??= e => {
                    this.setIndex()
                    this.handleKey(e)
                })
                const calcEvents = ['resize', 'orientationchange', 'scroll']
                calcEvents.forEach(event =>
                    this.addGlobal(window, event, this._onCalc ??= () => this.calculateSelectDropdownPosition())
                )

                this.tsSelectDropdown.addEventListener('toggle', e => {
                    // keep aria-expanded true to the popover, which can also close by light dismiss
                    this.tsSelectTrigger.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false')
                    if (this.tsSelectDropdown.querySelector('[selected]'))
                        this.tsSelectDropdown.querySelector('[selected]').scrollIntoView({ behavior: "instant", block: "center" })
                })

            }

            setIndex() {
                if (!this.index)
                    this.index = 0
            }

            updateUI(e) {
                setTimeout(() => this.setSelectTriggerValue(), 100)
            }

            showDropdown(e) {
                this.calculateSelectDropdownPosition()
                this.tsSelectDropdown.showPopover()
                this.dropdownShown = true
                this.broadcastEvent('as-select:show', { id: this.selectId, action: 'show' }, false)
            }

            hideDropdown(e) {
                this.tsSelectDropdown.hidePopover()
                this.dropdownShown = false
                this.options = []
                this.broadcastEvent('as-select:hide', { id: this.selectId, action: 'hide' }, false)
            }

            setSelectTriggerValue() {
                if (this.select.options.length > 0) {
                    this.tsSelectTrigger.value = this.select.options[this.select.options.selectedIndex].text
                    this.broadcastEvent('as-select:selected', { id: this.selectId, action: 'selected', option: this.select.options[this.select.options.selectedIndex].text }, false)
                }
            }

            selectOption(e) {
                this.index = this.select.selectedIndex = e.target.dataset.index
                this.querySelectorAll('li').forEach((option, index) => {
                    option.removeAttribute('selected')
                    option.setAttribute('aria-selected', 'false')
                    if (index == this.select.selectedIndex) {
                        option.setAttribute('selected', '')
                        option.setAttribute('aria-selected', 'true')
                    }
                })
                this.select.dispatchEvent(new Event('change', { bubbles: true }))
                this.hideDropdown(e)
            }

            calculateSelectDropdownPosition() {
                const trigger = this.tsSelectTrigger.getBoundingClientRect()
                //this.tsSelectDropdown.style.setProperty('--left',trigger.left+'px')
                //this.tsSelectDropdown.style.setProperty('--top',trigger.bottom + window.scrollY + 4 + 'px')
                this.tsSelectDropdown.style.setProperty('--width', trigger.right - trigger.left + 'px')
            }

            setBaseOptions() {
                this.options = []
                const baseOptions = [...this.select.options];
                baseOptions.forEach((option, index) => {
                    this.options.push({
                        text: option.textContent,
                        value: option.value,
                        index: index,
                    });
                });
            }

            propagateSelectDropdown(e) {
                // prepare list of options from original <SELECT> element
                this.setBaseOptions()

                // reset dropdown content
                this.tsSelectDropdown.innerHTML = ''

                // if the event is type 'input' then filter down options list
                if (e !== null && e.type == 'input' && (e.code != 'ArrowDown' || e.code != 'ArrowUp')) {
                    this.index = 0
                    let searchword = e.target.value.toLowerCase()
                    this.broadcastEvent('as-select:search', { id: this.selectId, action: 'search', searchword: searchword }, false)
                    this.options = this.options.filter(option => option.text.toLowerCase().includes(searchword))
                    if (this.options.length == 1)
                        this.querySelector(`li[data-index="${this.options[0].index}"]`)
                    if (e.target.value.length == 0) {
                        searchword = this.options[this.select.selectedIndex].text
                        this.setBaseOptions()
                    }
                }

                // render options
                const fragment = new DocumentFragment()
                const tsSelectDropdownList = document.createElement('ul')
                tsSelectDropdownList.setAttribute('role', 'listbox')
                tsSelectDropdownList.setAttribute('aria-label', this.tsSelectTrigger.getAttribute('aria-label') || 'Options')

                this.options.map((option) => {
                    const opt = document.createElement('li')
                    opt.textContent = option.text
                    opt.value = option.value
                    opt.setAttribute('data-index', option.index)
                    opt.setAttribute('tabindex', -1)
                    opt.setAttribute('role', 'option')
                    opt.setAttribute('aria-selected', option.index == this.select.options.selectedIndex ? 'true' : 'false')
                    if (option.index == this.select.options.selectedIndex) {
                        opt.setAttribute('selected', '')
                        opt.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    opt.addEventListener('click', this.selectOption.bind(this))
                    tsSelectDropdownList.append(opt)
                })
                fragment.append(tsSelectDropdownList)
                this.tsSelectDropdown.append(fragment)

                this.options = this.querySelectorAll('li')
            }

            handleKey(e) {

                if (!this.options || this.options.length == 0)
                    this.propagateSelectDropdown(e)

                if (e.code == "ArrowDown") {
                    e.preventDefault()
                    this.showDropdown()
                    this.index++;
                    this.index > this.options.length - 1 ? (this.index = 0) : (this.index = this.index);
                    this.options[this.index].focus();
                }
                if (e.code == "ArrowUp") {
                    e.preventDefault()
                    this.showDropdown()
                    this.index--;
                    this.index < 0 ? (this.index = this.options.length - 1) : (this.index = this.index);
                    this.options[this.index].focus();
                }
                if (e.code == "Enter" || e.code == "Space") {
                    e.preventDefault()
                    if (this.dropdownShown && this.options.length == 1)
                        this.options[0].click()
                    if (this.dropdownShown)
                        this.selectOption(e);
                }
            }

            isEmpty(obj) {
                for (const prop in obj) {
                    if (Object.hasOwn(obj, prop))
                        return false;
                }
                return true;
            }

            broadcastEvent(name, detail = {}, bubbles = true) {
                const cEvent = (this.isEmpty(detail)) ? new CustomEvent(name, { bubbles: bubbles }) : new CustomEvent(name, { detail: detail, bubbles: bubbles })
                this.dispatchEvent(cEvent)
            }

        }
        window.customElements.define("as-select", ASSelectElement)
    }
})