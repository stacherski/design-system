document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-search-menu') === undefined) {
        class TSSearchMenu extends HTMLElement {

            connectedCallback() {
                // command menu ID
                this.searchMenuId = this.getAttribute("id") || crypto.randomUUID()
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.commandMenuId)


                this.keys = this.getAttribute('keys').split('+') || ["Meta", "U"]

                this.isMac = navigator.userAgent.indexOf('Mac OS') > 0 ? true : false

                this.active = false

                this.method = this.getAttribute('method') || 'post'
                this.action = this.getAttribute('action') || '/search/?search='
                this.placeholder = this.getAttribute('placeholder') || 'Search for...'
                this.navigate = this.getAttribute('navigate') || 'Navigate'
                this.enter = this.getAttribute('enter') || 'Select'
                this.dismiss = this.getAttribute('dismiss') || 'Dismiss'
                this.drag = this.getAttribute('drag') || 'Hold & drag'
                this.hint = this.getAttribute('hint') || 'Search tips: some search terms require an exact match. Try typing the entire sentence, or use a different word or phrase.'
                this.nohits = this.getAttribute('nohits') || 'No recent search matches your query, but... there\'s no timelike present to search for something!'
                this.recentSearches = JSON.parse(localStorage.getItem('asRecentSearches')) || [];
                this.filteredSearches = [...this.recentSearches]
                // initialize
                this.init()
                this.render()
                this.registerKeys()
                this.registerPopoverToggle()
                this.registerDrag()
                this.index = 0
            }

            init() {
                this.innerHTML =
                    `
                    <button class="btn" btn-menu popovertarget="menu-${this.searchMenuId}">Search (${this.isMac ? '⌘' : '⊞'}+${this.keys[1]})</button>
                    <dialog id="menu-${this.searchMenuId}" popover>
                        <form method="${this.method}" action="${this.action}">
                            <input type="search" name="search" placeholder="${this.placeholder}"/>
                        </form>
                        ${this.recentSearches.length ? '<div class="recent">Recent searches <button btn-clear class="btn">Clear</button></div>' : ''}
                        <section></section>
                        <footer>
                            <ul>
                                <li><as-icon name="--as-icon-arrows-up-down" size="m"></as-icon> ${this.navigate}</li>
                                <li><as-icon name="--as-icon-enter" size="m"></as-icon> ${this.enter}</li>
                                <li><as-icon name="--as-icon-escape" size="m"></as-icon> ${this.dismiss}</li>
                                <li><as-icon name="--as-icon-arrows-move" size="m"></as-icon> ${this.drag}</li>
                            </ul>
                        </footer>
                    </dialog>
                `
                this.btns = {}
                this.btns.menu = this.querySelector('[btn-menu]')
                this.btns.clear = this.querySelector('[btn-clear]')

                this.form = this.querySelector('form')
                this.search = this.querySelector(':scope [type="search"]')
            }

            registerDrag() {
                this.offsetX = 0
                this.offsetY = 0

                this.isDragged = false

                this.popoverWrapper.addEventListener('pointerdown', e => {
                    const pop = this.popoverWrapper.getBoundingClientRect()

                    this.popoverWrapper.style.transition = 'unset'
                    this.popoverWrapper.style.opacity = '.9'
                    this.isDragged = true
                    this.offsetX = (e.clientX - pop.left)
                    this.offsetY = (e.clientY - pop.top)
                })

                document.addEventListener('pointermove', e => {
                    if (this.isDragged) {
                        this.popoverWrapper.style.pointerEvents = 'none'
                        this.popoverWrapper.style.setProperty('--left', `${e.clientX - this.offsetX}px`)
                        this.popoverWrapper.style.setProperty('--top', `${e.clientY - this.offsetY}px`)
                    }
                })

                document.addEventListener('pointerup', e => {
                    this.popoverWrapper.attributeStyleMap.delete('transition')
                    this.popoverWrapper.attributeStyleMap.delete('opacity')
                    this.popoverWrapper.attributeStyleMap.delete('pointer-events')
                    this.isDragged = false

                })

            }

            registerKeys() {
                this.addEventListener('focusin', () => this.active = true)
                this.addEventListener('focusout', () => this.active = false)

                const keyMap = []
                document.addEventListener('keydown', e => {
                    keyMap.push(e.code.replace('Left', '').replace('Right', '').replace('Key', '').replace('Digit', ''))
                    this.decodeCommand(keyMap, e)
                })

                document.addEventListener('keyup', e => {
                    keyMap.splice(0, keyMap.length)
                })

                this.search.addEventListener('input', e => this.filterCommands(e.target.value))
                this.form.addEventListener('submit', e => {
                    e.preventDefault()
                    this.saveSearch()
                })
                if (this.btns.clear)
                    this.btns.clear.addEventListener('click', e => this.clearSearches())
            }

            uniqueArray(a) {
                return [...new Set(a.map(o => JSON.stringify(o)))].map(s => JSON.parse(s))
            }

            saveSearch() {
                if (this.search.value !== '') {
                    this.recentSearches.push({ searchTerm: `${this.search.value}` })
                    localStorage.setItem('asRecentSearches', JSON.stringify(this.uniqueArray(this.recentSearches)))
                }
                this.form.submit()
            }

            clearSearches() {
                this.filteredSearches = this.recentSearches = []
                localStorage.setItem('asRecentSearches', JSON.stringify(this.recentSearches))
                this.render()
            }

            filterCommands(searchText) {
                console.log('Filtering commands...', searchText)
                this.filteredSearches = this.recentSearches.filter(option => {
                    return option.searchTerm.includes(searchText.toLowerCase())
                })
                this.render()
            }

            decodeCommand(keyMap, evt) {
                const isKey = key => keyMap.includes(key)

                // open when correct keys combination is pressed
                // opening combination is from keys component attribute
                if (isKey(this.keys[0]) && isKey(this.keys[1])) {
                    this.btns.menu.click()
                    this.index = -1
                }

                if (isKey('Enter')) {
                    if (evt.target.textContent)
                        this.search.value = evt.target.textContent
                    else
                        this.search.value = this.search.value
                    this.saveSearch()
                }
                // close when Esc key is pressed
                if (isKey('Escape'))
                    this.btns.menu.click()

                if (isKey('ArrowUp') || isKey('ArrowDown')) {
                    evt.preventDefault()
                    this.navigateOptions(keyMap[0].replace('Arrow', ''))
                }

            }

            registerPopoverToggle() {
                this.popoverWrapper = this.querySelector('[popover]')
                this.popoverWrapper.addEventListener('toggle', e => {
                    this.popoverWrapper.classList.toggle('bump')
                })
            }


            render() {
                //this.commandsHeadings()
                this.section = this.querySelector('section')
                // reset before re-render
                this.section.innerHTML = ''

                this.filteredSearches = this.filteredSearches.reverse()

                if (this.filteredSearches.length == 0) {
                    const sec = document.createElement('div')
                    sec.classList.add('nohits')
                    const nohits = document.createElement('h4')
                    nohits.textContent = `${this.nohits}`
                    const hint = document.createElement('p')
                    hint.textContent = this.hint
                    sec.append(nohits, hint)
                    this.section.append(sec)
                }
                else {
                    const sec = document.createElement('div')
                    sec.classList.add('section')
                    this.section.append(sec)
                    this.filteredSearches.forEach(heading => {
                        const c = document.createElement('a')
                        c.setAttribute('tabindex', -1)
                        c.classList.add('command')
                        c.textContent = heading.searchTerm
                        c.addEventListener('click', () => {
                            this.search.value = heading.searchTerm
                            // this.saveSearch()
                            this.form.submit()
                        })
                        sec.append(c)

                    })
                }

            }

            navigateOptions(dir) {
                const options = this.section.querySelectorAll('.command')
                if (dir == 'Down') {
                    this.index++
                    if (this.index > options.length - 1)
                        this.index = 0
                }
                if (dir == 'Up') {
                    this.index--
                    if (this.index < 0)
                        this.index = options.length - 1
                }

                options.forEach((option, index) => {
                    if (index === this.index)
                        option.focus()
                })

            }
        }
        window.customElements.define("as-search-menu", TSSearchMenu)
    }
})