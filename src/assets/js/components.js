document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-icon') === undefined) {
        class ASIconElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.icon = this.getAttribute('name') || 'user'
                this.isIconVar = this.icon.indexOf('--') > -1 ? true : false

                this.hasColor = this.hasAttribute('color') && this.getAttribute('color').length >= 3
                this.color = this.hasColor ? this.getAttribute('color') : '--as-color-accent'
                this.isColorVar = this.color.indexOf('--') > -1 ? true : false

                this.isImage = this.hasAttribute('image') ? true : false

                this.size = this.getAttribute('size') || 'default'
                this.label = this.getAttribute('label') || undefined

                this.isRotated = this.hasAttribute('rotate')

                if (this.ready)
                    return
                this.render()
            }

            // Specify observed attributes for detecting changes
            static get observedAttributes() {
                return ["new-name"];
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (name === 'new-name') {
                    this.icon = newValue
                    this.render()
                }
            }

            render() {
                this.style.setProperty('--icon', this.isIconVar ? `var(${this.icon})` : `var(--as-icon-${this.icon})`)

                if (this.hasColor)
                    this.style.setProperty('--color-icon', this.isColorVar ? `var(${this.color})` : `${this.color}`)

                this.style.setProperty('--size', `var(--as-size-${this.size})`)

                if (this.label !== undefined)
                    this.setAttribute('aria-label', this.label)
                else
                    this.setAttribute('aria-hidden', true)

                if (this.isRotated)
                    this.style.setProperty('--rotate', this.getAttribute('rotate'))

                if (this.isImage) {
                    const image = document.createElement('img')
                    const customProps = window.getComputedStyle(document.documentElement)
                    const name = this.isIconVar ? `${this.icon}` : `--as-icon-${this.icon}`
                    let data = customProps.getPropertyValue(name).replace('url(', '').replace(')', '').replaceAll('\\', '')
                    image.src = data
                    this.append(image)
                }

                this.removeAttribute('new-name')
                this.removeAttribute('color')
                this.removeAttribute('label')

                this.ready = true
            }
        }
        window.customElements.define("as-icon", ASIconElement)
    }
})
// RESOURCE #61 END
// RESOURCE #109 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-table-actions') === undefined) {
        class ASTableActions extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                // Table Actions ID
                this.tableActionsId = this.getAttribute("id") || crypto.randomUUID()
                this.setAttribute('id', this.tableActionsId)

                // Initialize
                if (this.ready)
                    return

                this.init()
            }

            init() {
                /// default options
                this.settings = {};
                this.settings.tableSelector = this.getAttribute('data-table').indexOf('.') == 0 ? this.getAttribute('data-table') : '#' + this.getAttribute('data-table')
                this.settings.table = document.querySelector(this.settings.tableSelector)
                this.settings.button = this.getAttribute('button-text') || 'Options'

                // render Table Actions structure
                this.innerHTML = `
                    <as-popout popout-id="pop_${this.tableActionsId}" button-text="${this.settings.button}" button-icon="--as-icon-dots" popout-position="bottom" popout-align="span-left">
                    <div style="display: grid; gap: var(--as-space-xs);">
                        <button class="btn" data-action="csv" title="Download as CSV"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download CSV</button>
                        <button class="btn" data-action="excel" title="Download as Excel"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download XLS</button>
                        <button class="btn" data-action="md" title="Download as Markdown"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download MD</button>
                        <button class="btn" data-action="copy" title="Copy"><as-icon name="--as-icon-clone" size="m"></as-icon>Copy as text</button>
                    </div>
                    </as-popout>
                `

                document.addEventListener('as-popout:created', e => {
                    setTimeout(() => {
                        if (e.detail.id === `pop_${this.tableActionsId}`) {
                            this.buttonMD = this.querySelector('button[data-action="md"]')
                            this.buttonCSV = this.querySelector('button[data-action="csv"]')
                            this.buttonEXCEL = this.querySelector('button[data-action="excel"]')
                            this.buttonCOPY = this.querySelector('button[data-action="copy"]')

                            this.buttonMD.addEventListener('click', e => this.downloadMD(e))
                            this.buttonCSV.addEventListener('click', e => this.downloadCSV(e))
                            this.buttonEXCEL.addEventListener('click', e => this.downloadEXCEL(e))
                            this.buttonCOPY.addEventListener('click', e => this.copy(e))
                        }
                    }, 1)

                    document.addEventListener('as-popout:toggle', e => this.broadcastEvent('as-table-actions:popover', { id: this.tableActionsId, state: e.detail.state }))
                    this.ready = true
                })
            }

            downloadCSV(e) {
                const table = this.settings.table
                if (!table) {
                    console.error('Table not found.')
                    return
                }

                const rows = table.querySelectorAll('table tr')
                if (!rows || rows.length === 0) {
                    console.error('No rows in table')
                    return
                }

                const fieldChar = '"'
                const fieldDel = ';'
                const csvRows = []
                const escapedPattern = '/"/g'
                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('th, td')
                    const csvRow = Array.from(cells).map(cell => {
                        const text = cell.textContent.trim()
                        const escaped = text.replace(escapedPattern, '""')
                        return fieldChar + escaped + fieldChar
                    });
                    csvRows.push(csvRow.join(fieldDel))
                });

                const csvContent = csvRows.join('\r\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', `table-export[${this.settings.table.id}].csv`)
                link.style.display = 'none'
                link.click()
                URL.revokeObjectURL(url)
                new Toast('CSV file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'csv', data: csvContent })
            }

            downloadEXCEL(e) {
                const table = this.settings.table
                if (!table) return

                const html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:x="urn:schemas-microsoft-com:office:excel"
                      xmlns="http://www.w3.org/TR/REC-html40">
                  <head>
                    <!--[if gte mso 9]>
                    <xml>
                      <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                          <x:ExcelWorksheet>
                            <x:Name>Sheet1</x:Name>
                            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                          </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                      </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <meta charset="UTF-8">
                  </head>
                  <body>${table.outerHTML}</body>
                </html>`

                const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.setAttribute('href', url);
                link.setAttribute('download', `table-export[${this.settings.table.id}].xls`);
                link.click()

                URL.revokeObjectURL(url)
                new Toast('XLS file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'xls', data: html })
            }

            downloadMD(e) {
                const table = this.settings.table
                if (!table) return

                let markdown = ""
                const rows = Array.from(table.rows)

                rows.forEach((row, rowIndex) => {
                    const cells = Array.from(row.cells).map(cell => cell.innerText.trim())
                    markdown += `| ${cells.join(" | ")} |\n`

                    if (rowIndex === 0) {
                        markdown += `| ${cells.map(() => "---").join(" | ")} |\n`
                    }
                })

                const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.setAttribute('href', url);
                link.setAttribute('download', `table-export[${this.settings.table.id}].md`);
                link.click()

                URL.revokeObjectURL(url)
                new Toast('MD file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'md', data: markdown })
            }

            copy(e) {
                const table = this.settings.table
                if (!table)
                    return

                let text = ""
                for (const row of table.rows) {
                    const cells = Array.from(row.cells).map(cell => cell.innerText.trim())
                    text += cells.join("\t") + "\n"
                }

                navigator.clipboard.writeText(text)
                    .then(() => {
                        this.buttonCOPY.firstChild.setAttribute('new-name', '--as-icon-checkmark')
                        //buttonCOPY.classList.add('active')
                        setTimeout(() => {
                            this.buttonCOPY.firstChild.setAttribute('new-name', '--as-icon-clone')
                            this.buttonCOPY.classList.remove('active')
                        }, 1000)
                    })
                    .catch(err => alert("Failed to copy table: " + err))

                new Toast('Table copied!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'copy', data: text })
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
                console.log(cEvent)
            }

        }
        window.customElements.define("as-table-actions", ASTableActions)
    }
})
// RESOURCE #109 END
// RESOURCE #68 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-select') === undefined) {
        class ASSelectElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }
            connectedCallback() {
                this.selectId = crypto.randomUUID()
                this.setAttribute('id', this.selectId)
                this.body = document.querySelector('body')
                this.select = this.querySelector('select')

                if (!this.select) {
                    throw new Error('Invalid element within as-select, expected <SELECT> element')
                    this.ready = true
                    return
                }
                if (this.ready)
                    return
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

                this.addEventListener('keydown', e => {
                    this.setIndex()
                    this.handleKey(e)
                })
                const calcEvents = ['resize', 'orientationchange', 'scroll']
                calcEvents.forEach(event =>
                    window.addEventListener(event, this.calculateSelectDropdownPosition.bind(this))
                )

                this.tsSelectDropdown.addEventListener('toggle', () => {
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
                    if (index == this.select.selectedIndex)
                        option.setAttribute('selected', '')
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

                this.options.map((option) => {
                    const opt = document.createElement('li')
                    opt.textContent = option.text
                    opt.value = option.value
                    opt.setAttribute('data-index', option.index)
                    opt.setAttribute('tabindex', 0)
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
// RESOURCE #68 END
// RESOURCE #60 BEGIN
window.AS = window.AS || {}

if (!window.AS.Toast) {
    class Toast {
        constructor(message, options) {
            this.message = message
            this.type = options?.type || 'info'
            this.timeout = options?.timeout || 3000
            this.sticky = options?.sticky || false

            this.toastWrapper = document.querySelector('.toast-wrapper')
            if (!this.toastWrapper) {
                this.toastWrapper = document.createElement('div')
                this.toastWrapper.classList.add('toast-wrapper')
                this.toastWrapper.setAttribute('role', 'region')
                this.toastWrapper.setAttribute('aria-live', 'polite')
                document.querySelector('body').append(this.toastWrapper)
            }

            this.render()
        }

        render() {
            const toast = document.createElement('div')
            toast.classList.add('toast')
            toast.classList.add(this.type)
            toast.textContent = this.message
            toast.setAttribute('role', 'alert')
            toast.setAttribute('aria-label', this.type)

            toast.style.setProperty('--delay', Math.round(this.timeout / 1000) + 's')
            this.toastWrapper.prepend(toast)

            const gauge = document.createElement('as-gauge')
            gauge.textContent = Math.round(this.timeout / 1000)
            gauge.setAttribute('size', 1.5)
            gauge.setAttribute('delay', 0)
            //gauge.setAttribute('speed',-1)
            gauge.setAttribute('max', Math.round(this.timeout / 1000))

            if (this.sticky) {
                toast.style.animationName = 'unset'
                const close = document.createElement('button')
                const icon = document.createElement('as-icon')
                icon.setAttribute('name', 'plus')
                icon.setAttribute('rotate', '45deg')
                close.append(icon)
                close.addEventListener('click', () => {
                    toast.style.animationName = 'fadeout'
                    toast.style.setProperty('--delay', '0s')
                    setTimeout(() => toast.remove(), 1000)
                })
                toast.append(close)
            } else {
                toast.prepend(gauge)
                let val = Math.round(this.timeout / 1000)
                setInterval(() => {
                    val--
                    gauge.querySelector('div:first-child').style.setProperty('--gauge-value', val)
                    gauge.querySelector('div:last-child').setAttribute('data-value', val)
                }, 1000)
                setTimeout(() => toast.remove(), this.timeout + 1000)
            }
        }

    }

    window.AS.Toast = Toast
    window.Toast = Toast
}

if (!window.AS.ASCopy) {
    class ASCopy {
        constructor(el) {
            this.el = el
            el.__myWidgetInstance = this
            this.init()
        }

        init() {
            this.el.addEventListener('click', e => {
                navigator.clipboard.writeText(e.target.innerText)
                    .then(() => new Toast(`'${e.target.innerText}' copied`, { type: 'info', timeout: 3000 }))
                    //.then(() => new Toast(`Copied!`,{type:'info'}))
                    .catch(err => new Toast(`Failed to copy: ${err}`, { type: 'error' }))
            })
        }
    }

    window.AS.ASCopy = ASCopy
    window.ASCopy = ASCopy
}

if (!window.AS.ASContrast) {
    class ASContrast {
        constructor(el, colours) {
            this.el = el
            this.colours = colours | []
            this.init()
        }

        init() {
            // get HEX value from computed styles of the element
            const bg = this.rgbToHex(this.srgbToRgb(window.getComputedStyle(this.el)['background-color']))

            // put calculated HEX colur value into P tag below element
            if (this.el.parentNode.querySelector('p'))
                this.el.parentNode.querySelector('p').textContent = bg
            else {
                const p = document.createElement('p')
                p.textContent = bg
                this.el.after(p)
            }
            colours.forEach(colour => {
                const cbox = document.createElement('div')
                cbox.style.backgroundColor = (colour.includes('--')) ? `var(${colour})` : colour
                cbox.setAttribute('hidden', '')
                this.el.append(cbox)

                const c = (colour.includes('--')) ? this.rgbToHex(this.srgbToRgb(window.getComputedStyle(cbox)['background-color'])) : colour

                cbox.remove()

                const ratio = this.getContrastRatioForHex(c, bg)
                if (ratio < 3)
                    return

                const info = document.createElement('div')
                info.classList.add('color-accent')
                info.setAttribute('title', 'Click to copy token')
                info.textContent = `${ratio} (${colour})`
                info.style.setProperty('--color', c)

                info.addEventListener('click', () => {
                    navigator.clipboard.writeText(colour)
                        .then(() => new Toast(`'${colour}' copied`, 1.5))
                        .catch(err => new Toast(`Failed to copy: ${err}`))
                })
                this.el.append(info)
            })

        }

        srgbToRgb(srgbString) {
            if (!srgbString.includes('srgb'))
                return srgbString
            // Use a regex to extract the float values
            const srgbValues = srgbString.match(/[\d.]+/g).map(Number);

            if (srgbValues.length < 3) {
                throw new Error('Invalid srgb string format');
            }

            const [sR, sG, sB] = srgbValues;

            const toRgb = (s) => {
                // The sRGB to linear RGB conversion formula
                if (s <= 0.04045)
                    return (s / 12.92);
                else
                    return Math.pow((s + 0.055) / 1.055, 2.4);
            };

            const r = Math.round(toRgb(sR) * 255);
            const g = Math.round(toRgb(sG) * 255);
            const b = Math.round(toRgb(sB) * 255);

            return `rgb(${r}, ${g}, ${b})`;
        }
        rgbToHex(rgbString) {
            // Use a regex to extract the numbers from the rgb string
            const rgb = rgbString.match(/\d+/g);

            if (!rgb || rgb.length < 3)
                return null;

            // Convert each number to a two-digit hexadecimal string
            const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');

            // Map the array and join the results
            const hex = rgb.map(toHex).join('');

            return `#${hex}`;
        }

        ////////////////////////////////////////////
        // MIT Licensed functions courtesty of Qambar Raza
        // https://github.com/Qambar/color-contrast-checker/blob/master/src/colorContrastChecker.js
        rgbClass = {
            toString: function () {
                return "<r: " + this.r + " g: " + this.g + " b: " + this.b + " >"
            },
        };

        getRGBFromHex(color) {
            var rgb = Object.create(this.rgbClass),
                rVal,
                gVal,
                bVal

            if (typeof color !== "string")
                throw new Error("must use string")

            rVal = parseInt(color.slice(1, 3), 16)
            gVal = parseInt(color.slice(3, 5), 16)
            bVal = parseInt(color.slice(5, 7), 16)

            rgb.r = rVal
            rgb.g = gVal
            rgb.b = bVal

            return rgb
        }

        calculateSRGB(rgb) {
            var sRGB = Object.create(this.rgbClass),
                key

            for (key in rgb) {
                if (rgb.hasOwnProperty(key))
                    sRGB[key] = parseFloat(rgb[key] / 255, 10)
            }

            return sRGB
        }

        calculateLRGB(rgb) {
            var sRGB = this.calculateSRGB(rgb)
            var lRGB = Object.create(this.rgbClass),
                key,
                val = 0

            for (key in sRGB) {
                if (sRGB.hasOwnProperty(key)) {
                    val = parseFloat(sRGB[key], 10)
                    if (val <= 0.03928)
                        lRGB[key] = val / 12.92
                    else
                        lRGB[key] = Math.pow((val + 0.055) / 1.055, 2.4)
                }
            }

            return lRGB
        }

        calculateLuminance(lRGB) {
            return 0.2126 * lRGB.r + 0.7152 * lRGB.g + 0.0722 * lRGB.b
        }

        getContrastRatio(lumA, lumB) {
            var ratio, lighter, darker;

            if (lumA >= lumB) {
                lighter = lumA;
                darker = lumB;
            } else {
                lighter = lumB;
                darker = lumA;
            }

            ratio = (lighter + 0.05) / (darker + 0.05);

            return ratio.toFixed(1);
        }

        getContrastRatioForHex(foregroundColor, backgroundColor) {
            var color1 = this.getRGBFromHex(foregroundColor),
                color2 = this.getRGBFromHex(backgroundColor),
                l1RGB = this.calculateLRGB(color1),
                l2RGB = this.calculateLRGB(color2),
                l1 = this.calculateLuminance(l1RGB),
                l2 = this.calculateLuminance(l2RGB)

            return this.getContrastRatio(l1, l2)
        }

        rgb2hex(rgb) {
            if (/^#[0-9A-F]{6}$/i.test(rgb))
                return rgb

            rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

            function hex(x) {
                return ("0" + parseInt(x, 10).toString(16)).slice(-2);
            }
            return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
        }

    }

    window.AS.ASContrast = ASContrast
    window.ASContrast = ASContrast

    const boxes = document.querySelectorAll('.colorbox:not(.exclude)')
    const colours = [
        '--as-color-accent',
        '--as-color-accent-strong',
        '--as-color-accent-weak',
        '--as-color-text',
        '--as-color-text-strong',
        '--as-color-text-weak',
        '--as-color-text-neutral',
        '--as-color-background-button',
        '--as-color-background-button-strong',
        '--as-color-background-button-weak',
        '--as-color-text-button',
        '--as-color-text-nav',
        '--as-color-text-nav-active',
        '--as-color-status-warning',
        '--as-color-status-warning-strong',
        '--as-color-status-warning-weak',
        '--as-color-status-error',
        '--as-color-status-error-strong',
        '--as-color-status-error-weak',
        '--as-color-status-success',
        '--as-color-status-success-strong',
        '--as-color-status-success-weak',
        '--as-color-status-neutral',
        '--as-color-status-neutral-strong',
        '--as-color-status-neutral-weak'
    ]
    boxes.forEach(box => {
        const contrast = new ASContrast(box, colours)
    })

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.token, .layouts legend .item').forEach(token => token.__myWidgetInstance ? null : new ASCopy(token))
    })
    document.addEventListener('as-svg-to-base:generated', () => {
        document.querySelectorAll('.token').forEach(token => token.__myWidgetInstance ? null : new ASCopy(token))
    })
}
// RESOURCE #60 END
// RESOURCE #67 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-relative-time') === undefined) {
        class ASRelativeTimeElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
                this.dateTime = this.innerHTML || this.getAttribute('datetime') || new Date().toISOString()
            }

            connectedCallback() {


                if (this.dateTime.split('T')[0].split('-')[0].length < 4)
                    this.dateTime = this.dateTime.split('T')[0].split('-').reverse().join('-')

                if (!this.dateTime.split('T')[1])
                    this.dateTime = this.dateTime + 'T00:00'

                if (!this.hasAttribute('disabled'))
                    this.setAttribute('relative', '')

                this.update = this.hasAttribute('update') ? Number(this.getAttribute('update')) * 60000 : 0

                this.scales = {
                    sec: 1000,
                    min: 1000 * 60,
                    hour: 1000 * 60 * 60,
                    day: 1000 * 60 * 60 * 24,
                    week: 1000 * 60 * 60 * 24 * 7,
                    month: 1000 * 60 * 60 * 24 * 30.436875,
                    year: 1000 * 60 * 60 * 24 * 365.2425
                }

                this.diffs = [
                    { start: 0, end: 60, scale: 'sec', time: 'now' },
                    { start: 1, end: 2, scale: 'min', time: 'about 1 min' },
                    { start: 2, end: 3, scale: 'min', time: 'about 2 min' },
                    { start: 3, end: 4, scale: 'min', time: 'about 3 min' },
                    { start: 4, end: 5, scale: 'min', time: 'about 4 min' },
                    { start: 5, end: 6, scale: 'min', time: 'about 5 min' },
                    { start: 6, end: 7, scale: 'min', time: 'about 6 min' },
                    { start: 7, end: 8, scale: 'min', time: 'about 7 min' },
                    { start: 8, end: 9, scale: 'min', time: 'about 8 min' },
                    { start: 9, end: 10, scale: 'min', time: 'about 9 min' },
                    { start: 10, end: 15, scale: 'min', time: 'about 10 min' },
                    { start: 15, end: 20, scale: 'min', time: 'about 15 min' },
                    { start: 20, end: 25, scale: 'min', time: 'about 20 min' },
                    { start: 25, end: 30, scale: 'min', time: 'about 25 min' },
                    { start: 30, end: 45, scale: 'min', time: 'about 30 min' },
                    { start: 45, end: 60, scale: 'min', time: 'about 45 min' },

                    { start: 1, end: 1.5, scale: 'hour', time: 'about 1h' },
                    { start: 1.5, end: 2, scale: 'hour', time: 'about 1.5h' },
                    { start: 2, end: 2.5, scale: 'hour', time: 'about 2h' },
                    { start: 2.5, end: 3, scale: 'hour', time: 'about 2.5h' },
                    { start: 3, end: 3.5, scale: 'hour', time: 'about 3h' },
                    { start: 3.5, end: 4, scale: 'hour', time: 'about 3.5h' },
                    { start: 4, end: 5, scale: 'hour', time: 'about 5h' },
                    { start: 5, end: 6, scale: 'hour', time: 'about 6h' },
                    { start: 6, end: 7, scale: 'hour', time: 'about 7h' },
                    { start: 7, end: 8, scale: 'hour', time: 'about 8h' },
                    { start: 8, end: 9, scale: 'hour', time: 'about 9h' },
                    { start: 9, end: 10, scale: 'hour', time: 'about 10h' },
                    { start: 10, end: 11, scale: 'hour', time: 'about 11h' },
                    { start: 11, end: 12, scale: 'hour', time: 'about 12h' },

                    { start: 0.5, end: 1, scale: 'day', time: 'about 0.5 day' },
                    { start: 1, end: 2, scale: 'day', time: 'about 1 day' },
                    { start: 2, end: 3, scale: 'day', time: 'about 2 days' },
                    { start: 3, end: 4, scale: 'day', time: 'about 3 days' },
                    { start: 4, end: 5, scale: 'day', time: 'about 4 days' },
                    { start: 5, end: 6, scale: 'day', time: 'about 5 days' },
                    { start: 6, end: 7, scale: 'day', time: 'about 6 days' },

                    { start: 1, end: 2, scale: 'week', time: 'about 1 week' },
                    { start: 2, end: 3, scale: 'week', time: 'about 2 weeks' },
                    { start: 3, end: 4, scale: 'week', time: 'about 3 weeks' },

                    { start: 1, end: 2, scale: 'month', time: 'about 1 month' },
                    { start: 2, end: 3, scale: 'month', time: 'about 2 months' },
                    { start: 3, end: 4, scale: 'month', time: 'about 3 months' },
                    { start: 4, end: 5, scale: 'month', time: 'about 4 months' },
                    { start: 5, end: 6, scale: 'month', time: 'about 5 months' },
                    { start: 6, end: 7, scale: 'month', time: 'about 6 months' },
                    { start: 7, end: 8, scale: 'month', time: 'about 7 months' },
                    { start: 8, end: 9, scale: 'month', time: 'about 8 months' },
                    { start: 9, end: 10, scale: 'month', time: 'about 9 months' },
                    { start: 10, end: 11, scale: 'month', time: 'about 10 months' },
                    { start: 11, end: 12, scale: 'month', time: 'about 11 months' },

                    { start: 1, end: 1.5, scale: 'year', time: 'about 1 year' },
                    { start: 1.5, end: 2, scale: 'year', time: 'about 1.5 to 2 years' },
                    { start: 2, end: 2.5, scale: 'year', time: 'about 2 to 2.5 years' },
                    { start: 2.5, end: 3, scale: 'year', time: 'about 2.5 to 3 years' },
                    { start: 3, end: 3.5, scale: 'year', time: 'about 3 to 3.5 years' },
                    { start: 3.5, end: 4, scale: 'year', time: 'about 3.5 to 4 years' },
                    { start: 4, end: 4.5, scale: 'year', time: 'about 4 to 4.5 years' },
                    { start: 4.5, end: 5, scale: 'year', time: 'about 4.5 to 5 years' },
                    { start: 5, end: Infinity, scale: 'year', time: 'more than 5 years' },
                ]

                if (this.ready)
                    return

                this.init()

                if (this.update)
                    setInterval(() => this.render(), this.update)

                this.addEventListener('click', () => {
                    this.toggleAttribute('relative')
                    this.render()
                })
            }

            init() {
                this.render()
                this.ready = true
            }

            calculateRelativeTime() {
                const timestamp = new Date().getTime()
                const now = new Date(Date.parse(this.dateTime)).getTime()

                let diff = now - timestamp
                const isPast = diff < 0
                diff = Math.abs(diff)
                console.log('diff', diff)
                const relativeTime = this.diffs.find(d => {
                    let scale, start, end

                    scale = this.scales[d.scale]

                    start = d.start * scale
                    end = d.end * scale

                    return diff >= start && diff < end
                })

                if (!relativeTime)
                    return this.dateTime
                if (relativeTime.start == 0)
                    return relativeTime.time

                return isPast ? `${relativeTime.time} ago` : `in ${relativeTime.time}`
            }



            render() {
                this.hasAttribute('relative')
                    ? this.textContent = this.calculateRelativeTime()
                    : this.textContent = this.hasAttribute('notime') ? this.dateTime.split('T')[0] : this.dateTime
                this.title = this.dateTime.split('T').join(' @')
            }


        }
        window.customElements.define("as-relative-time", ASRelativeTimeElement)
    }
})
// RESOURCE #67 END
// RESOURCE #70 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-date-picker') === undefined) {
        class ASDatePickerElement extends HTMLElement {
            connectedCallback() {
                queueMicrotask(() => {
                    this.datePickerId = crypto.randomUUID()
                    this.breakpoint = this.getAttribute('breakpoint') || 800

                    this.locale = this.getAttribute('locale') || document.documentElement.getAttribute('lang') || 'en'

                    this.input = this.querySelector('input')
                    this.yearSpan = this.hasAttribute('yearspan') ? Number(this.getAttribute('yearspan')) : 20

                    this.reverse = this.hasAttribute('reverse') || false

                    this.date = this.input.value || new Date().toISOString().split('T')[0]

                    this.placeholder = this.input.getAttribute('placeholder') || this.getAttribute('placeholder') || this.reverse ? this.reverseDate(this.date) : this.date
                    if (this.reverse) {
                        this.input.setAttribute('pattern', '[0-9]{2}-[0-9]{2}-[0-9]{4}')
                        this.input.setAttribute('title', 'DD-MM-YYYY')
                    }
                    else {
                        this.input.setAttribute('pattern', '[0-9]{4}-[0-9]{2}-[0-9]{2}')
                        this.input.setAttribute('title', 'YYYY-MM-DD')
                    }

                    if (this.input.value == '')
                        this.input.setAttribute('placeholder', this.placeholder)
                    this.render()
                })
            }
            render() {
                this.icon = document.createElement('button')
                this.icon.setAttribute('type', 'button')
                const c = document.createElement('as-icon')
                c.setAttribute('name', '--as-icon-calendar')
                c.setAttribute('size', 'l')
                this.icon.setAttribute('popovertarget', this.datePickerId)
                this.icon.style.setProperty('anchor-name', `--${this.datePickerId}`)
                this.icon.append(c)
                this.append(this.icon)

                this.calendarWrapper = document.createElement('div')
                this.calendarWrapper.setAttribute('popover', '')
                this.calendarWrapper.setAttribute('id', this.datePickerId)
                this.calendarWrapper.style.setProperty('position-anchor', `--${this.datePickerId}`)
                this.calendarWrapper.style.setProperty('position-anchor', `--${this.datePickerId}`)
                this.calendarContent = document.createElement('div')
                this.calendarContent.setAttribute('calendar', '')

                this.yearSelect = this.populateYearSelect(this.yearSpan)
                this.monthSelect = this.populateMonthSelect()

                this.monthPrev = document.createElement('button')
                this.monthPrev.setAttribute('month', '')
                this.monthPrev.setAttribute('size', 'm')
                this.monthPrev.classList.add('btn')
                const p = document.createElement('as-icon')
                p.setAttribute('name', '--as-icon-chevron-left')
                this.monthPrev.append(p)

                this.monthNext = document.createElement('button')
                this.monthNext.setAttribute('month', '')
                this.monthNext.setAttribute('size', 'm')
                this.monthNext.classList.add('btn')
                const n = document.createElement('as-icon')
                n.setAttribute('name', '--as-icon-chevron-right')
                this.monthNext.append(n)


                this.cal = this.renderCalendar(this.date)

                const header = document.createElement('header')
                header.append(this.monthSelect, this.yearSelect, this.monthPrev, this.monthNext)
                this.calendarContent.append(header, this.cal)

                this.calendarWrapper.append(this.calendarContent)
                this.append(this.calendarWrapper)

                this.toggleInputType()

                this.bindEvents()

                this.broadcastEvent('as-date-picker:created', { id: this.datePickerId })
            }

            populateYearSelect(span = 10) {
                const fragment = new DocumentFragment
                const currentYear = new Date().getFullYear()
                const tsSelect = document.createElement('as-select')
                tsSelect.setAttribute('year', '')
                this.selectYear = document.createElement('select')
                let index = 0
                for (let y = currentYear - span; y <= currentYear + span; y++) {
                    const option = document.createElement('option')
                    option.value = y
                    option.text = y
                    option.setAttribute('index', index)
                    index++
                    if (y == this.date.split('-')[0])
                        option.selected = true
                    this.selectYear.append(option)
                }
                tsSelect.append(this.selectYear)
                fragment.append(tsSelect)
                return fragment
            }

            populateMonthSelect() {
                const fragment = new DocumentFragment
                const currentMonth = Number(this.date.split('-')[1]) - 1
                const tsSelect = document.createElement('as-select')
                tsSelect.setAttribute('month', '')
                this.selectMonth = document.createElement('select')
                for (let m = 1; m <= 12; m++) {
                    const option = document.createElement('option')
                    option.value = String(m).padStart(2, '0')
                    option.text = new Date(2000, m - 1, 1).toLocaleString(this.locale, { month: 'long' })
                    if (m - 1 == currentMonth)
                        option.selected = true
                    this.selectMonth.append(option)
                }
                tsSelect.append(this.selectMonth)
                fragment.append(tsSelect)
                return fragment
            }

            // render current month
            renderCalendar(date) {
                let year = Number(date.split('-')[0])
                let month = Number(date.split('-')[1]) - 1
                let day = Number(date.split('-')[2])
                let today = new Date().toISOString().split('T')[0]

                const fragment = new DocumentFragment
                const calendar = document.createElement('div')
                calendar.setAttribute('cal', '')

                for (let i = 0; i <= 6; i++) {
                    const weekday = document.createElement('div')
                    weekday.textContent = new Intl.DateTimeFormat(this.locale, { weekday: "narrow" }).format(new Date(2023, 7, i))
                    calendar.append(weekday)
                }

                let firstDayOfMonth = new Date(year, month, 1).getDay() - 1 === -1 ? 6 : new Date(year, month, 1).getDay() - 1;
                let lastDateOfMonth = new Date(year, month + 1, 0).getDate();
                let lastDayOfMonth = new Date(year, month, lastDateOfMonth).getDay() - 1 == -1 ? 6 : new Date(year, month, lastDateOfMonth).getDay() - 1;
                let lastDateOfLastMonth = new Date(year, month, 0).getDate();

                // render first week with days from past month
                for (let i = firstDayOfMonth; i > 0; i--) {
                    const d = document.createElement('button')
                    d.setAttribute('prev', '')
                    d.textContent = lastDateOfLastMonth - i + 1
                    const date = `${month == 0 ? year - 1 : year}-${month == 0 ? 12 : String(month).padStart(2, '0')}-${String(lastDateOfLastMonth - i + 1).padStart(2, '0')}`
                    d.addEventListener('click', e => {
                        e.preventDefault()
                        this.dayChange(date)
                    })
                    calendar.append(d)
                }

                // render all days within current month
                for (let i = 1; i <= lastDateOfMonth; i++) {
                    const d = document.createElement('button')
                    d.setAttribute('curr', '')
                    d.textContent = i
                    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
                    if (today === date)
                        d.setAttribute('today', '')
                    if (i == day) {
                        d.setAttribute('selected', '')
                        d.focus()
                    }
                    d.addEventListener('click', e => {
                        e.preventDefault()
                        this.dayChange(date)
                    })
                    calendar.append(d)
                }

                // render last week by adding days from next month
                for (let i = lastDayOfMonth; i < 6; i++) {
                    const d = document.createElement('button')
                    d.setAttribute('next', '')
                    d.textContent = i - lastDayOfMonth + 1
                    const date = `${month == 11 ? year + 1 : year}-${month == 11 ? String(1).padStart(2, '0') : String(month + 2).padStart(2, '0')}-${String(i - lastDayOfMonth + 1).padStart(2, '0')}`
                    d.addEventListener('click', e => {
                        e.preventDefault()
                        this.dayChange(date)
                    })
                    calendar.append(d)
                }

                fragment.append(calendar)

                return fragment
            }

            dayChange(date = this.date) {
                this.selectMonth.selectedIndex = Number(date.split('-')[1] - 1)
                const yearIndex = [...this.selectYear.options].filter(option => option.value == date.split('-')[0])
                this.date = date
                this.input.value = this.reverse ? this.reverseDate(this.date) : this.date
                this.input.setAttribute('value', this.reverse ? this.reverseDate(this.date) : this.date)
                this.selectMonth.dispatchEvent(new Event('change', { bubbles: true }))
                this.calendarContent.querySelector('[cal]').remove()
                this.calendarContent.append(this.renderCalendar(this.date))
                this.focusSelected()
                if (yearIndex.length > 0) {
                    this.selectYear.selectedIndex = yearIndex[0].index
                    this.selectYear.dispatchEvent(new Event('change', { bubbles: true }))
                }
                this.onKey()
                this.broadcastEvent('as-date-picker:changed', { id: this.datePickerId, date: this.date, changed: ['day'] })

            }

            reverseDate(date) {
                return date.split('-').reverse().join('-')
            }

            focusSelected() {
                queueMicrotask(() => {
                    this.calendarContent.querySelector('button[selected]').focus()
                })
            }

            monthSelectChange() {
                let date = this.date.split('-')
                date[1] = this.selectMonth.options[this.selectMonth.selectedIndex].value
                this.date = date.join('-')
                this.input.value = this.reverse ? this.reverseDate(this.date) : this.date
                this.input.setAttribute('value', this.reverse ? this.reverseDate(this.date) : this.date)
                this.calendarContent.querySelector('[cal]').remove()
                this.calendarContent.append(this.renderCalendar(this.date))
                this.focusSelected()
                this.onKey()
                this.broadcastEvent('as-date-picker:changed', { id: this.datePickerId, date: this.date, changed: ['month'] })
            }

            yearSelectChange() {
                let date = this.date.split('-')
                date[0] = this.selectYear.options[this.selectYear.selectedIndex].value
                this.date = date.join('-')
                this.input.value = this.reverse ? this.reverseDate(this.date) : this.date
                this.input.setAttribute('value', this.reverse ? this.reverseDate(this.date) : this.date)
                this.calendarContent.querySelector('[cal]').remove()
                this.calendarContent.append(this.renderCalendar(this.date))
                this.focusSelected()
                this.onKey()
                this.broadcastEvent('as-date-picker:changed', { id: this.datePickerId, date: this.date, changed: ['year'] })
            }

            bindEvents() {
                this.selectYear.addEventListener('change', this.yearSelectChange.bind(this))
                this.selectMonth.addEventListener('change', this.monthSelectChange.bind(this))
                this.monthPrev.addEventListener('click', e => {
                    e.preventDefault()
                    const year = Number(this.date.split('-')[0])
                    const month = Number(this.date.split('-')[1]) - 1
                    const day = Number(this.date.split('-')[2])
                    const date = `${month == 0 ? year - 1 : year}-${month == 0 ? 12 : String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    this.dayChange(date)
                })

                this.monthNext.addEventListener('click', e => {
                    e.preventDefault()
                    const year = Number(this.date.split('-')[0])
                    const month = Number(this.date.split('-')[1]) - 1
                    const day = Number(this.date.split('-')[2])
                    const date = `${month == 11 ? year + 1 : year}-${month == 11 ? String(1).padStart(2, '0') : String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    this.dayChange(date)
                })

                this.calendarWrapper.addEventListener('toggle', e => {
                    this.broadcastEvent(`as-date-picker:${e.newState}`, { id: this.datePickerId })
                })

                this.input.addEventListener('keydown', this.manualDate.bind(this))
                this.input.addEventListener('change', this.mobileDatePicker.bind(this))
                this.calendarWrapper.addEventListener('keydown', this.selectDayWithArrows.bind(this))

                window.addEventListener('resize', () => this.toggleInputType())
            }

            mobileDatePicker() {
                this.date = this.input.value
            }

            toggleInputType() {
                if (window.innerWidth < this.breakpoint) {
                    this.icon.style.display = 'none'
                    this.input.setAttribute('type', 'date')
                    this.input.value = this.date
                    this.broadcastEvent('as-date-picker:breakpoint', { id: this.datePickerId, breakpoint: 'mobile' })
                }
                else {
                    this.icon.style.display = 'inline'
                    this.input.setAttribute('type', 'text')
                    this.input.value = this.reverse ? this.reverseDate(this.date) : this.date
                    this.broadcastEvent('as-date-picker:breakpoint', { id: this.datePickerId, breakpoint: 'desktop' })
                }
            }

            onKey() {
                this.input.dispatchEvent(new Event('keyup', { bubbles: true }))
            }

            manualDate(e) {
                let date = e.target.value.length == 10 ? e.target.value : this.date
                if (e.key == 'Enter')
                    this.dayChange(date)
                if (e.key == 'ArrowUp') {
                    if (e.target.value == '')
                        return
                    date = new Date(Date.parse(this.reverse ? this.reverseDate(date) : date) + 86400000).toISOString().split('T')[0]
                    this.dayChange(date)
                }
                if (e.key == 'ArrowDown') {
                    if (e.target.value == '')
                        return
                    date = new Date(Date.parse(this.reverse ? this.reverseDate(date) : date) - 86400000).toISOString().split('T')[0]
                    this.dayChange(date)
                }
            }

            calculateDate(days = 0) {
                const newDate = new Date(Date.parse(this.date) + days * 86400000).toISOString().split('T')[0]
                return newDate
            }

            selectDayWithArrows(e) {
                const key = e.key
                const current = document.activeElement
                if (!current || current.nodeName !== 'BUTTON') return

                const container = this.calendarContent.querySelector('[cal]')
                const days = Array.from(container.querySelectorAll('button'))
                const index = days.indexOf(current)
                if (index === -1) return

                const columns = 7

                let targetIndex = null

                if (key === 'ArrowRight') {
                    targetIndex = index + 1
                    this.date = this.calculateDate(1)
                }
                if (key === 'ArrowLeft') {
                    targetIndex = index - 1
                    this.date = this.calculateDate(-1)
                }
                if (key === 'ArrowDown') {
                    targetIndex = index + columns
                    this.date = this.calculateDate(columns)
                }
                if (key === 'ArrowUp') {
                    targetIndex = index - columns
                    this.date = this.calculateDate(-columns)
                }

                if (targetIndex >= days.length || targetIndex < 0)
                    this.dayChange()

                if (targetIndex == null) return

                const target = days[targetIndex]
                if (target) target.focus()
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
        window.customElements.define("as-date-picker", ASDatePickerElement)
    }
})


class ASDatePicker {
    constructor(el) {
        const elParent = el.parentNode
        const picker = document.createElement('as-date-picker')
        elParent.insertBefore(picker, el)
        picker.append(el)
    }
}
// RESOURCE #70 END
// RESOURCE #74 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-dot-matrix-clock') === undefined) {
        class ASDotMatrixClock extends HTMLElement {

            connectedCallback() {
                // Clock ID
                this.clockId = this.getAttribute("id") || crypto.randomUUID()
                // set default ID
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.clockId)

                // Initialize
                this.init()
            }

            disconnectedCallback() {
                if (this._interval) clearInterval(this._interval);
            }

            isVar(color) {
                return color.indexOf('--') > -1
            }

            init() {

                if (this.hasAttribute('digit-bg'))
                    this.style.setProperty('--digit-bg', this.isVar(this.getAttribute('digit-bg')) ? `var(${this.getAttribute('digit-bg')})` : `${this.getAttribute('digit-bg')}`)
                if (this.hasAttribute('digit-color'))
                    this.style.setProperty('--digit-color', this.isVar(this.getAttribute('digit-color')) ? `var(${this.getAttribute('digit-color')})` : `${this.getAttribute('digit-color')}`)
                if (this.hasAttribute('size'))
                    this.style.setProperty('--size', this.isVar(this.getAttribute('size')) ? `var(${this.getAttribute('size')})` : `${this.getAttribute('size')}`)

                this.innerHTML =
                    `
                    <div class="hours a"></div>
                    <div class="hours b"></div>
                    <div class="divider"></div>
                    <div class="minutes a"></div>
                    <div class="minutes b"></div>
                    <div class="divider"></div>
                    <div class="seconds a"></div>
                    <div class="seconds b"></div>
                `
                this.generateDigitsGrid()

                this.secondsA = this.querySelector('.seconds.a')
                this.secondsB = this.querySelector('.seconds.b')
                this.minutesA = this.querySelector('.minutes.a')
                this.minutesB = this.querySelector('.minutes.b')
                this.hoursA = this.querySelector('.hours.a')
                this.hoursB = this.querySelector('.hours.b')

                this._interval = setInterval(() => this.setClock(), 1000)

            }

            generateDigitsGrid() {
                const rows = 5
                const cols = 4
                const clock = this.querySelectorAll('.a, .b')
                clock.forEach(digit => {
                    for (let i = 1; i <= rows * cols; i++) {
                        const dot = document.createElement('div')
                        digit.append(dot)
                    }
                })
                const divider = this.querySelectorAll('.divider')
                divider.forEach(div => {
                    for (let i = 1; i <= rows; i++) {
                        const dot = document.createElement('div')
                        div.append(dot)
                    }
                })
            }
            setClock() {
                const currentDate = new Date();
                this.secondsA.setAttribute('val', String(currentDate.getSeconds()).padStart(2, '0').split('')[0])
                this.secondsB.setAttribute('val', String(currentDate.getSeconds()).padStart(2, '0').split('')[1])
                this.minutesA.setAttribute('val', String(currentDate.getMinutes()).padStart(2, '0').split('')[0])
                this.minutesB.setAttribute('val', String(currentDate.getMinutes()).padStart(2, '0').split('')[1])
                this.hoursA.setAttribute('val', String(currentDate.getHours()).padStart(2, '0').split('')[0])
                this.hoursB.setAttribute('val', String(currentDate.getHours()).padStart(2, '0').split('')[1])
            }


        }
        window.customElements.define("as-dot-matrix-clock", ASDotMatrixClock)
    }
})
// RESOURCE #74 END
// RESOURCE #77 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-select2range') === undefined) {
        class ASSelect2Range extends HTMLElement {
            connectedCallback() {
                // Initialize
                this.init()
            }
            init() {
                this.selectId = crypto.randomUUID()
                this.body = document.querySelector('body')
                this.select = this.querySelector('select')
                if (!this.select) {
                    throw new Error('Invalid element within as-select, expected <SELECT> element')
                    this.broadcastEvent('as-select2range:created', { id: this.selectId, action: 'not-created' })
                    return
                }
                this.createUI()
                this.addEventListeners()
                this.broadcastEvent('as-select2range:created', { id: this.selectId, action: 'created' })
            }

            createUI() {
                this.tsSelectWrapper = document.createElement('div')

                this.tsRangeMarkers = document.createElement('div')
                this.tsRangeMarkers.setAttribute('markers', '')
                this.tsRangeMarkers.setAttribute('aria-hidden', true);

                for (const option in [...this.select.options]) {
                    const marker = document.createElement('div')
                    this.tsRangeMarkers.append(marker)
                }
                this.tsRange = document.createElement('input')
                this.tsRange.setAttribute('type', 'range')
                this.tsRange.setAttribute('min', 0)
                this.tsRange.setAttribute('max', this.select.options.length - 1)
                this.tsRange.setAttribute('step', 1)

                this.tsRange.value = this.getSelectedOption()

                this.tsRangeSelected = document.createElement('div')
                this.tsRangeSelected.setAttribute('aria-live', 'polite');

                this.tsSelectWrapper.append(this.select, this.tsRangeMarkers, this.tsRange, this.tsRangeSelected)

                this.append(this.tsSelectWrapper)

                this.displaySelectedOption()
                this.calculateThumbPosition()
            }

            addEventListeners() {
                this.tsRange.addEventListener('input', this.selectOption.bind(this))

                //        this.select.addEventListener('change', e => {
                //            console.log('changed to:',e.target.options[e.target.selectedIndex].text)
                //        })
            }

            selectOption(e) {
                this.select.selectedIndex = e.target.value
                this.calculateThumbPosition()
                this.displaySelectedOption()
                this.select.dispatchEvent(new Event('change', { bubbles: true }))
                this.broadcastEvent('as-select2range:selected', { id: this.selectId, action: 'selected', name: this.select.options[this.select.selectedIndex].text, value: this.select.options[this.select.selectedIndex].value })
            }

            calculateThumbPosition() {
                const val = 100 * this.tsRange.value / this.tsRange.max
                this.tsRange.style.setProperty('--val', val + '%')
            }

            displaySelectedOption() {
                this.tsRangeSelected.textContent = this.select.options[this.select.selectedIndex].text
            }

            getSelectedOption() {
                return this.select.selectedIndex
            }

            handleKey(e) {
                if (e.code == "Enter" || e.code == "Space") {
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
                //console.log(cEvent)
            }

        }
        window.customElements.define("as-select2range", ASSelect2Range)
    }
})
// RESOURCE #77 END

// RESOURCE #80 BEGIN
// register new custom element
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
// RESOURCE #80 END
// RESOURCE #86 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-gauge') === undefined) {
        class ASGauge extends HTMLElement {
            connectedCallback() {
                /// default options
                this.settings = {}
                this.settings.value = this.getAttribute('val') || this.textContent || 50
                this.settings.max = this.getAttribute('max') || 100
                this.settings.half = this.hasAttribute('half') || false
                this.settings.size = this.getAttribute('size') || 3
                this.settings.speed = this.getAttribute('speed') || 1
                this.settings.delay = this.getAttribute('delay') || 1000
                this.settings.basesize = this.getAttribute('basesize') || window.getComputedStyle(document.querySelector('body')).fontSize.replace('px', '')
                this.settings.thumb = this.getAttribute('thumb') || '--as-color-status-success'
                this.settings.track = this.getAttribute('track') || '--as-color-text-neutral'
                this.settings.bg = this.getAttribute('bg') || 'transparent'
                this.settings.path = `path("M${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .12}A${this.settings.basesize * this.settings.size * .38},${this.settings.basesize * this.settings.size * .38},0,1,0,${this.settings.basesize * this.settings.size * .88},${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .38},${this.settings.basesize * this.settings.size * .38},0,0,0,${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .12}M${this.settings.basesize * this.settings.size * .5},0A${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .5},0,1,1,0,${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .5},${this.settings.basesize * this.settings.size * .5},0,0,1,${this.settings.basesize * this.settings.size * .5},0Z")`
                ///
                this.init()
            }

            isColorVar(color) {
                return color.indexOf('--') > -1 ? true : false
            }

            init() {
                // Gauge ID
                this.gaugeId = this.getAttribute("id") || crypto.randomUUID()
                // set default ID
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.gaugeId)
                // render gauge structure
                this.innerHTML = `
                    <div></div><div></div>
                `;
                // calculate CSS variables
                const gauge = this.querySelector('div:first-child')
                const gaugeDisplay = this.querySelector('div:last-child')
                gauge.style.setProperty('--gauge-value', '0')
                gauge.style.setProperty('--max', this.settings.max)
                gauge.style.setProperty('--ratio', 100 / this.settings.max)
                gauge.style.setProperty('--size', this.settings.size + 'rem')
                gauge.style.setProperty('--speed', this.settings.speed + 's')
                gauge.style.setProperty('--thumb', this.isColorVar(this.settings.thumb) ? `var(${this.settings.thumb})` : `${this.settings.thumb}`)
                gauge.style.setProperty('--track', this.isColorVar(this.settings.track) ? `var(${this.settings.track})` : `${this.settings.track}`)
                gauge.style.setProperty('--path', this.settings.path)
                gauge.setAttribute('data-value', this.settings.value)
                gauge.setAttribute('data-max', this.settings.max)

                gaugeDisplay.style.setProperty('--max', this.settings.max);
                gaugeDisplay.style.setProperty('--size', this.settings.size + 'rem')
                gaugeDisplay.style.setProperty('--color-bg', this.isColorVar(this.settings.bg) ? `var(${this.settings.bg})` : `${this.settings.bg}`)
                gaugeDisplay.setAttribute('data-value', this.settings.value)
                gaugeDisplay.setAttribute('data-max', this.settings.max)
                setTimeout(() => {
                    gauge.style.setProperty('--gauge-value', this.settings.value)
                }, this.settings.delay)
            }
        }
        window.customElements.define("as-gauge", ASGauge)
    }
})
// RESOURCE #86 END
// RESOURCE #88 BEGIN
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-carousel')) return

    class ASCarousel extends HTMLElement {
        static get observedAttributes() {
            return ['gap', 'delay', 'speed']
        }

        connectedCallback() {
            this.gap = 16
            this.delay = 3
            this.speed = 200
            this.autorotate = false

            this.velocity = 0
            this.lastX = 0
            this.lastTime = 0
            this.inertiaFrame = null

            this.isDragging = false

            this._onResize = this.resize.bind(this)
            this._onPointerMove = this.dragAction.bind(this)
            this._onPointerUp = this.dragEnd.bind(this)
            this._onWheel = this.dragStart.bind(this)

            this.carouselId = this.getAttribute('id') || 'as-carousel-' + crypto.randomUUID()
            if (!this.getAttribute('id')) this.setAttribute('id', this.carouselId)

            this.slideIdentifier = this.getAttribute('slideid') || 'item'
            this.gap = Number(this.getAttribute('gap')) || 16
            this.delay = Number(this.getAttribute('delay')) || 3
            this.speed = Number(this.getAttribute('speed')) || 200
            this.autorotate = this.hasAttribute('autorotate')

            const content = this.innerHTML

            this.innerHTML = `
                <div class="slider">
                    ${content}
                    <div class="controls">
                        <button class="btn"><as-icon name="arrow-right" flip-x></as-icon>Prev</button>
                        <button class="btn">Next<as-icon name="arrow-right"></as-icon></button>
                    </div>
                </div>
                <button class="btn" id="playpause">Play</button>
            `

            this.sliderRoot = this.querySelector('div.slider')
            this.slider = this.sliderRoot.querySelector('ul')
            this.playpausebutton = this.querySelector('#playpause')
            this.prevbutton = this.querySelector('.controls button:first-child')
            this.nextbutton = this.querySelector('.controls button:last-child')

            this.init()
        }

        disconnectedCallback() {
            window.removeEventListener('resize', this._onResize)
            document.removeEventListener('pointermove', this._onPointerMove)
            document.removeEventListener('pointerup', this._onPointerUp)
            this.sliderRoot.removeEventListener('wheel', this._onWheel)

            cancelAnimationFrame(this.inertiaFrame)
            clearInterval(this.rotateInterval)
            clearTimeout(this.autostart)
        }

        attributeChangedCallback() {
            this.resize()
        }

        init() {
            window.addEventListener('resize', this._onResize)
            this.removeAttribute('hidden')

            this.prevbutton.addEventListener('click', () => {
                this.abortInertia()
                this.step(0)
                if (this.autorotate) this.pause()
            })

            this.nextbutton.addEventListener('click', () => {
                this.abortInertia()
                this.step(1)
                if (this.autorotate) this.pause()
            })

            this.playpausebutton.addEventListener('click', () =>
                this.autorotate ? this.pause() : this.autoplay()
            )

            this.sliderRoot.addEventListener('pointerdown', e => this.dragStart(e))
            this.sliderRoot.addEventListener('wheel', this._onWheel, { passive: false })

            if (!this.hasAttribute('cloned')) {
                this.cloneSlides(this.slider)
                this.setAttribute('cloned', '')
            }

            this.resize()

            if (this.autorotate) {
                this.autostart = setTimeout(() => this.autoplay(), this.delay * 1000)
                this.playpausebutton.textContent = 'Pause'
            }
        }

        resize() {
            const slide = this.slider.querySelector(`[${this.slideIdentifier}]`)
            if (!slide) return

            this.slideWidth = slide.getBoundingClientRect().width
            const count = this.slider.querySelectorAll(`[${this.slideIdentifier}]`).length
            this.sliderWidth = (this.slideWidth + this.gap) * count - this.gap
            this.maxLeft = this.sliderWidth / 3
            this.slider.style.left = -this.maxLeft + 'px'
        }

        autoplay() {
            this.autorotate = true
            this.autoRotate(1, this.delay)
            this.dispatchEvent(new CustomEvent('as-carousel:play', { bubbles: true }))
        }

        pause() {
            this.autorotate = false
            clearInterval(this.rotateInterval)
            clearTimeout(this.autostart)
            this.playpausebutton.textContent = 'Play'
            this.dispatchEvent(new CustomEvent('as-carousel:pause', { bubbles: true }))
        }

        abortInertia() {
            cancelAnimationFrame(this.inertiaFrame)
            this.velocity = 0
            this.isDragging = false
        }

        dragStart(evt) {
            if (evt.type === 'wheel') {
                evt.preventDefault()
                this.abortInertia()
                this.step(evt.deltaX > 0 ? 1 : 0)
                if (this.autorotate) this.pause()
                return
            }

            this.abortInertia()
            this.isDragging = true
            this.lastX = evt.clientX
            this.lastTime = performance.now()

            document.addEventListener('pointermove', this._onPointerMove)
            document.addEventListener('pointerup', this._onPointerUp)

            if (this.autorotate) this.pause()
        }

        dragAction(evt) {
            if (!this.isDragging) return

            const now = performance.now()
            const dx = evt.clientX - this.lastX
            const dt = now - this.lastTime || 1

            this.velocity = dx / dt
            this.lastX = evt.clientX
            this.lastTime = now

            this.slider.style.transitionDuration = '0ms'
            this.slider.style.left =
                (parseFloat(this.slider.style.left) + dx) + 'px'

            evt.preventDefault()
        }

        dragEnd() {
            this.isDragging = false
            document.removeEventListener('pointermove', this._onPointerMove)
            document.removeEventListener('pointerup', this._onPointerUp)
            this.applyInertia()
        }

        applyInertia() {
            const friction = 0.92

            const step = () => {
                if (Math.abs(this.velocity) < 0.02) {
                    this.snapWithVelocity()
                    return
                }

                this.velocity *= friction
                this.slider.style.left =
                    (parseFloat(this.slider.style.left) + this.velocity * 16) + 'px'

                this.inertiaFrame = requestAnimationFrame(step)
            }

            this.inertiaFrame = requestAnimationFrame(step)
        }

        snapWithVelocity() {

            const absV = Math.abs(this.velocity)
            if (absV === 0) return

            const dir = this.velocity < 0 ? 1 : 0
            let slides = 1

            if (absV > 0.005) slides = 2
            if (absV > 0.01) slides = 3
            if (absV > 0.02) slides = 4

            console.log('s', slides)
            for (let i = 0; i < slides; i++)
                this.step(dir)
        }

        step(dir) {
            this.moveSlide(dir)
        }

        cloneSlides(slider) {
            const slides = [...slider.querySelectorAll(`[${this.slideIdentifier}]`)]
            slides.forEach(s => slider.appendChild(s.cloneNode(true)))
            slides.forEach(s => slider.appendChild(s.cloneNode(true)))
        }

        autoRotate(dir, delay) {
            this.step(dir)
            this.rotateInterval = setInterval(() => this.step(dir), delay * 1000)
            this.playpausebutton.textContent = 'Pause'
        }

        moveSlide(dir) {
            console.log('slide')
            const slides = this.slider.querySelectorAll(`[${this.slideIdentifier}]`)
            this.slider.style.transitionDuration = `${this.speed}ms`

            if (dir) {
                this.slider.appendChild(slides[0].cloneNode(true))
                this.slider.style.left =
                    (-this.maxLeft - this.gap - this.slideWidth) + 'px'

                setTimeout(() => {
                    slides[0].remove()
                    this.resetPosition()
                }, this.speed)
            }
            else {
                this.slider.style.left =
                    (-this.maxLeft + this.gap + this.slideWidth) + 'px'

                setTimeout(() => {
                    this.slider.insertBefore(
                        slides[slides.length - 1].cloneNode(true),
                        slides[0]
                    )
                    slides[slides.length - 1].remove()
                    this.resetPosition()
                }, this.speed)
            }
        }

        resetPosition() {
            this.slider.style.transitionDuration = '0ms'
            this.slider.style.left = -this.maxLeft + 'px'
        }
    }

    window.customElements.define('as-carousel', ASCarousel)
})

// RESOURCE #88 END
// RESOURCE #90 BEGIN
// register new custom element
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
// RESOURCE #90 END
// RESOURCE #92 BEGIN
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-graph')) return

    class ASGraph extends HTMLElement {
        // Specify observed attributes for detecting changes
        static get observedAttributes() {
            return ["data-data"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === 'data-data') {
                clearTimeout(this.resolutionTimeout)
                this.prevData = []
                this.resolutionTimeout = setTimeout(() => this.start(), this.transitionDuration)
            }
        }

        connectedCallback() {
            this.index = 0
            this.transitionDuration = 300
            this.transitionDelay = 10
            this.freeze = false
            this.showabsolutescale = false
            this.level = 0
            this.prevData = []
            this.inEvents = ["pointerenter", "focus"]
            this.outEvents = ["pointerleave", "blur"]
            this.load = true
            setTimeout(() => this.start(), 10)
        }

        start() {
            // Graph ID
            this.graphId = this.getAttribute("id") || crypto.randomUUID()
            // set default ID
            if (!this.getAttribute("id"))
                this.setAttribute("id", this.graphId)
            /// default options
            this.data = (this.getAttribute('data-data')) ? JSON.parse(this.getAttribute('data-data')).data : []

            if (this.data.length) {
                this.resolution = Math.min(Number(JSON.parse(this.getAttribute('data-data')).resolution), this.data.length) || this.data.length
                this.step = Number(JSON.parse(this.getAttribute('data-data')).step) || 5
                this.chartType = (Number(JSON.parse(this.getAttribute('data-data')).charttype)) ? Number(JSON.parse(this.getAttribute('data-data')).charttype) : this.chartType
                this.palette = (JSON.parse(this.getAttribute('data-data')).palette) ? JSON.parse(this.getAttribute('data-data')).palette : []
                this.chartTitle = JSON.parse(this.getAttribute('data-data')).title
                this.chartX = JSON.parse(this.getAttribute('data-data')).xtitle
                this.chartY = JSON.parse(this.getAttribute('data-data')).ytitle
            }

            /// flags
            this.controls = this.hasAttribute('controls')
            this.markers = this.hasAttribute('markers')

            //busy text
            this.busyText = this.getAttribute('busy') || 'Rendering af graf...'

            // store top level data
            this.prevData[this.level] = { data: this.data, resolution: this.resolution, index: this.index, title: this.chartTitle, xtitle: this.chartX, ytitle: this.chartY, palette: this.palette }

            // render graph structure (default is COLUMNS)
            if (this.data.length) {
                this.controlsHTML = `
                        <div class="controls">
                            <div>
                                <button class="btn up" tabindex="0">↩ UP 1 LEVEL</button>
                            </div>
                            <div>
                                <button class="btn prevone" tabindex="0">LEFT</button>
                                <button class="btn prev" tabindex="0">PREV</button>
                            </div>
                            <div>
                                <button class="btn minusone" tabindex="0">-1</button>
                                <div class="select">
                                    <label for="resolution_${this.graphId}">Chart size</label>
                                    <as-select>
                                        <select id="resolution_${this.graphId}" class="resolution"></select>
                                    </as-select>
                                </div>
                                <button class="btn plusone" tabindex="0">+1</button>
                            </div>
                            <div>
                                <div class="select">
                                    <label for="charttype_${this.graphId}">Chart type</label>
                                    <as-select>
                                        <select id="charttype_${this.graphId}" class="charttype">
                                            <option value="1">Columns chart</option>
                                            <option value="2">Pie chart</option>
                                        </select>
                                    </as-select>
                                </div>
                            </div>
                            <div>
                                <button class="btn next" tabindex="0">NEXT</button>
                                <button class="btn nextone" tabindex="0">RIGHT</button>
                            </div>
                        </div>
                    `

                this.innerHTML = `
                        ${this.controls ? this.controlsHTML : ''}
                        
                        ${this.controls ? `<div class="current">${this.index + 1}/${this.data.length}</div>` : ''}
                        
                        ${this.chartTitle ? `<div class="charttitle">${this.chartTitle}</div>` : ''}
                        <figure>
                        </figure>
                    `

                this.selectChartType()
            }

            window.addEventListener('resize', () => {
                this.recalculateSVGPoints()
            })

            this.addEventListener('as-graph:drawcomplete', (e) => {
                this.removeAttribute('busy')
            })
        }

        init() {
            this.chartArea = this.querySelector('.chart')
            this.chartArea.setAttribute('animate', '')
            this.style.setProperty('--transition-duration', Number(this.transitionDuration / 1000) + 's')
            this.controls ? this.controlsInit() : null;
            this.draw()
        }

        selectChartType() {
            this.figure = this.querySelector('figure');
            this.draw = null;
            if (this.chartType == 1) {
                this.checkPrevData()

                this.draw = this.drawColumns
                this.figure.innerHTML = `
                            <div class="chartarea">
                                <div class="chart" data-charttype="columns"></div>
                                ${this.chartY ? `<div class="ytitle">${this.chartY}</div>` : ''}
                                <div class="y"></div>
                                <div class="x"></div>
                            </div>
                            ${this.chartX ? `<div class="xtitle">${this.chartX}</div>` : ''}
                            <div>
                                <div>
                                    <input type="checkbox" id="showlinechart_${this.graphId}"/>
                                    <label tabindex="0" for="showlinechart_${this.graphId}">Show linechart</label>
                                </div>
                                <div>
                                    <input type="checkbox" id="showdatatable_${this.graphId}"/>
                                    <label tabindex="0" for="showdatatable_${this.graphId}">Show data table</label>
                                    <as-table-actions data-table="datatable_${this.graphId}"></as-table-actions>
                                </div>
                            </div>
                            <ul class="legend"></ul>
                            <table id="datatable_${this.graphId}"class="table">
                                <thead class="ts__head">
                                    <tr class="ts__table_row">
                                        <th>Label</th>
                                        <th style="text-align: right;">Value</th>
                                        <th style="text-align: right;">Unit</th>
                                    </tr>
                                </thead>
                                <tbody class="ts__tbody"></tbody>
                            </table>
                    `
            }
            else if (this.chartType == 2) {
                this.checkPrevData()

                this.draw = this.drawPie
                this.figure.innerHTML = `
                            <div class="chartarea">
                                <div class="chart" data-charttype="pie"></div>
                            </div>
                            <ul class="legend"></ul>
                            <div>
                                <div>
                                    <input type="checkbox" id="showabsolute_${this.graphId}"/>
                                    <label tabindex="0" for="showabsolute_${this.graphId}">Show absolute scale</label>
                                </div>
                                <div>
                                    <input type="checkbox" id="showdatatable_${this.graphId}"/>
                                    <label tabindex="0" for="showdatatable_${this.graphId}">Show data table</label>
                                    <as-table-actions data-table="datatable_${this.graphId}"></as-table-actions>
                                </div>
                            </div>
                            <table id="datatable_${this.graphId}" class="table">
                                <thead class="ts__head">
                                    <tr class="ts__table_row">
                                        <th>Label</th>
                                        <th style="text-align: right;">Value</th>
                                        <th style="text-align: right;">Unit</th>
                                    </tr>
                                </thead>
                                <tbody class="ts__tbody"></tbody>
                            </table>
                    `
            }
            this.init()
        }

        updateButtonStates() {
            if (!this.controls)
                return
            this.btnMinusOne.disabled = this.resolution <= 1;
            this.btnPlusOne.disabled = this.resolution >= this.data.length;
        }

        controlsInit() {
            if (!this.controls)
                return

            this.btnPrev = this.querySelector('.prev')
            this.btnNext = this.querySelector('.next')
            this.btnPrevOne = this.querySelector('.prevone')
            this.btnNextOne = this.querySelector('.nextone')
            this.btnMinusOne = this.querySelector('.minusone')
            this.btnPlusOne = this.querySelector('.plusone')

            this.updateButtonStates();

            this.btnPrev.textContent = 'PREV ' + this.resolution
            this.btnNext.textContent = 'NEXT ' + this.resolution

            //this.remainder = this.data.length%this.resolution
            this.current = this.querySelector('.current')

            this.btnUp = this.querySelector('.up')

            if (this.level === 0)
                this.btnUp.setAttribute('disabled', '')

            this.btnUp.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze) {
                    this.chartArea.setAttribute('animate', '')
                    this.level -= 1
                    this.data = this.prevData[this.level].data
                    this.resolution = this.prevData[this.level].resolution
                    this.prevData.pop()
                    clearTimeout(this.prevTimeout)
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.freeze = true
            })

            this.btnMinusOne.addEventListener('click', e => {
                e.preventDefault();

                if (!this.freeze && this.resolution > 1) {
                    this.chartArea.setAttribute('animate', '');
                    this.resolution -= 1;
                    this.resolutionSelect.options.selectedIndex = this.resolution;
                    this.resolutionSelect.dispatchEvent(new Event('change', { bubbles: true }))
                    clearTimeout(this.prevTimeout);
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay);
                }

                this.updateButtonStates();
                this.freeze = true;
            });


            this.btnPlusOne.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze && this.resolution < this.data.length) {
                    this.chartArea.setAttribute('animate', '')
                    this.resolution += 1
                    this.resolutionSelect.options.selectedIndex = this.resolution
                    this.resolutionSelect.dispatchEvent(new Event('change', { bubbles: true }))
                    clearTimeout(this.prevTimeout)
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.updateButtonStates();
                this.freeze = true
            })

            this.btnPrevOne.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze) {
                    this.chartArea.setAttribute('animate', '')
                    this.index -= 1
                    clearTimeout(this.prevTimeout)
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.freeze = true
            })

            this.btnPrev.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze) {
                    this.chartArea.setAttribute('animate', '')
                    this.index -= Math.max(0, this.resolution)
                    clearTimeout(this.prevTimeout)
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.freeze = true
            })

            this.btnNext.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze) {
                    this.chartArea.setAttribute('animate', '')
                    this.index += Math.min(this.resolution, this.data.length)
                    clearTimeout(this.nextTimeout)
                    this.nextTimeout = setTimeout(() => {
                        this.draw()
                    }, this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.freeze = true
            })

            this.btnNextOne.addEventListener('click', e => {
                e.preventDefault()
                if (!this.freeze) {
                    this.resolutionSelect.closest('as-select').setAttribute('updated', '')
                    this.chartArea.setAttribute('animate', '')
                    this.index += 1
                    clearTimeout(this.prevTimeout)
                    if (!this.freeze)
                        this.prevTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
                }
                this.freeze = true
            })


            // initialize resolution select & fill it with numbers matching number of elements in this.data object
            this.resolutionSelect = this.querySelector('.resolution')
            this.resolutionSelect.innerHTML = ''
            //for (let res = 1; res <= this.data.length; res++){
            //    this.resolutionSelect.options[res] = (res == this.resolution) ? new Option(res,res,true,true) : new Option(res,res)
            //}



            // initialize resolution select functionality
            this.resolutionSelect.addEventListener('change', e => {
                this.resolution = Number(e.target.value)
                this.index = 0
                this.chartArea.setAttribute('animate', '')
                clearTimeout(this.resolutionTimeout)
                this.resolutionTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
            })

            // initialize chart type select
            this.chartSelect = this.querySelector('.charttype')
            this.chartSelect.options[this.chartType - 1].selected = true;
            this.chartSelect.addEventListener('change', e => {
                this.setAttribute('busy', this.busyText)
                this.chartType = Number(e.target.value)
                this.chartArea.setAttribute('animate', '')
                clearTimeout(this.chartTimeout)
                this.chartTimeout = setTimeout(() => this.selectChartType(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)
            })
        }

        getYAxisMaxValue() {
            const vals = []
            for (let i = this.index; i < Math.min(this.index + this.resolution, this.data.length); i++) {
                vals.push(this.data[i].value)
            }
            let maximum = Math.round(Math.max(...vals) * 1.2 * 10) / 10
            if (maximum == 0)
                maximum = 1
            let modulo = maximum % 2
            return (modulo = 0) ? maximum - modulo : maximum
        }

        getMaxValue(data = this.data, index = this.index, key = 'value') {
            const vals = []
            //for (let i=index; i < Math.min(index+this.resolution,data.length); i++)
            for (let i = index; i < data.length; i++)
                vals.push(data[i][key])
            return Math.max(...vals)
        }

        getSumFromIndex(data = this.data, index = this.index) {
            let val = 0;
            for (let i = index; i < index + this.resolution; i++)
                val += data[i].value
            return val
        }

        drawValuesOnAxis(maxVal) {
            const yAxis = this.querySelector('.y')
            yAxis.innerHTML = ''
            const step = (maxVal > 1) ? maxVal / this.step : (maxVal / this.step).toFixed(1);
            for (let i = 0; i <= maxVal; i += Number(step)) {
                const val = document.createElement('div');
                val.setAttribute('data-value', Number(i).toFixed(1))
                yAxis.appendChild(val)
            }
        }

        sortDataByKeyValue(array, key, dir = 0) {
            return (dir) ? array.sort((a, b) => a[key] - b[key]) : array.sort((a, b) => b[key] - a[key])
        }

        calculateRemainingNext() {
            let remaining = this.data.length - this.resolution - this.index
            return (this.resolution <= remaining) ? this.resolution : remaining
        }

        calculateRemainingPrev(index) {
            let remaining = this.index
            return (this.resolution <= remaining) ? this.resolution : remaining
        }

        levelOptions() {
            if (!this.controls) {
                this.resolution = this.data.length
                return
            }
            //enable/disable level up button
            (!this.level) ? this.btnUp.setAttribute('disabled', '') : this.btnUp.removeAttribute('disabled')
            //update button label
            this.btnUp.textContent = `↩ ${(this.prevData[this.level - 1]) ? this.prevData[this.level - 1].label : 'BACK'}`

            //update resolution selector
            this.resolutionSelect.innerHTML = ''
            for (let res = 1; res <= this.data.length; res++) {
                this.resolutionSelect.options[res] = (res == this.resolution) ? new Option(res, res, true, true) : new Option(res, res)
            }
            // we are starting indexing from 1 so we need to remove empty option at options[0]
            this.resolutionSelect.options[0].remove()

            this.resolutionSelect.closest('as-select').setAttribute('updated', '')

            if (this.chartType != 3)
                this.updateButtonStates()

            if (this.chartType === 3) {
                this.btnUp.setAttribute('disabled', '');
                this.btnUp.textContent = '↩BACK'
            }
        }

        drilldown(label, data, index) {
            //this.fetchData(data)

            //store current level data
            this.prevData[this.level] = { data: this.data, resolution: this.resolution, label: label, index: index, title: this.chartTitle, xtitle: this.chartX, ytitle: this.chartY, palette: this.palette }
            //move level down
            this.level += 1
            //attach new data
            //TODO fetch new data from server here
            this.data = data.data
            this.resolution = this.data.length
            this.index = 0
            this.chartArea.setAttribute('animate', '')

            clearTimeout(this.resolutionTimeout)
            this.resolutionTimeout = setTimeout(() => this.draw(), this.transitionDuration + (this.resolution - 1) * this.transitionDelay)

            //console.log('length',this.resolution)
            //this.resolutionSelect.options.selectedIndex = this.resolution+1;
            this.resolutionSelect.dispatchEvent(new Event('change', { bubbles: true }))
        }

        drawCurrent() {
            if (!this.controls)
                return
            this.current.textContent = `${this.index + 1}-${this.resolution + this.index} / ${this.data.length}`
        }

        convertPercentagePointsToPixels(percentPoints, width, height) {
            return percentPoints.map(p => ({ x: p.x / 100 * width, y: p.y / 100 * height }))
        }

        generateSmoothPath(points) {
            if (points.length < 2) return ''
            const d = [`M ${points[0].x} ${points[0].y}`]
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i]
                const p1 = points[i + 1]

                //calculate control points with arythmetic average
                const cp1x = (p0.x + p1.x) / 2
                const cp1y = p0.y
                const cp2x = (p0.x + p1.x) / 2
                const cp2y = p1.y
                d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`)
            }
            return d.join(' ')
        }

        showDataTable() {
            // set up linechart toggle
            const showdatatable = this.querySelector(`#showdatatable_${this.graphId}`)
            const table = this.querySelector(`#datatable_${this.graphId}`)
            showdatatable.addEventListener('change', evt => {
                if (evt.target.checked) {
                    evt.target.setAttribute('checked', '')
                    table.style.display = 'table'
                }
                else {
                    table.style.display = 'none'
                    evt.target.removeAttribute('checked')
                }
            })
        }

        createDataTableRow(table_body, label, value, unit) {
            const tr = document.createElement('tr')
            tr.classList.add('ts__table_row')
            tr.classList.add('ts__nowrap')
            const tr_label = document.createElement('td')
            tr_label.textContent = label;
            const tr_value = document.createElement('td')
            tr_value.style.textAlign = 'right'
            tr_value.textContent = value;
            const tr_unit = document.createElement('td')
            tr_unit.style.textAlign = 'right'
            tr_unit.textContent = (unit) ? unit : '';


            tr.append(tr_label, tr_value, tr_unit)
            table_body.append(tr)
        }

        recalculateSVGPoints() {
            const smoothSvg = this.querySelector('svg')
            if (smoothSvg) {
                const proxy = this.querySelector('.proxy')
                const path = smoothSvg.querySelector('path')
                smoothSvg.setAttribute('width', proxy.getBoundingClientRect().width + 'px')
                const svgWidth = proxy.getBoundingClientRect().width
                const svgHeight = proxy.getBoundingClientRect().height
                path.setAttribute('d', this.generateSmoothPath(this.convertPercentagePointsToPixels(this.points, svgWidth, svgHeight)))
            }
        }

        checkPrevData() {

            this.resolution = 1
            if (this.prevData && this.prevData.length > 0)
                this.data = JSON.parse(this.getAttribute('data-data')).data
            this.prevData.length = 0
        }

        drawColumns() {
            this.controlsEnable()

            this.levelOptions()

            this.freeze = false;
            if (this.index + this.resolution > this.data.length)
                this.index = this.data.length - this.resolution
            if (this.index < 0)
                this.index = 0

            this.drawCurrent()

            /// update buttons labels with remaining bars to show
            if (this.controls) {
                this.btnPrev.textContent = 'PREV ' + this.calculateRemainingPrev()
                this.btnNext.textContent = 'NEXT ' + this.calculateRemainingNext()
            }

            const maxY = this.getYAxisMaxValue()
            this.drawValuesOnAxis(maxY)
            this.chartArea.innerHTML = ''

            // clean up legend labels
            const legend = this.querySelector('.legend')
            legend.innerHTML = ''

            const proxy = document.createElement('div')
            proxy.classList.add('proxy')
            this.chartArea.appendChild(proxy)

            // set up linechart toggle
            const showlinechart = this.querySelector(`#showlinechart_${this.graphId}`)

            showlinechart.addEventListener('change', evt => {
                if (evt.target.checked)
                    this.chartArea.setAttribute('showlinechart', '')
                else
                    this.chartArea.removeAttribute('showlinechart')
            })

            this.showDataTable()

            const smoothSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            smoothSvg.classList.add('linechart')
            smoothSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
            smoothSvg.setAttribute('height', this.querySelector('.chartarea').getBoundingClientRect().height + 'px')

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('fill', 'none')
            path.setAttribute('stroke-width', '3')
            path.setAttribute('stroke', '#000000')
            smoothSvg.append(path)

            this.points = []
            this.points.length = 0

            proxy.appendChild(smoothSvg)

            const maxItems = Number(this.resolution)

            const svgXOffset = 100 * (proxy.getBoundingClientRect().width / maxItems / 2) / proxy.getBoundingClientRect().width
            const svgYOffset = 0

            const table = this.querySelector('table')
            table.style.width = '100%'
            const table_body = table.querySelector('table tbody')

            table_body.innerHTML = ''

            let idx = 0

            //console.log('res in columns', this.graphId, this.resolution)
            for (let i = this.index; i < Math.min(this.index + this.resolution, this.data.length); i++) {
                const { label, value, color, unit, data, drilldown } = this.data[i]
                const columnWrapper = document.createElement('div')
                columnWrapper.classList.add('wrapper')
                const column = document.createElement('div')
                const legendEl = (drilldown) ? document.createElement('button') : document.createElement('li')
                column.setAttribute('data-label', label)
                column.setAttribute('data-id', 'column_' + i)
                column.style.setProperty('--height', 100 * value / maxY + '%')
                column.style.setProperty('--transition-delay', (i - this.index) * this.transitionDelay + 'ms')

                const col = (this.palette) ? this.palette[i % this.palette.length] : color

                if (col !== undefined)
                    column.style.setProperty('--_color', col)
                column.setAttribute('title', `${label}: ${value} ${(unit) ? unit : ''}`)

                /// create data table row
                this.createDataTableRow(table_body, label, value, unit)


                if (i <= Math.min(this.index + this.resolution, this.data.length)) {
                    const relativeIndex = idx % maxItems

                    const x1 = svgXOffset + 100 * (relativeIndex) / maxItems
                    const y1 = 100 - 100 * value / maxY + svgYOffset

                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                    circle.setAttribute('cx', x1 + '%')
                    circle.setAttribute('cy', y1 + '%')
                    circle.setAttribute('r', 7)

                    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                    title.textContent = `${label}: ${value} ${unit ? unit : ''}`;
                    circle.appendChild(title);

                    if (col !== undefined)
                        circle.style.setProperty('--_color', col)

                    smoothSvg.append(circle)
                    this.points.push({ x: x1, y: y1 })

                    if (drilldown)
                        circle.addEventListener('click', () => this.drilldown(label, drilldown))
                }
                idx++

                this.inEvents.forEach(event => {
                    column.addEventListener(event, evt => {
                        column.toggleAttribute('active')
                        column.style.setProperty('--transition-delay', 0 + 'ms')
                        legendEl.toggleAttribute('active')
                    })
                })

                this.outEvents.forEach(event => {
                    column.addEventListener(event, evt => {
                        column.toggleAttribute('active')
                        setTimeout(() => column.style.setProperty('--transition-delay', i * this.transitionDelay + 'ms'), i * this.transitionDelay)
                        legendEl.toggleAttribute('active')
                    })
                })

                //drilldown
                if (drilldown) {
                    column.classList.add('drilldown')
                    column.addEventListener('click', () => { this.drilldown(label, drilldown) })
                }

                columnWrapper.appendChild(column)
                proxy.appendChild(columnWrapper)

                // create legend elements
                legendEl.textContent = `${label}: ${value} ${(unit) ? unit : ''}`
                legendEl.setAttribute('data-id', 'column_' + i)
                legendEl.setAttribute('tabindex', 0)
                if (col !== undefined)
                    legendEl.style.setProperty('--_color', col)

                // initialize legend elements interaction
                // this is necessary as slices are absolutely positioned and only last one can receive HOVER
                // with legend elements being interactive one can visually see selected slice stand out
                // it also works on mobile like a breeze
                this.inEvents.forEach(event => {
                    legendEl.addEventListener(event, evt => {
                        column.toggleAttribute('active')
                        column.style.setProperty('--transition-delay', 0 + 'ms')
                        setTimeout(() => column.scrollIntoView({ behavior: "smooth", block: 'nearest', inline: 'center' }), 150)
                    })
                })

                this.outEvents.forEach(event => {
                    legendEl.addEventListener(event, evt => {
                        column.toggleAttribute('active')
                        setTimeout(() => column.style.setProperty('--transition-delay', i * this.transitionDelay + 'ms'), i * this.transitionDelay)
                    })
                })

                //drilldown
                if (drilldown) {
                    legendEl.style.cursor = 'zoom-in'
                    legendEl.addEventListener('click', () => { this.drilldown(label, drilldown) })
                }
                legend.appendChild(legendEl)
            }

            smoothSvg.setAttribute('width', proxy.getBoundingClientRect().width + 'px')
            const svgWidth = proxy.getBoundingClientRect().width
            const svgHeight = proxy.getBoundingClientRect().height
            path.setAttribute('d', this.generateSmoothPath(this.convertPercentagePointsToPixels(this.points, svgWidth, svgHeight)))

            /// Create & emit custom event
            const cEvent = new CustomEvent("as-graph:drawcomplete",
                {
                    detail:
                    {
                        chart: "column",
                    },
                });
            this.dispatchEvent(cEvent)

            setTimeout(() => this.recalculateSVGPoints(), 100)
            setTimeout(() => this.chartArea.removeAttribute('animate'), this.transitionDuration)
        }

        drawPie() {
            this.controlsEnable()

            this.levelOptions()

            this.freeze = false;
            if (this.index + this.resolution > this.data.length)
                this.index = this.data.length - this.resolution
            if (this.index < 0)
                this.index = 0

            this.drawCurrent()

            /// update buttons labels with remaining bars to show
            if (this.controls) {
                this.btnPrev.textContent = 'PREV ' + this.calculateRemainingPrev()
                this.btnNext.textContent = 'NEXT ' + this.calculateRemainingNext()
            }

            // clean up chart area
            const val = this.getSumFromIndex()
            const maxVal = this.getMaxValue()

            this.chartArea.innerHTML = ''

            // clean up legend labels
            const legend = this.querySelector('.legend')
            legend.innerHTML = ''

            // set up relative sizes toggle
            const showabsolutescale = this.querySelector(`#showabsolute_${this.graphId}`)

            showabsolutescale.addEventListener('change', evt => {
                if (evt.target.checked)
                    this.chartArea.setAttribute('showabsolutescale', '')
                else
                    this.chartArea.removeAttribute('showabsolutescale')
            })

            this.showDataTable()

            const table = this.querySelector('table')
            table.style.width = '100%'
            const table_body = table.querySelector('table tbody')

            table_body.innerHTML = ''


            let sum = 0
            for (let i = this.index; i < Math.min(this.index + this.resolution, this.data.length); i++) {
                const { label, value, color, unit, data, drilldown } = this.data[i]
                const pie = document.createElement('div')
                const marker = document.createElement('div')
                const legendEl = (drilldown) ? document.createElement('button') : document.createElement('li')

                const stop1 = sum
                const stop2 = sum + 100 * value / val
                const scale = value / maxVal
                const rotate1 = stop1 * 3.6 - 90
                const rotate2 = stop2 * 3.6 - 90
                const mid = rotate1 + (rotate2 - rotate1) / 2
                const midRad = -mid * (Math.PI / 180)

                const r2 = 0.6
                const x2 = 50 * (Math.cos(midRad) * r2 + 1)
                const y2 = 50 * (1 - Math.sin(midRad) * r2)

                const r1 = 1.1 * r2
                const x1 = x2 - 50 * (Math.cos(midRad) * r1 + 1)
                const y1 = y2 - 50 * (1 - Math.sin(midRad) * r1)

                // increase SUM value used to calculate stops for next slices
                sum += Number((100 * value / val).toFixed(2))

                pie.setAttribute('data-label', label)
                pie.setAttribute('data-id', 'pie_' + i)
                pie.style.setProperty('--stop1', stop1 + '%')
                pie.style.setProperty('--stop2', stop2 + '%')
                pie.style.setProperty('--rotate1', rotate1 + 'deg')
                pie.style.setProperty('--rotate2', rotate2 + 'deg')
                pie.style.setProperty('--x', x1 + '%')
                pie.style.setProperty('--y', y1 + '%')
                pie.style.setProperty('--scale', scale)
                pie.style.setProperty('--transition-delay', (i - this.index) * this.transitionDelay + 'ms')
                marker.classList.add('marker')
                marker.style.setProperty('--x', x2 + '%')
                marker.style.setProperty('--y', y2 + '%')

                const col = (this.palette) ? this.palette[i % this.palette.length] : color

                if (col !== undefined)
                    pie.style.setProperty('--_color', col)

                if (drilldown)
                    pie.classList.add('drilldown')

                marker.textContent = `${label}: ${value} ${(unit) ? unit : ''}`
                if (this.markers)
                    pie.appendChild(marker)
                this.chartArea.appendChild(pie)


                /// create data table row
                this.createDataTableRow(table_body, label, value, unit)


                // create legend elements
                legendEl.textContent = `${label}: ${value} ${(unit) ? unit : ''}`
                legendEl.setAttribute('data-id', 'pie_' + i)
                legendEl.setAttribute('tabindex', 0)

                if (col !== undefined)
                    legendEl.style.setProperty('--_color', col)

                // initialize legend elements interaction
                // this is necessary as slices are absolutely positioned and only last one can receive HOVER
                // with legend elements being interactive one can visually see selected slice stand out
                // it also works on mobile like a breeze

                this.inEvents.forEach(event => {
                    legendEl.addEventListener(event, evt => {
                        pie.toggleAttribute('active')
                        pie.style.setProperty('--transition-delay', 0 + 'ms')
                    })
                })

                this.outEvents.forEach(event => {
                    legendEl.addEventListener(event, evt => {
                        pie.toggleAttribute('active')
                        setTimeout(() => pie.style.setProperty('--transition-delay', i * this.transitionDelay + 'ms'), i * this.transitionDelay)
                    })
                })

                //drilldown
                if (drilldown) {
                    legendEl.style.cursor = 'zoom-in'
                    legendEl.addEventListener('click', () => { this.drilldown(label, drilldown, this.index) })
                }
                legend.appendChild(legendEl)


            }

            /// Create & emit custom event
            const cEvent = new CustomEvent("as-graph:drawcomplete",
                {
                    detail:
                    {
                        chart: "pie",
                    },
                });
            this.dispatchEvent(cEvent)

            setTimeout(() => this.chartArea.removeAttribute('animate'), this.transitionDuration)
        }

        controlsDisable() {
            if (!this.controls)
                return
            this.btnPrev.setAttribute('disabled', '')
            this.btnNext.setAttribute('disabled', '')
            this.btnPrevOne.setAttribute('disabled', '')
            this.btnNextOne.setAttribute('disabled', '')
            this.btnMinusOne.setAttribute('disabled', '')
            this.btnPlusOne.setAttribute('disabled', '')
            this.resolutionSelect.setAttribute('disabled', '')
        }

        controlsEnable() {
            if (!this.controls)
                return
            this.btnPrev.removeAttribute('disabled')
            this.btnNext.removeAttribute('disabled')
            this.btnPrevOne.removeAttribute('disabled')
            this.btnNextOne.removeAttribute('disabled')
            this.btnMinusOne.removeAttribute('disabled')
            this.btnPlusOne.removeAttribute('disabled')
            this.resolutionSelect.removeAttribute('disabled')
        }

        fetchData(file) {
            const getData = async (url) => {
                if (!url) return
                try {
                    const response = await fetch(url)
                    if (!response.ok) {
                        throw new Error(`Response status: ${response.status}`);
                    }
                    const json = await response.json()
                    this.setAttribute('data-data', JSON.stringify(json))
                }
                catch (error) {
                    console.error(error)
                }
            }

            getData(file)
        }
    }
    window.customElements.define("as-graph", ASGraph)
})
// RESOURCE #92 END
// RESOURCE #55 BEGIN
// register new custom element
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
// RESOURCE #55 END
// RESOURCE #97 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-show-hide-password') === undefined) {

        class ASShowHidePassword extends HTMLElement {

            connectedCallback() {
                this.buttonLabels = this.hasAttribute('labels') ? this.getAttribute('labels').split(',') : ['Show', 'Hide']
                this.icons = this.hasAttribute('icons') ? this.getAttribute('icons').split(',') : null
                // Initialize
                this.init()
            }

            init() {

                try {
                    this.password = this.querySelector('[type="password"]')
                    this.showhide = document.createElement('a')
                    this.showhide.setAttribute('tabindex', '-1')
                    this.showhide.classList.add('btn')
                    if (this.icons) {
                        this.icon = document.createElement('as-icon')
                        this.icon.setAttribute('name', this.icons[0])
                        this.icon.setAttribute('label', this.buttonLabels[0])
                        this.showhide.append(this.icon)
                    } else
                        this.showhide.textContent = this.buttonLabels[0]

                    this._buttonListenerID = this.showhide.addEventListener('click', e => this.showhidepass(e).bind(this))
                    this.password.after(this.showhide)
                }
                catch (error) {
                    throw new Error('Input is not of type password')
                    this.broadcastEvent('as-show-hide-password:error', { fieldid: this.password.id })
                }
            }

            showhidepass(e) {
                e.preventDefault()
                if (this.password.type == 'password') {
                    this.password.type = 'text'
                    if (this.icons) {
                        this.icon.setAttribute('new-name', this.icons[1])
                        this.icon.setAttribute('aria-label', this.buttonLabels[1])
                    } else
                        this.showhide.textContent = this.buttonLabels[1]
                    this.broadcastEvent('as-show-hide-password:show', { fieldid: this.password.id })
                } else {
                    this.password.type = 'password'
                    if (this.icons) {
                        this.icon.setAttribute('new-name', this.icons[0])
                        this.icon.setAttribute('aria-label', this.buttonLabels[0])
                    } else
                        this.showhide.textContent = this.buttonLabels[0]
                    this.broadcastEvent('as-show-hide-password:hide', { fieldid: this.password.id })
                }
                this.showhide.toggleAttribute('hide')
            }

            disconnectedCalback() {
                this._buttonListenerID = showhide.removeEventListener('click', this.showhidepass.bind(this))
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
        window.customElements.define("as-show-hide-password", ASShowHidePassword)
    }
})
// RESOURCE #97 END
// RESOURCE #101 BEGIN

// register new custom element
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
                this.action = this.getAttribute('action') || '/components/search-menu?action=search&searchmethod=0&search='
                this.placeholder = this.getAttribute('placeholder') || 'Search for...'
                this.navigate = this.getAttribute('navigate') || 'Navigate'
                this.enter = this.getAttribute('enter') || 'Select'
                this.dismiss = this.getAttribute('dismiss') || 'Dismiss'
                this.drag = this.getAttribute('drag') || 'Hold & drag'
                this.hint = this.getAttribute('hint') || 'Search tips: some search terms require an exact match. Try typing the entire sentence, or use a different word or phrase.'
                this.nohits = this.getAttribute('nohits') || 'No recent search matches your query, but... there\'s no timelike present to search for something!'
                this.recentSearches = JSON.parse(sessionStorage.getItem('asRecentSearches')) || [];
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
                this.addEventListener('focusin', () => this.active = true)
                this.addEventListener('focusout', () => this.active = false)

                const keyMap = []
                document.addEventListener('keydown', e => {
                    //if (!this.active) return
                    console.log('key', e.code)
                    keyMap.push(e.code.replace('Left', '').replace('Right', '').replace('Key', '').replace('Digit', ''))
                    this.decodeCommand(keyMap, e)
                })

                document.addEventListener('keyup', e => {
                    //if (!this.active) return
                    keyMap.splice(0, keyMap.length)
                })

                this.search.addEventListener('input', e => this.filterCommands(e.target.value))
                this.form.addEventListener('submit', e => this.saveSearch)
                if (this.btns.clear)
                    this.btns.clear.addEventListener('click', e => this.clearSearches())
            }

            uniqueArray(a) {
                return [...new Set(a.map(o => JSON.stringify(o)))].map(s => JSON.parse(s))
            }

            saveSearch() {
                if (this.search.value !== '') {
                    this.recentSearches.push({ searchTerm: `${this.search.value}` })
                    sessionStorage.setItem('asRecentSearches', JSON.stringify(this.uniqueArray(this.recentSearches)))
                }
                this.form.submit()
            }

            clearSearches() {
                this.filteredSearches = this.recentSearches = []

                sessionStorage.setItem('asRecentSearches', JSON.stringify(this.recentSearches))
                this.render()
            }

            filterCommands(searchText) {
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
                    this.search.value = evt.target.textContent
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
                            this.saveSearch()
                            //this.form.submit()
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
// RESOURCE #101 END
// RESOURCE #102 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-drawer') === undefined) {
        class ASDrawer extends HTMLElement {
            connectedCallback() {
                // Drawer ID
                this.drawerId = this.getAttribute("id") || crypto.randomUUID()
                // set default ID
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.drawerId)
                /// default options
                this.settings = {}
                this.settings.position = this.getAttribute('position') || 'bottom'
                this.settings.button = this.getAttribute('button-text') || 'Open drawer'
                this.settings.delay = this.getAttribute('delay') || 10
                this.settings.transitionTime = this.getAttribute('transition-time') || 400
                ///
                this.settings.content = this.innerHTML
                this.broadcastEvent('as-drawer:created', { id: this.drawerId, position: this.settings.position })
                this.render()
            }

            render() {
                // render Drawer structure
                this.innerHTML = `
                    <button opendrawer class="btn btn__solid_primary">${this.settings.button}</button>
                    <div hidden class="as-drawer ${this.settings.position}" role="dialog" data-id="${this.drawerId}">${this.settings.content}<!--<button class="btn" closedrawer><as-icon name="--as-icon-times-solid"></as-icon> Close</button>--></div>
                `
                this.style.setProperty('--as-drawer-transition-time', `${this.settings.transitionTime}ms`)
                this.openbutton = this.querySelector('button[opendrawer]')
                //this.closebutton = this.querySelector('button[closedrawer]')
                this.drawer = this.querySelector('.as-drawer')

                this.body = document.querySelector('body')
                this.bindEvents()
            }

            bindEvents() {
                this.openbutton.addEventListener('click', e => this.openDrawer())
                //this.closebutton.addEventListener('click', e => this.closeDrawer())
            }

            openDrawer() {
                this.broadcastEvent('as-drawer:before-open', { id: this.drawerId, position: this.settings.position })
                //// OVERLAY
                this.overlay = document.createElement('div');
                this.overlay.classList.add('as-overlay');
                this.overlay.setAttribute('data-id', this.drawerId);
                this.body.appendChild(this.overlay);
                this.overlay.addEventListener('click', e => this.closeDrawer());
                //this.closebutton.focus()

                //// DELAY
                setTimeout(() => {
                    this.drawer.removeAttribute('hidden')
                    setTimeout(() => {
                        this.drawer.setAttribute('data-state', 'open')
                        this.overlay.setAttribute('data-state', 'open')
                    }, 1)
                }, this.settings.delay)

                setTimeout(() => this.broadcastEvent('as-drawer:after-open', { id: this.drawerId, position: this.settings.position }), this.settings.transitionTime)

            }
            closeDrawer() {
                this.broadcastEvent('as-drawer:before-close', { id: this.drawerId, position: this.settings.position })
                this.drawer.removeAttribute('data-state')
                this.overlay.removeAttribute('data-state')
                this.overlay.addEventListener('transitionend', e => e.target.remove())
                setTimeout(() => this.broadcastEvent('as-drawer:after-close', { id: this.drawerId, position: this.settings.position }), this.settings.transitionTime)
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
        // register new custom element
        window.customElements.define("as-drawer", ASDrawer)
    }
})
// RESOURCE #102 END
// RESOURCE #103 BEGIN
// register new custom element
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
// RESOURCE #103 END
// RESOURCE #105 BEGIN
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-pagination') === undefined) {
        class ASPagination extends HTMLElement {
            connectedCallback() {
                this.settings = {}
                this.settings.total = this.getAttribute('data-total')
                this.settings.pageSize = this.getAttribute('data-page-size') || 10
                this.settings.pageId = this.getAttribute('data-pageid')
                this.settings.paginationText = this.hasAttribute('data-pagination-text') ? this.getAttribute('data-pagination-text').split('|') : ["Page", "of", "from", "records", "Previous", "Next"]
                this.settings.activePage = 1
                this.settings.pageParam = `pagenumber${this.settings.pageId}`
                this.innerHTML = `
                    <div class="pagination-info"></div>
                `
                this.init()
            }

            init() {
                this.url = new URL(location.href)
                this.searchParams = this.url.searchParams
                //this.setting.baseUrl = this.url.origin + this.url.pathname
                this.settings.activePage = this.searchParams.get(this.settings.pageParam) || 1
                this.render()
            }

            render() {
                const paginationInfo = this.querySelector('.pagination-info')
                const totalPages = Math.ceil(this.settings.total / this.settings.pageSize)
                const ul = document.createElement('ul')
                if (this.settings.activePage > 1) {
                    this.directionArrow(ul, -1)
                }
                for (let i = 1; i <= totalPages; i++) {
                    const li = document.createElement('li')
                    const a = document.createElement('a')
                    this.searchParams.set(this.settings.pageParam, i)
                    this.url.search = this.searchParams.toString()
                    const link = this.url.toString()
                    if (i == this.settings.activePage)
                        a.classList.add('current')
                    a.setAttribute('href', link)
                    a.textContent = i
                    li.append(a)
                    if (i < Number(this.settings.activePage) && i > 1) {
                        a.classList.add('before')
                    }
                    if (i > Number(this.settings.activePage) && i < totalPages) {
                        a.classList.add('after')
                    }
                    if ((i == Number(this.settings.activePage) - 1 && i > 1) || (i == Number(this.settings.activePage) + 1) && i < totalPages) {
                        const dots = document.createElement('li')
                        dots.textContent = '...'
                        a.classList.add('show')
                        if (i == Number(this.settings.activePage) - 1 && i > 0) {
                            dots.addEventListener('click', e => {
                                this.querySelectorAll('a.before').forEach(el => el.classList.remove('before'))
                                e.target.remove()
                            });
                            ul.append(dots)
                            ul.append(li)
                        }
                        if (i == Number(this.settings.activePage) + 1 && i < totalPages) {
                            dots.addEventListener('click', e => {
                                this.querySelectorAll('a.after').forEach(el => el.classList.remove('after'))
                                e.target.remove()
                            });
                            ul.append(li)
                            ul.append(dots)
                        }
                    }
                    else {
                        ul.append(li)
                    }
                }
                if (this.settings.activePage < totalPages) {
                    this.directionArrow(ul, 1)
                }
                this.append(ul)
                paginationInfo.textContent = `${this.settings.paginationText[0]} ${this.settings.activePage} ${this.settings.paginationText[1]} ${totalPages} ${this.settings.paginationText[2]} ${this.settings.total} ${this.settings.paginationText[3]}`
            }

            directionArrow(wrapper, dir) {
                const li = document.createElement('li')
                const a = document.createElement('a')
                this.searchParams.set(this.settings.pageParam, Number(this.settings.activePage) + 1 * dir)
                this.url.search = this.searchParams.toString()
                const link = this.url.toString()
                a.classList.add('btn')
                a.classList.add(`${(dir > 0) ? 'next' : 'prev'}`)
                a.setAttribute('aria-label', `${(dir > 0) ? this.settings.paginationText[5] : this.settings.paginationText[4]}`)
                a.setAttribute('href', link)
                const icon = document.createElement('as-icon')
                icon.setAttribute('name', '--as-icon-arrow-right')
                if (dir < 0)
                    icon.setAttribute('flip-x', '')
                //a.textContent = (dir > 0) ? '→' : '←'
                a.append(icon)
                li.append(a)
                wrapper.append(li)
            }
        }
        // register new custom element
        window.customElements.define("as-pagination", ASPagination)
    }
});
// RESOURCE #105 END
// RESOURCE #107 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-popout') === undefined) {
        class ASPopoutElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }
            connectedCallback() {
                // Popout ID
                this.popoutId = this.getAttribute("popout-id") || crypto.randomUUID()
                /// default options
                this.settings = {}
                this.settings.buttonText = this.getAttribute('button-text') || 'Open popout'
                this.settings.buttonClass = this.getAttribute('button-class') || 'btn'
                this.settings.buttonIcon = this.getAttribute('button-icon') || 'dot'
                this.settings.hasIcon = this.hasAttribute('button-icon')
                ///
                this.settings.content = Array.from(this.childNodes)

                if (this.ready)
                    return
                this.init()
            }

            init() {
                if (this.ready)
                    return
                this.removeAttribute('hidden')
                // render Popout structure
                this.innerHTML = `
                    <button style="anchor-name: --${this.popoutId}" popovertarget="${this.popoutId}" class="${this.settings.buttonClass}">${this.settings.buttonText}${this.settings.hasIcon ? '<as-icon name=' + this.settings.buttonIcon + '></as-icon>' : ''}</button>
                    <div popover id="${this.popoutId}" style="position-anchor: --${this.popoutId};"></div>
                `

                this.querySelector('[popover]').addEventListener('toggle', e => {
                    (e.newState === 'open') ? this.broadcastEvent('as-popout:toggle', { id: this.popoutId, state: 'open' }) : this.broadcastEvent('as-popout:toggle', { id: this.popoutId, state: 'close' })
                })
                this.broadcastEvent('as-popout:created', { id: this.popoutId })

                const popover = this.querySelector('[popover]')
                this.settings.content.forEach(node => popover.appendChild(node))

                this.ready = true
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
        // register new custom element
        window.customElements.define("as-popout", ASPopoutElement)
    }
})

// RESOURCE #107 END
// RESOURCE #109 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-table-actions') === undefined) {
        class ASTableActions extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                // Table Actions ID
                this.tableActionsId = this.getAttribute("id") || crypto.randomUUID()
                this.setAttribute('id', this.tableActionsId)

                // Initialize
                if (this.ready)
                    return

                this.init()
            }

            init() {
                /// default options
                this.settings = {};
                this.settings.tableSelector = this.getAttribute('data-table').indexOf('.') == 0 ? this.getAttribute('data-table') : '#' + this.getAttribute('data-table')
                this.settings.table = document.querySelector(this.settings.tableSelector)
                this.settings.button = this.getAttribute('button-text') || 'Options'

                // render Table Actions structure
                this.innerHTML = `
                    <as-popout popout-id="pop_${this.tableActionsId}" button-text="${this.settings.button}" button-icon="--as-icon-dots" popout-position="bottom" popout-align="span-left">
                    <div style="display: grid; gap: var(--as-space-xs);">
                        <button class="btn" data-action="csv" title="Download as CSV"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download CSV</button>
                        <button class="btn" data-action="excel" title="Download as Excel"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download XLS</button>
                        <button class="btn" data-action="md" title="Download as Markdown"><as-icon name="--as-icon-paperclip" size="m"></as-icon>Download MD</button>
                        <button class="btn" data-action="copy" title="Copy"><as-icon name="--as-icon-clone" size="m"></as-icon>Copy as text</button>
                    </div>
                    </as-popout>
                `

                document.addEventListener('as-popout:created', e => {
                    setTimeout(() => {
                        if (e.detail.id === `pop_${this.tableActionsId}`) {
                            this.buttonMD = this.querySelector('button[data-action="md"]')
                            this.buttonCSV = this.querySelector('button[data-action="csv"]')
                            this.buttonEXCEL = this.querySelector('button[data-action="excel"]')
                            this.buttonCOPY = this.querySelector('button[data-action="copy"]')

                            this.buttonMD.addEventListener('click', e => this.downloadMD(e))
                            this.buttonCSV.addEventListener('click', e => this.downloadCSV(e))
                            this.buttonEXCEL.addEventListener('click', e => this.downloadEXCEL(e))
                            this.buttonCOPY.addEventListener('click', e => this.copy(e))
                        }
                    }, 1)

                    document.addEventListener('as-popout:toggle', e => this.broadcastEvent('as-table-actions:popover', { id: this.tableActionsId, state: e.detail.state }))
                    this.ready = true
                })
            }

            downloadCSV(e) {
                const table = this.settings.table
                if (!table) {
                    console.error('Table not found.')
                    return
                }

                const rows = table.querySelectorAll('table tr')
                if (!rows || rows.length === 0) {
                    console.error('No rows in table')
                    return
                }

                const fieldChar = '"'
                const fieldDel = ';'
                const csvRows = []
                const escapedPattern = '/"/g'
                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('th, td')
                    const csvRow = Array.from(cells).map(cell => {
                        const text = cell.textContent.trim()
                        const escaped = text.replace(escapedPattern, '""')
                        return fieldChar + escaped + fieldChar
                    });
                    csvRows.push(csvRow.join(fieldDel))
                });

                const csvContent = csvRows.join('\r\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', `table-export[${this.settings.table.id}].csv`)
                link.style.display = 'none'
                link.click()
                URL.revokeObjectURL(url)
                new Toast('CSV file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'csv', data: csvContent })
            }

            downloadEXCEL(e) {
                const table = this.settings.table
                if (!table) return

                const html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:x="urn:schemas-microsoft-com:office:excel"
                      xmlns="http://www.w3.org/TR/REC-html40">
                  <head>
                    <!--[if gte mso 9]>
                    <xml>
                      <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                          <x:ExcelWorksheet>
                            <x:Name>Sheet1</x:Name>
                            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                          </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                      </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <meta charset="UTF-8">
                  </head>
                  <body>${table.outerHTML}</body>
                </html>`

                const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.setAttribute('href', url);
                link.setAttribute('download', `table-export[${this.settings.table.id}].xls`);
                link.click()

                URL.revokeObjectURL(url)
                new Toast('XLS file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'xls', data: html })
            }

            downloadMD(e) {
                const table = this.settings.table
                if (!table) return

                let markdown = ""
                const rows = Array.from(table.rows)

                rows.forEach((row, rowIndex) => {
                    const cells = Array.from(row.cells).map(cell => cell.innerText.trim())
                    markdown += `| ${cells.join(" | ")} |\n`

                    if (rowIndex === 0) {
                        markdown += `| ${cells.map(() => "---").join(" | ")} |\n`
                    }
                })

                const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.setAttribute('href', url);
                link.setAttribute('download', `table-export[${this.settings.table.id}].md`);
                link.click()

                URL.revokeObjectURL(url)
                new Toast('MD file download started!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'md', data: markdown })
            }

            copy(e) {
                const table = this.settings.table
                if (!table)
                    return

                let text = ""
                for (const row of table.rows) {
                    const cells = Array.from(row.cells).map(cell => cell.innerText.trim())
                    text += cells.join("\t") + "\n"
                }

                navigator.clipboard.writeText(text)
                    .then(() => {
                        this.buttonCOPY.firstChild.setAttribute('new-name', '--as-icon-checkmark')
                        //buttonCOPY.classList.add('active')
                        setTimeout(() => {
                            this.buttonCOPY.firstChild.setAttribute('new-name', '--as-icon-clone')
                            this.buttonCOPY.classList.remove('active')
                        }, 1000)
                    })
                    .catch(err => alert("Failed to copy table: " + err))

                new Toast('Table copied!', { type: 'info' })
                //// Dispatch custom event
                this.broadcastEvent('as-table-actions:download', { id: this.tableActionsId, type: 'copy', data: text })
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
                console.log(cEvent)
            }

        }
        window.customElements.define("as-table-actions", ASTableActions)
    }
})
// RESOURCE #109 END
// RESOURCE #115 BEGIN
// register new custom element
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
// RESOURCE #115 END
// RESOURCE #120 BEGIN
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-panel') === undefined) {
        class ASPanelElement extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                // Panel ID
                this.panelId = this.getAttribute("id") || crypto.randomUUID()
                this.setAttribute('id', this.panelId)

                /// default options
                this.settings = {}
                this.settings.headingClass = this.getAttribute('heading-class') || '.panel-heading'
                this.settings.bodyClass = this.getAttribute('body-class') || '.panel-body'
                this.settings.breakpoint = this.getAttribute('breakpoint') || 800
                this.settings.iconName = this.getAttribute('icon-name') || 'plus'
                this.settings.rotate = this.getAttribute('rotate') || '-45deg'
                ///

                if (this.ready)
                    return
                this.init()
            }

            init() {
                if (this.ready)
                    return
                this.removeAttribute('hidden')

                this.panelHeading = this.querySelector(`${this.settings.headingClass}`)
                if (!this.panelHeading)
                    return

                this.panelBody = this.querySelector(`${this.settings.bodyClass}`)
                this.icon = document.createElement('as-icon')
                this.icon.setAttribute('name', `${this.settings.iconName}`)
                this.icon.setAttribute('size', 'l')

                this.panelHeading.append(this.icon)

                this.addListeners()
                this.rotateIcon()

                this.ready = true
                this.broadcastEvent('as-panel:created', { id: this.panelId })
            }

            addListeners() {
                this.panelHeading.addEventListener('click', this.toggleContent.bind(this))
                window.addEventListener('resize', (e) => this.resizeContent(e))
            }

            resizeContent(e) {
                if (e.target.innerWidth > this.settings.breakpoint) {
                    this.removeAttribute('hide')
                    this.rotateIcon()
                    this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: 'open' })
                    return
                }
                if (e.target.innerWidth < this.settings.breakpoint) {
                    this.setAttribute('hide', '')
                    this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: 'closed' })
                }

                this.rotateIcon()

            }

            toggleContent() {
                this.toggleAttribute('hide')
                setTimeout(() => this.broadcastEvent('as-panel:toggle', { id: this.panelId, state: this.hasAttribute('hide') ? 'closed' : 'open' }), 1)
                setTimeout(() => this.rotateIcon(), 1)
            }

            rotateIcon() {
                !this.hasAttribute('hide') ? this.icon.style.setProperty('--rotate', `${this.settings.rotate}`) : this.icon.style.setProperty('--rotate', '0')
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
                //console.log(cEvent)
            }
        }
        // register new custom element
        window.customElements.define("as-panel", ASPanelElement)
    }
})

// RESOURCE #120 END
// RESOURCE #124 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-class-toggle') === undefined) {
        class ASClassToggle extends HTMLElement {
            connectedCallback() {
                // Table Actions ID
                this.classToggleId = crypto.randomUUID()

                this.targetElements = this.getAttribute('target-element').split('|')
                this.targetClasses = this.getAttribute('target-class').replaceAll('.', '').split('|') || ['toggle']
                this.targetState = this.getAttribute('target-state') || false

                this.buttonClass = this.getAttribute('button-class') || ''
                this.buttonText = this.getAttribute('button-text') || ''

                this.iconName = this.getAttribute('icon-name') || false
                this.iconRotate = this.getAttribute('icon-rotate') || '0deg'

                // Initialize
                if (!this.targetElements)
                    return
                this.init()
            }

            init() {
                this.innerHTML = `
                    <button class="${this.buttonClass}">${this.buttonText}${this.iconName ? '<as-icon name="' + this.iconName + '"></as-icon>' : ''}</button>
                `
                setTimeout(() => {
                    this.button = this.querySelector('button')
                    this.button.addEventListener('click', this.toggleClasses.bind(this))
                    this.icon = this.button.querySelector('as-icon')
                    this.toggleClasses()
                }, 1)

            }

            toggleClass() {
                this.targetState ? this.targetElement.classList.add(this.targetClass) : this.targetElement.classList.remove(this.targetClass)
                if (this.icon)
                    this.targetState ? this.icon.style.setProperty('--rotate', this.iconRotate) : this.icon.style.removeProperty('--rotate')
                this.targetState = !this.targetState
            }

            toggleClasses() {
                if (this.targetState) {
                    this.targetElements.forEach((el, idx) => document.querySelector(el).classList.add(this.targetClasses[idx]))
                }
                else {
                    this.targetElements.forEach((el, idx) => document.querySelector(el).classList.remove(this.targetClasses[idx]))
                }

                if (this.icon)
                    this.targetState ? this.icon.style.setProperty('--rotate', this.iconRotate) : this.icon.style.removeProperty('--rotate')
                this.targetState = !this.targetState
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
        window.customElements.define("as-class-toggle", ASClassToggle)
    }
})
// RESOURCE #124 END
// RESOURCE #110 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-contrast-checker') === undefined) {
        class ASContrastChecker extends HTMLElement {
            connectedCallback() {
                this.text = this.getAttribute('text') || this.innerText || 'Lorem ipsum dolor sit amet'

                this.contrastCheckerId = this.getAttribute("id") || "default";

                this.innerHTML = `
                <div class="controls">
                    <input type="color" name="bgcolor"/>
                    <button>&harr;</button>
                    <input type="color" value="#ffffff" name="textcolor"/>
                </div>
                <div class="bg">
                    <div class="text">${this.text}</div>
                </div>
                <div class="contrast"></div>
                <button class="save">Save colour pair</button>
                <div class="saved"></div>
                <br/>
                <p>Add your own colours to the box below, #RRGGBB, coma separated, click <b><code>Update colours</code></b> button to see list of all unique colour combinations.</p>
                <textarea></textarea>
                <button class="update">Update colours</button>
                `

                this.colourPairs = JSON.parse(localStorage.getItem(`colourPairs-${this.contrastCheckerId}`)) || [];

                this.bg = this.querySelector('.bg')
                this.text = this.querySelector('.text')
                this.contrast = this.querySelector('.contrast')
                this.swap = this.querySelector('.controls button')
                this.textarea = this.querySelector('textarea')
                this.updateBtn = this.querySelector('button.update')

                this.bgcolor = this.querySelector('input[type="color"][name="bgcolor"]')
                this.textcolor = this.querySelector('input[type="color"][name="textcolor"]')

                this.saved = this.querySelector('.saved')
                this.saveBtn = this.querySelector('button.save')

                this.bgcolor.addEventListener('change', color => {
                    this.bg.style.setProperty('--bgcolor', color.target.value)
                    this.calculateRatio(color.target.value, this.textcolor.value)
                })
                this.textcolor.addEventListener('change', color => {
                    this.text.style.setProperty('--textcolor', color.target.value)
                    console.log(this.bgcolor.value, color.target.value)
                    this.calculateRatio(this.bgcolor.value, color.target.value)
                })

                this.swap.addEventListener('click', () => {
                    const bgcolor = this.bgcolor.value
                    this.bgcolor.value = this.textcolor.value
                    this.textcolor.value = bgcolor
                    this.bg.style.setProperty('--bgcolor', this.bgcolor.value)
                    this.text.style.setProperty('--textcolor', this.textcolor.value)
                    this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                })

                this.saveBtn.addEventListener('click', () => {
                    this.saveColourPair(this.bgcolor.value, this.textcolor.value)
                })

                this.updateBtn.addEventListener('click', () => {
                    const coloursSet = this.textarea.value.replace(/[\n\s]/g, '').split(',') || []
                    const colourPairs = this.generateColourPairs(coloursSet)
                    this.colourPairs = []
                    colourPairs.forEach(pair => {
                        this.saveColourPair(pair.bg, pair.text)
                        this.bgcolor.value = pair.bg
                        this.textcolor.value = pair.text
                    })
                })
                this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                this.renderSavedColours()
            }

            generateColoursSet() {
                const colourPairs = this.colourPairs
                const coloursSet = new Set()
                colourPairs.forEach(colour => {
                    coloursSet.add(colour.bg).add(colour.text)
                })
                this.textarea.value = [...coloursSet].join(',')
                return coloursSet
            }

            generateColourPairs(coloursSet) {
                const colourPairsSet = new Set();
                const c = [...coloursSet]
                for (let t = 0; t < c.length; t++) {
                    for (let b = t + 1; b < c.length; b++) {
                        colourPairsSet.add({ "bg": c[b], "text": c[t] })
                    }
                }
                return colourPairsSet
            }

            saveColourPair(bg, text) {
                const colourPairs = this.colourPairs
                colourPairs.push({ "bg": bg, "text": text, "ratio": this.calculateRatio(bg, text) })
                this.colourPairs = colourPairs
                localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(colourPairs))
                this.renderSavedColours()
            }

            renderSavedColours() {
                if (!this.colourPairs.length)
                    return
                this.saved.innerHTML = ''
                this.colourPairs.forEach((pair, index) => {
                    const colourPairWrapper = document.createElement('div')
                    colourPairWrapper.innerHTML = `
                        <div style="background-color: ${pair.text}; color: ${pair.bg}">BG:<br/>${pair.bg}</div><div style="background-color: ${pair.bg}; color: ${pair.text}">Text:<br/>${pair.text}</div><div style="border: 1px solid #000000; align-content: center; ${(pair.ratio < 3) ? 'color: #f00;' : ''}">Ratio:<br/>${pair.ratio}:1</div>
                    `
                    const removePairBtn = document.createElement('button')
                    removePairBtn.innerText = '×'
                    removePairBtn.addEventListener('click', () => {
                        this.colourPairs.splice(index, 1)
                        colourPairWrapper.remove();
                        localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(this.colourPairs))
                        this.renderSavedColours()
                    })

                    colourPairWrapper.append(removePairBtn)
                    this.saved.prepend(colourPairWrapper)
                })
                this.generateColoursSet()
                this.generateColourPairs(this.generateColoursSet())
            }

            calculateRatio(bg, text) {
                const ratio = this.getContrastRatioForHex(bg, text)

                let level = ''
                this.saveBtn.removeAttribute('disabled')
                if (ratio < 3) {
                    level = 'DNP'
                    this.saveBtn.setAttribute('disabled', '')
                    this.contrast.setAttribute('pass', 'DNP')
                }
                if (ratio >= 3) {
                    level = 'AA18'
                    this.contrast.setAttribute('pass', 'AA18')
                }
                if (ratio >= 4.5) {
                    level = 'AA'
                    this.contrast.setAttribute('pass', 'AA')
                }
                if (ratio >= 7) {
                    level = 'AAA'
                    this.contrast.setAttribute('pass', 'AAA')
                }

                this.contrast.textContent = `${ratio}:1`
                return ratio
            }



            ////////////////////////////////////////////
            // MIT Licensed functions courtesty of Qambar Raza
            // https://github.com/Qambar/color-contrast-checker/blob/master/src/colorContrastChecker.js
            rgbClass = {
                toString: function () {
                    return "<r: " + this.r + " g: " + this.g + " b: " + this.b + " >"
                },
            };

            getRGBFromHex(color) {
                var rgb = Object.create(this.rgbClass),
                    rVal,
                    gVal,
                    bVal

                if (typeof color !== "string")
                    throw new Error("must use string")

                rVal = parseInt(color.slice(1, 3), 16)
                gVal = parseInt(color.slice(3, 5), 16)
                bVal = parseInt(color.slice(5, 7), 16)

                rgb.r = rVal
                rgb.g = gVal
                rgb.b = bVal

                return rgb
            }

            calculateSRGB(rgb) {
                var sRGB = Object.create(this.rgbClass),
                    key

                for (key in rgb) {
                    if (rgb.hasOwnProperty(key))
                        sRGB[key] = parseFloat(rgb[key] / 255, 10)
                }

                return sRGB
            }

            calculateLRGB(rgb) {
                var sRGB = this.calculateSRGB(rgb)
                var lRGB = Object.create(this.rgbClass),
                    key,
                    val = 0

                for (key in sRGB) {
                    if (sRGB.hasOwnProperty(key)) {
                        val = parseFloat(sRGB[key], 10)
                        if (val <= 0.03928)
                            lRGB[key] = val / 12.92
                        else
                            lRGB[key] = Math.pow((val + 0.055) / 1.055, 2.4)
                    }
                }

                return lRGB
            }

            calculateLuminance(lRGB) {
                return 0.2126 * lRGB.r + 0.7152 * lRGB.g + 0.0722 * lRGB.b
            }

            getContrastRatio(lumA, lumB) {
                var ratio, lighter, darker;

                if (lumA >= lumB) {
                    lighter = lumA;
                    darker = lumB;
                } else {
                    lighter = lumB;
                    darker = lumA;
                }

                ratio = (lighter + 0.05) / (darker + 0.05);

                return ratio.toFixed(1);
            }

            getContrastRatioForHex(foregroundColor, backgroundColor) {
                var color1 = this.getRGBFromHex(foregroundColor),
                    color2 = this.getRGBFromHex(backgroundColor),
                    l1RGB = this.calculateLRGB(color1),
                    l2RGB = this.calculateLRGB(color2),
                    l1 = this.calculateLuminance(l1RGB),
                    l2 = this.calculateLuminance(l2RGB)

                return this.getContrastRatio(l1, l2)
            }

            rgb2hex(rgb) {
                if (/^#[0-9A-F]{6}$/i.test(rgb))
                    return rgb

                rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

                function hex(x) {
                    return ("0" + parseInt(x, 10).toString(16)).slice(-2);
                }
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }

        }
        // register new custom element
        window.customElements.define("as-contrast-checker", ASContrastChecker)
    }
})
// RESOURCE #110 END
// RESOURCE #83 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-table-sort') === undefined) {
        class ASTableSort extends HTMLElement {
            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.componentId = crypto.randomUUID()
                this.setAttribute('id', this.componentId)
                this.isSorting = this.hasAttribute('sort')
                this.isFiltering = this.hasAttribute('filter')
                this.isSaving = this.hasAttribute('save')
                this.columns = this.hasAttribute('columns') ? this.getAttribute('columns').split(',') : null
                this.omit = this.hasAttribute('omit') ? this.getAttribute('omit').split(',') : []

                this.hasFilters = this.hasSorts = false

                // Initialize
                if (this.ready)
                    return

                this.init()
            }
            init() {
                this.table = this.querySelector('table')
                if (!this.table) {
                    throw new Error("No <table> element within component.")
                    this.broadcastEvent('as-table-sort:created', { id: this.componentId, action: 'not-created' })
                    return
                }


                if (this.columns && this.columns.length > 0) {
                    this.querySelector('thead').remove()
                    const fragment = new DocumentFragment()
                    const thead = document.createElement('thead')
                    const tr = document.createElement('tr')
                    this.columns.forEach(column => {
                        const th = document.createElement('th')
                        th.textContent = column
                        tr.append(th)
                    })
                    thead.append(tr)
                    fragment.append(thead)
                    this.table.prepend(fragment)
                }
                const tableFooter = document.createElement('tfoot')
                //this.tableHeadings = this.querySelectorAll('table thead tr th, table thead tr td')
                //this.tableRowsBase = this.querySelectorAll('table tbody tr')
                //this.tableBody = this.querySelector('table tbody')


                this.tableHeadings = Array.from(this.table.tHead?.rows[0]?.cells ?? [])
                this.tableRowsBase = Array.from(this.table.tBodies[0]?.rows ?? [])
                this.tableBody = this.table.tBodies[0]

                this.tableHeadings.forEach((heading, index) => {
                    if (!this.omit.includes(String(index))) {
                        const asc = heading.asc = true
                        let searchWord = heading.searchWord = ''
                        if (this.isSorting) {
                            const label = document.createElement('label')
                            label.textContent = heading.textContent
                            label.setAttribute('for', `input_${index}`)
                            heading.innerHTML = ''
                            const wrapper = document.createElement('div')
                            const btn = document.createElement('button')

                            btn.setAttribute('sort', '')
                            btn.addEventListener('click', this.sortTable.bind(this, btn, index))

                            const icon = document.createElement('as-icon')
                            icon.setAttribute('name', '--as-icon-arrows-up-down')
                            icon.setAttribute('size', 'm')
                            btn.append(icon)
                            wrapper.append(label, btn)
                            heading.append(wrapper)
                        }
                        if (this.isFiltering) {
                            const searchPanel = document.createElement('div')
                            searchPanel.setAttribute('searchpanel', '')
                            const input = document.createElement('input')
                            input.setAttribute('type', 'search')
                            input.setAttribute('list', `list_${index}`)
                            input.setAttribute('id', `input_${index}`)
                            input.addEventListener('input', e => {
                                heading.searchWord = e.target.value
                                this.filterTable()
                                this.broadcastEvent('as-table-sort:filtered', { id: this.componentId, action: 'filtered', column: this.tableHeadings[index].textContent, searchword: heading.searchWord })
                            })
                            input.addEventListener('search', e => {
                                heading.searchWord = e.target.value
                                this.filterTable()

                            })
                            searchPanel.append(input)
                            heading.append(searchPanel)
                            this.hasFilter = false
                        }
                    }
                })
                tableFooter.innerHTML = `<tr><td colspan="${this.tableHeadings.length}"><div></div></td></tr>`
                this.table.append(tableFooter)
                this.footer = this.querySelector('tfoot td>div')
                this.setFooter()

                this.broadcastEvent('as-table-sort:created', { id: this.componentId, action: 'created' })
                this.ready = true
            }
            sortTable(btn, index = 0) {
                this.resetDir(index)
                //const btns = this.querySelectorAll('button[sort]')
                const btns = this.table.tHead.querySelectorAll('button[sort]')
                btns.forEach(btn => {
                    btn.firstChild.setAttribute('new-name', '--as-icon-arrows-up-down')
                })
                const asc = this.tableHeadings[index].asc = !this.tableHeadings[index].asc

                if (asc)
                    btn.firstChild.setAttribute('new-name', '--as-icon-sort-up')
                else
                    btn.firstChild.setAttribute('new-name', '--as-icon-sort-down')
                btn.setAttribute('active', '')
                //let rows = [...this.querySelectorAll('table tbody tr')]

                let rows = Array.from(this.table.tBodies[0]?.rows ?? [])

                this.tableBody.innerHTML = ''
                //while (this.tableBody.firstChild)
                //    this.tableBody.removeChild(this.tableBody.firstChild)

                this.sortedRows = rows.sort((a, b) => {
                    let valA = a.cells[index].innerText.trim()
                    let valB = b.cells[index].innerText.trim()
                    // check if sorting values are numbers and if so convert to numbers
                    if (this.isNumber(valA) && this.isNumber(valB)) {
                        valA = parseFloat(valA) || 0
                        valB = parseFloat(valB) || 0
                    }
                    if (valA < valB) return asc ? -1 : 1
                    if (valA > valB) return asc ? 1 : -1
                    return 0
                })
                const fragment = new DocumentFragment()
                this.sortedRows.forEach(row => fragment.append(row))
                this.tableBody.append(fragment)
                this.hasSorts = true
                this.setFooter()

                console.log(this.tableHeadings)
                this.broadcastEvent('as-table-sort:sorted', { id: this.componentId, action: 'sorted', column: this.tableHeadings[index].textContent, direction: (asc) ? 'asc' : 'desc' })
            }
            resetDir(index) {
                // reset heading.asc property so it always sorts ASC when clicked first time
                this.tableHeadings.forEach((heading, idx) => {
                    if (idx != index)
                        heading.asc = true
                })
            }

            filterTable() {
                if (this.hasSorts)
                    this.filteredRows = Array.from(this.sortedRows)
                else
                    this.filteredRows = Array.from(this.tableRowsBase)
                this.tableHeadings.forEach((heading, index) => {
                    if (!this.omit.includes(String(index))) {
                        const searchword = heading.searchWord
                        if (searchword.length != 0) {
                            this.filteredRows = this.filteredRows.filter(row => row.cells[index].innerText.toLowerCase().includes(searchword.toLowerCase()))
                            this.hasFilter = true
                            this.setFooter()

                        }
                    }
                })
                const fragment = new DocumentFragment()
                this.tableBody.innerHTML = ''
                this.filteredRows.forEach(row => fragment.append(row))
                this.tableBody.append(fragment)
            }
            setFooter() {
                this.footer.innerHTML = '&nbsp;'
                if (this.hasSorts) {
                    const resetSortBtn = document.createElement('button')
                    resetSortBtn.textContent = 'Reset sorting'
                    resetSortBtn.onclick = this.deleteSorting.bind(this)
                    const icon = document.createElement('as-icon')
                    icon.setAttribute('name', '--as-icon-trashcan')
                    icon.setAttribute('size', 'm')
                    resetSortBtn.append(icon)
                    this.footer.append(resetSortBtn)
                }
                if (this.hasFilter) {
                    const resetFiltersBtn = document.createElement('button')
                    resetFiltersBtn.textContent = 'Delete filters'
                    resetFiltersBtn.onclick = this.deleteFilters.bind(this)
                    const icon = document.createElement('as-icon')
                    icon.setAttribute('name', '--as-icon-trashcan')
                    icon.setAttribute('size', 'm')
                    resetFiltersBtn.append(icon)
                    this.footer.append(resetFiltersBtn)
                }
            }
            deleteFilters() {
                this.tableHeadings.forEach((heading, index) => {
                    if (!this.omit.includes(String(index))) {
                        heading.searchWord = ''
                        const input = heading.querySelector('input[type="search"]')
                        input.value = ''
                    }
                })
                this.hasFilter = false
                this.tableBody.innerHTML = ""
                let table = []
                if (this.hasSorts) {
                    table = this.tableRowsBase
                    table.forEach(row => this.tableBody.append(row))
                    this.tableHeadings.forEach((heading, index) => {
                        const btn = heading.querySelector('button[active]')
                        if (btn) {
                            heading.asc = !heading.asc
                            this.sortTable(btn, index)
                        }
                    })
                }
                else {
                    const fragment = new DocumentFragment()
                    table = this.tableRowsBase
                    table.forEach(row => fragment.append(row))
                    this.tableBody.append(fragment)
                }
                this.setFooter()
                this.broadcastEvent('as-table-sort:filtering', { id: this.componentId, action: 'delete' })
            }
            deleteSorting() {
                this.tableHeadings.forEach((heading, index) => {
                    if (!this.omit.includes(String(index))) {
                        heading.asc = undefined
                        const btn = heading.querySelector('button')
                        //btn.textContent = '↑↓'
                        btn.firstChild.setAttribute('new-name', '--as-icon-arrows-up-down')
                    }
                })
                this.hasSorts = false
                this.tableBody.innerHTML = ""
                let table = []
                if (this.hasFilter)
                    this.filterTable()
                else {
                    const fragment = new DocumentFragment()
                    table = this.tableRowsBase
                    table.forEach(row => fragment.append(row))
                    this.tableBody.append(fragment)
                }
                this.setFooter()

                this.broadcastEvent('as-table-sort:sort', { id: this.componentId, action: 'delete' })
            }
            isNumber(n) {
                return n !== null && n !== '' && !isNaN(Number(n))
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

            getDirectRows() {
                // Only get tr elements that are direct children of THIS component's direct table's tbody
                return Array.from(this.table.tBodies[0]?.rows ?? [])
            }

            getDirectHeadings() {
                return Array.from(this.table.tHead?.rows[0]?.cells ?? [])
            }
        }
        window.customElements.define("as-table-sort", ASTableSort)
    }
})

// RESOURCE #83 END
// RESOURCE #126 BEGIN
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-tab') === undefined) {
        class ASTab extends HTMLElement {

            constructor() {
                super()
                this.ready = false
            }

            connectedCallback() {
                this.tabId = this.getAttribute('id') || crypto.randomUUID()
                this.iconName = this.hasAttribute('icon-name') ? this.getAttribute('icon-name') : ''

                // Initialize
                if (this.ready)
                    return

                this.init()
            }

            init() {
                if (this.iconName.length > 0) {
                    const icon = document.createElement('as-icon')
                    icon.setAttribute('name', this.iconName)
                    this.prepend(icon)
                }

                this.ready = true
            }
        }

        // register new custom element
        window.customElements.define("as-tab", ASTab)
    }
})
// RESOURCE #126 END
// RESOURCE #57 BEGIN
const locale = {
    navigate: "Navigate",
    select: "Select",
    dismiss: "Dismiss",
    drag: "Hold & drag",
    reset: "Reset",
    open: "Menu",
    placeholder: "Type a command or search...",
    nohits: "No results for",
    hint: "Search tips: some search terms require an exact match. Try typing the entire command name, or use a different word or phrase."
}
// RESOURCE #57 END
// RESOURCE #58 BEGIN
const options = [
    {
        title: "Mine aftaler",
        keywords: "alle mine aftaler",
        shortcut: "Alt+A",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine aftaler clicked') }, 100)
        },
    },

    {
        title: "Mine opgaver",
        keywords: "alle mine opgaver",
        shortcut: "Alt+O",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine opgaver clicked') }, 100)
        },
    },

    {
        title: "Indgående meddelelser",
        keywords: "alle mine beskeder mails sms",
        shortcut: "Alt+T",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Indgående meddelelser clicked') }, 100)
        },
    },

    {
        title: "Mine sager",
        keywords: "alle mine sager",
        shortcut: "Alt+S",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Mine sager clicked') }, 100)
        },
    },

    {
        title: "Sager jeg er tilknyttet",
        keywords: "alle mine sager tilknyttet",
        shortcut: "Alt+R",
        section: "Sager",
        handler: () => {
            setTimeout(() => { new Toast('Sager jeg er tilknytted clicked') }, 100)
        },
    },

    {
        title: "Skabeloner",
        keywords: "opsætning skabeloner mails sms besked journalnote",
        shortcut: "Alt+I",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Skabeloner clicked') }, 100)
        },
    },

    {
        title: "Nøgleord",
        keywords: "opsætning nøgleord sager",
        shortcut: "Alt+N",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Nøgleord clicked') }, 100)
        },
    },

    {
        title: "Notifikationer",
        keywords: "opsætning notifikationer systemmails sms beskeder",
        shortcut: "Alt+S",
        section: "Opsætning",
        handler: () => {
            setTimeout(() => { new Toast('Notifikationer clicked') }, 100)
        },
    },
]
// RESOURCE #58 END
// RESOURCE #127 BEGIN
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

            this.tabs.forEach((tab, index) => {
                if (!tab.hasAttribute('id'))
                    tab.setAttribute('id', `tab-${this.tabGroupId}-${index}`)
                tab.setAttribute('tabindex', '0')
                tab.setAttribute('role', 'tab')
                this.combined.push({ index, tab, panel: this.panels[index] })

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
                    if (['Space', 'Enter', 'Tab'].includes(e.code)) {
                        this.currentTab = set.index
                    }
                    if (['ArrowLeft', 'ArrowUp'].includes(e.code)) {
                        this.currentTab = (this.currentTab - 1 + this.combined.length) % this.combined.length
                    }
                    if (['ArrowRight', 'ArrowDown'].includes(e.code)) {
                        this.currentTab = (this.currentTab + 1) % this.combined.length
                    }
                    this.tabAction(this.combined[this.currentTab])
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
            })
            this.panels.forEach(panel => {
                panel.setAttribute('hidden', '')
            })

            set.tab.setAttribute('aria-selected', 'true')
            set.tab.setAttribute('selected', '')
            set.panel.removeAttribute('hidden')
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
// RESOURCE #127 END
// RESOURCE #103 BEGIN
// register new custom element
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
// RESOURCE #103 END
// RESOURCE #110 BEGIN
// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-contrast-checker') === undefined) {
        class ASContrastChecker extends HTMLElement {
            connectedCallback() {
                this.text = this.getAttribute('text') || this.innerText || 'Lorem ipsum dolor sit amet'

                this.contrastCheckerId = this.getAttribute("id") || "default";

                this.innerHTML = `
                <div class="controls">
                    <input type="color" name="bgcolor"/>
                    <button>&harr;</button>
                    <input type="color" value="#ffffff" name="textcolor"/>
                </div>
                <div class="bg">
                    <div class="text">${this.text}</div>
                </div>
                <div class="contrast"></div>
                <button class="save">Save colour pair</button>
                <div class="saved"></div>
                <br/>
                <p>Add your own colours to the box below, #RRGGBB, coma separated, click <b><code>Update colours</code></b> button to see list of all unique colour combinations.</p>
                <textarea></textarea>
                <button class="update">Update colours</button>
                `

                this.colourPairs = JSON.parse(localStorage.getItem(`colourPairs-${this.contrastCheckerId}`)) || [];

                this.bg = this.querySelector('.bg')
                this.text = this.querySelector('.text')
                this.contrast = this.querySelector('.contrast')
                this.swap = this.querySelector('.controls button')
                this.textarea = this.querySelector('textarea')
                this.updateBtn = this.querySelector('button.update')

                this.bgcolor = this.querySelector('input[type="color"][name="bgcolor"]')
                this.textcolor = this.querySelector('input[type="color"][name="textcolor"]')

                this.saved = this.querySelector('.saved')
                this.saveBtn = this.querySelector('button.save')

                this.bgcolor.addEventListener('change', color => {
                    this.bg.style.setProperty('--bgcolor', color.target.value)
                    this.calculateRatio(color.target.value, this.textcolor.value)
                })
                this.textcolor.addEventListener('change', color => {
                    this.text.style.setProperty('--textcolor', color.target.value)
                    console.log(this.bgcolor.value, color.target.value)
                    this.calculateRatio(this.bgcolor.value, color.target.value)
                })

                this.swap.addEventListener('click', () => {
                    const bgcolor = this.bgcolor.value
                    this.bgcolor.value = this.textcolor.value
                    this.textcolor.value = bgcolor
                    this.bg.style.setProperty('--bgcolor', this.bgcolor.value)
                    this.text.style.setProperty('--textcolor', this.textcolor.value)
                    this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                })

                this.saveBtn.addEventListener('click', () => {
                    this.saveColourPair(this.bgcolor.value, this.textcolor.value)
                })

                this.updateBtn.addEventListener('click', () => {
                    const coloursSet = this.textarea.value.replace(/[\n\s]/g, '').split(',') || []
                    const colourPairs = this.generateColourPairs(coloursSet)
                    this.colourPairs = []
                    colourPairs.forEach(pair => {
                        this.saveColourPair(pair.bg, pair.text)
                        this.bgcolor.value = pair.bg
                        this.textcolor.value = pair.text
                    })
                })
                this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                this.renderSavedColours()
            }

            generateColoursSet() {
                const colourPairs = this.colourPairs
                const coloursSet = new Set()
                colourPairs.forEach(colour => {
                    coloursSet.add(colour.bg).add(colour.text)
                })
                this.textarea.value = [...coloursSet].join(',')
                return coloursSet
            }

            generateColourPairs(coloursSet) {
                const colourPairsSet = new Set();
                const c = [...coloursSet]
                for (let t = 0; t < c.length; t++) {
                    for (let b = t + 1; b < c.length; b++) {
                        colourPairsSet.add({ "bg": c[b], "text": c[t] })
                    }
                }
                return colourPairsSet
            }

            saveColourPair(bg, text) {
                const colourPairs = this.colourPairs
                colourPairs.push({ "bg": bg, "text": text, "ratio": this.calculateRatio(bg, text) })
                this.colourPairs = colourPairs
                localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(colourPairs))
                this.renderSavedColours()
            }

            renderSavedColours() {
                if (!this.colourPairs.length)
                    return
                this.saved.innerHTML = ''
                this.colourPairs.forEach((pair, index) => {
                    const colourPairWrapper = document.createElement('div')
                    colourPairWrapper.innerHTML = `
                        <div style="background-color: ${pair.text}; color: ${pair.bg}">BG:<br/>${pair.bg}</div><div style="background-color: ${pair.bg}; color: ${pair.text}">Text:<br/>${pair.text}</div><div style="border: 1px solid #000000; align-content: center; ${(pair.ratio < 3) ? 'color: #f00;' : ''}">Ratio:<br/>${pair.ratio}:1</div>
                    `
                    const removePairBtn = document.createElement('button')
                    removePairBtn.innerText = '×'
                    removePairBtn.addEventListener('click', () => {
                        this.colourPairs.splice(index, 1)
                        colourPairWrapper.remove();
                        localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(this.colourPairs))
                        this.renderSavedColours()
                    })

                    colourPairWrapper.append(removePairBtn)
                    this.saved.prepend(colourPairWrapper)
                })
                this.generateColoursSet()
                this.generateColourPairs(this.generateColoursSet())
            }

            calculateRatio(bg, text) {
                const ratio = this.getContrastRatioForHex(bg, text)

                let level = ''
                this.saveBtn.removeAttribute('disabled')
                if (ratio < 3) {
                    level = 'DNP'
                    this.saveBtn.setAttribute('disabled', '')
                    this.contrast.setAttribute('pass', 'DNP')
                }
                if (ratio >= 3) {
                    level = 'AA18'
                    this.contrast.setAttribute('pass', 'AA18')
                }
                if (ratio >= 4.5) {
                    level = 'AA'
                    this.contrast.setAttribute('pass', 'AA')
                }
                if (ratio >= 7) {
                    level = 'AAA'
                    this.contrast.setAttribute('pass', 'AAA')
                }

                this.contrast.textContent = `${ratio}:1`
                return ratio
            }



            ////////////////////////////////////////////
            // MIT Licensed functions courtesty of Qambar Raza
            // https://github.com/Qambar/color-contrast-checker/blob/master/src/colorContrastChecker.js
            rgbClass = {
                toString: function () {
                    return "<r: " + this.r + " g: " + this.g + " b: " + this.b + " >"
                },
            };

            getRGBFromHex(color) {
                var rgb = Object.create(this.rgbClass),
                    rVal,
                    gVal,
                    bVal

                if (typeof color !== "string")
                    throw new Error("must use string")

                rVal = parseInt(color.slice(1, 3), 16)
                gVal = parseInt(color.slice(3, 5), 16)
                bVal = parseInt(color.slice(5, 7), 16)

                rgb.r = rVal
                rgb.g = gVal
                rgb.b = bVal

                return rgb
            }

            calculateSRGB(rgb) {
                var sRGB = Object.create(this.rgbClass),
                    key

                for (key in rgb) {
                    if (rgb.hasOwnProperty(key))
                        sRGB[key] = parseFloat(rgb[key] / 255, 10)
                }

                return sRGB
            }

            calculateLRGB(rgb) {
                var sRGB = this.calculateSRGB(rgb)
                var lRGB = Object.create(this.rgbClass),
                    key,
                    val = 0

                for (key in sRGB) {
                    if (sRGB.hasOwnProperty(key)) {
                        val = parseFloat(sRGB[key], 10)
                        if (val <= 0.03928)
                            lRGB[key] = val / 12.92
                        else
                            lRGB[key] = Math.pow((val + 0.055) / 1.055, 2.4)
                    }
                }

                return lRGB
            }

            calculateLuminance(lRGB) {
                return 0.2126 * lRGB.r + 0.7152 * lRGB.g + 0.0722 * lRGB.b
            }

            getContrastRatio(lumA, lumB) {
                var ratio, lighter, darker;

                if (lumA >= lumB) {
                    lighter = lumA;
                    darker = lumB;
                } else {
                    lighter = lumB;
                    darker = lumA;
                }

                ratio = (lighter + 0.05) / (darker + 0.05);

                return ratio.toFixed(1);
            }

            getContrastRatioForHex(foregroundColor, backgroundColor) {
                var color1 = this.getRGBFromHex(foregroundColor),
                    color2 = this.getRGBFromHex(backgroundColor),
                    l1RGB = this.calculateLRGB(color1),
                    l2RGB = this.calculateLRGB(color2),
                    l1 = this.calculateLuminance(l1RGB),
                    l2 = this.calculateLuminance(l2RGB)

                return this.getContrastRatio(l1, l2)
            }

            rgb2hex(rgb) {
                if (/^#[0-9A-F]{6}$/i.test(rgb))
                    return rgb

                rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

                function hex(x) {
                    return ("0" + parseInt(x, 10).toString(16)).slice(-2);
                }
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }

        }
        // register new custom element
        window.customElements.define("as-contrast-checker", ASContrastChecker)
    }
})
// RESOURCE #110 END

// register new custom element
document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-search-menu') === undefined) {
        class ASSearchMenu extends HTMLElement {

            connectedCallback() {
                // command menu ID
                this.searchMenuId = this.getAttribute("id") || crypto.randomUUID()
                if (!this.getAttribute("id"))
                    this.setAttribute("id", this.commandMenuId)


                this.keys = this.getAttribute('keys').split('+') || ["Meta", "U"]

                this.isMac = navigator.userAgent.indexOf('Mac OS') > 0 ? true : false

                this.active = false

                this.method = this.getAttribute('method') || 'post'
                this.action = this.getAttribute('action') || '/Components/Search?action=search&searchmethod=0&search='
                this.placeholder = this.getAttribute('placeholder') || 'Search for...'
                this.navigate = this.getAttribute('navigate') || 'Navigate'
                this.enter = this.getAttribute('enter') || 'Select'
                this.dismiss = this.getAttribute('dismiss') || 'Dismiss'
                this.drag = this.getAttribute('drag') || 'Hold & drag'
                this.hint = this.getAttribute('hint') || 'Search tips: some search terms require an exact match. Try typing the entire sentence, or use a different word or phrase.'
                this.nohits = this.getAttribute('nohits') || 'No recent search matches your query, but... there\'s no timelike present to search for something!'
                this.recentSearches = JSON.parse(sessionStorage.getItem('tsRecentSearches')) || [];
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
                this.addEventListener('focusin', () => this.active = true)
                this.addEventListener('focusout', () => this.active = false)

                const keyMap = []
                document.addEventListener('keydown', e => {
                    //if (!this.active) return
                    console.log('key', e.code)
                    keyMap.push(e.code.replace('Left', '').replace('Right', '').replace('Key', '').replace('Digit', ''))
                    this.decodeCommand(keyMap, e)
                })

                document.addEventListener('keyup', e => {
                    //if (!this.active) return
                    keyMap.splice(0, keyMap.length)
                })

                this.search.addEventListener('input', e => this.filterCommands(e.target.value))
                this.form.addEventListener('submit', e => this.saveSearch)
                if (this.btns.clear)
                    this.btns.clear.addEventListener('click', e => this.clearSearches())
            }

            uniqueArray(a) {
                return [...new Set(a.map(o => JSON.stringify(o)))].map(s => JSON.parse(s))
            }

            saveSearch() {
                if (this.search.value !== '') {
                    this.recentSearches.push({ searchTerm: `${this.search.value}` })
                    sessionStorage.setItem('tsRecentSearches', JSON.stringify(this.uniqueArray(this.recentSearches)))
                }
                this.form.submit()
            }

            clearSearches() {
                this.filteredSearches = this.recentSearches = []

                sessionStorage.setItem('tsRecentSearches', JSON.stringify(this.recentSearches))
                this.render()
            }

            filterCommands(searchText) {
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
                    this.search.value = evt.target.textContent
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
                            this.saveSearch()
                            //this.form.submit()
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
        window.customElements.define("as-search-menu", ASSearchMenu)
    }
})