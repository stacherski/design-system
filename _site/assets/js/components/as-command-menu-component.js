document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-command-menu') === undefined) {
        class ASCommandMenu extends HTMLElement {

            connectedCallback() {
                // command menu ID
                this.commandMenuId = this.getAttribute("id") || crypto.randomUUID()
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.commandMenuId)

                this.buttonClass = this.getAttribute('button-class') || 'btn btn-outline'
                //localisation
                this.locale = eval(this.getAttribute('locale'))

                // command menu options array
                this.options = eval(this.getAttribute('options') || [])

                if (this.options.length == 0) {
                    throw new Error('You must define command menu options as menu.options variable')
                    this.options = []
                }

                this.filteredOptions = [...this.options]

                this.headings = [...this.filteredOptions]

                this.keys = this.getAttribute('keys').split('+') || ["Meta", "K"]

                this.isMac = navigator.userAgent.indexOf('Mac OS') > 0 ? true : false

                // initialize
                this.init()
                this.render()
                this.registerKeys()
                this.registerPopoverToggle()
                this.registerDrag()
            }

            init() {
                this.innerHTML =
                    `
                    <button class="${this.buttonClass}" btn-menu popovertarget="menu-${this.commandMenuId}">${this.locale.open} (${this.isMac ? '⌘' : '⊞'}+${this.keys[1]})</button>
                    <dialog id="menu-${this.commandMenuId}" popover>
                        <input type="search" placeholder="${this.locale.placeholder}"/>
                        <section></section>
                        <footer>
                            <ul>
                                <li><as-icon name="--as-icon-arrows-up-down" size="m"></as-icon> ${this.locale.navigate}</li>
                                <li><as-icon name="--as-icon-enter" size="m"></as-icon> ${this.locale.select}</li>
                                <li><as-icon name="--as-icon-escape" size="m"></as-icon> ${this.locale.dismiss}</li>
                                <li><as-icon name="--as-icon-arrows-move" size="m"></as-icon> ${this.locale.drag}</li>
                            </ul>
                        </footer>
                    </dialog>
                `
                this.btns = {}
                this.btns.menu = this.querySelector('[btn-menu]')

                this.search = this.querySelector('[type="search"]')
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

            calculatePosition() {
                console.log(this.popoverWrapper.getBoundingClientRect())
            }

            registerKeys() {
                const keyMap = []
                document.addEventListener('keydown', e => {
                    keyMap.push(e.code.replace('Left', '').replace('Right', '').replace('Key', '').replace('Digit', ''))
                    this.decodeCommand(keyMap, e)
                })

                document.addEventListener('keyup', e => keyMap.splice(0, keyMap.length))

                this.search.addEventListener('input', e => this.filterCommands(e.target.value))
            }

            commandsHeadings() {
                this.headings = new Set()
                this.filteredOptions.forEach(option => {
                    this.headings.add(option.section)
                })
            }

            filterCommands(searchText) {
                this.filteredOptions = this.options.filter(option => {
                    return option.keywords.includes(searchText.toLowerCase()) || option.title.includes(searchText)
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
                // close when Esc key is pressed
                if (isKey('Escape'))
                    this.btns.menu.click()

                if (isKey('ArrowUp') || isKey('ArrowDown')) {
                    evt.preventDefault()
                    this.navigateOptions(keyMap[0].replace('Arrow', ''))
                }

                this.filteredOptions.forEach(option => {
                    if (isKey('Alt') && isKey(option.shortcut.split('+')[1])) {
                        this.search.blur()
                        evt.preventDefault()
                        const runHandler = () => option.handler()
                        runHandler()
                    }

                })

            }

            registerPopoverToggle() {
                this.popoverWrapper = this.querySelector('[popover]')
                this.popoverWrapper.addEventListener('toggle', e => {
                    this.popoverWrapper.classList.toggle('bump')
                })
            }

            render() {
                this.commandsHeadings()
                this.section = this.querySelector('section')
                // reset before re-render
                this.section.innerHTML = ''

                if (this.headings.size == 0) {
                    const sec = document.createElement('div')
                    sec.classList.add('nohits')
                    const nohits = document.createElement('h4')
                    nohits.textContent = `${this.locale.nohits}: ${this.search.value}`
                    const hint = document.createElement('p')
                    hint.textContent = this.locale.hint
                    sec.append(nohits, hint)
                    this.section.append(sec)
                }

                this.headings.forEach(heading => {
                    const sec = document.createElement('div')
                    sec.classList.add('section')
                    const h = document.createElement('p')
                    h.classList.add('heading')
                    h.textContent = heading
                    sec.append(h)
                    this.section.append(sec)

                    this.filteredOptions.forEach(option => {
                        if (option.section != heading)
                            return
                        const opt = document.createElement('a')
                        opt.textContent = option.title
                        opt.classList.add('command')
                        opt.setAttribute('tabindex', -1)

                        if (option.hasOwnProperty('href'))
                            opt.href = option.href
                        else
                            opt.href = "#"
                        if (option.hasOwnProperty('handler') && !option.hasOwnProperty('href'))
                            opt.onclick = option.handler

                        const optKeys = document.createElement('div')
                        optKeys.classList.add('keys')

                        option.shortcut.split('+').forEach(key => {
                            const shortcut = document.createElement('code')
                            shortcut.textContent = this.isMac ? key.replace('Alt', '⌥').replace('Key', '') : key.replace('Key', '')
                            optKeys.append(shortcut)
                        })

                        const icon = document.createElement('as-icon')
                        icon.setAttribute('name', '--as-icon-arrow-right')
                        icon.setAttribute('size', 'm')

                        opt.prepend(icon)
                        opt.append(optKeys)
                        sec.append(opt)
                    })
                })
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
        window.customElements.define("as-command-menu", ASCommandMenu)
    }
})