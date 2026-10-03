document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-date-picker') !== undefined)
        return

    // Dates are handled as local calendar dates in ISO form (YYYY-MM-DD). Going through toISOString()
    // would convert to UTC and shift the day around midnight, so dates are built from local parts.
    const pad = n => String(n).padStart(2, '0')
    const toISO = (year, month, day) => `${String(year).padStart(4, '0')}-${pad(month + 1)}-${pad(day)}`
    const fromDate = date => toISO(date.getFullYear(), date.getMonth(), date.getDate())
    const makeDate = (year, month, day) => {
        const date = new Date(2000, 0, 1)
        date.setFullYear(year, month, day)
        return date
    }
    // strict parser: returns a Date only for real calendar dates
    const parseISO = value => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
        if (!match)
            return null
        const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
        const date = makeDate(year, month, day)
        return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
    }
    const addDays = (iso, days) => {
        const date = parseISO(iso)
        date.setDate(date.getDate() + days)
        return fromDate(date)
    }
    // keeps the day of month where possible and clamps it to the last day of shorter months (31 Jan + 1 month = 28/29 Feb)
    const addMonths = (iso, months) => {
        const date = parseISO(iso)
        const day = date.getDate()
        date.setDate(1)
        date.setMonth(date.getMonth() + months)
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
        return fromDate(date)
    }
    const today = () => fromDate(new Date())

    class ASDatePickerElement extends HTMLElement {
        static get observedAttributes() {
            return ['locale', 'reverse', 'yearspan', 'first-day', 'min', 'max', 'disabled', 'selects', 'placeholder', 'today-text', 'button-label', 'breakpoint']
        }

        constructor() {
            super()
            this.ready = false
            this.built = false
            this._value = ''
            this.mode = null
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

        connectedCallback() {
            // build once: connectedCallback also runs when the element is moved
            if (this.ready) {
                this.attachGlobals()
                return
            }
            this.ready = true
            queueMicrotask(() => this.init())
        }

        disconnectedCallback() {
            this.detachGlobals()
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (!this.built || oldValue === newValue)
                return
            this.configure()
            this.syncTwin()
            this.renderField()
            this.renderCalendar()
            this.applyMode()
        }

        // value --------------------------------------------------------------------

        // the date as ISO string (YYYY-MM-DD) or an empty string, whatever the display format is
        get value() {
            return this._value
        }

        set value(value) {
            const iso = value ? (parseISO(value) ? value : null) : ''
            if (iso === null || (iso && !this.inRange(iso)))
                return
            this.setValue(iso)
        }

        inRange(iso) {
            return (!this.min || iso >= this.min) && (!this.max || iso <= this.max)
        }

        clamp(iso) {
            if (this.min && iso < this.min) return this.min
            if (this.max && iso > this.max) return this.max
            return iso
        }

        // single place where the value changes, emit is true for user actions
        setValue(iso, emit = false) {
            const previous = this._value
            this._value = iso
            this.viewFrom(iso || today())
            this.renderField()
            this.syncTwin()
            this.renderCalendar()
            this.input.removeAttribute('aria-invalid')
            this.input.setCustomValidity('')
            if (emit && previous !== iso) {
                // real events, so forms and frameworks see the change like a typed one
                this.input.dispatchEvent(new Event('input', { bubbles: true }))
                this.input.dispatchEvent(new Event('change', { bubbles: true }))
                const [py, pm, pd] = previous ? previous.split('-') : []
                const [ny, nm, nd] = iso ? iso.split('-') : []
                const changed = []
                if (py !== ny) changed.push('year')
                if (pm !== nm) changed.push('month')
                if (pd !== nd) changed.push('day')
                this.broadcastEvent('as-date-picker:changed', { id: this.datePickerId, date: iso, changed })
            }
        }

        // display format <-> ISO
        format(iso) {
            return iso && this.reverse ? iso.split('-').reverse().join('-') : iso
        }

        parseText(text) {
            const value = text.trim()
            if (this.reverse) {
                const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
                return match ? `${match[3]}-${match[2]}-${match[1]}` : null
            }
            return value
        }

        // setup --------------------------------------------------------------------

        configure() {
            this.locale = this.getAttribute('locale') || document.documentElement.getAttribute('lang') || 'en'
            this.breakpoint = Number(this.getAttribute('breakpoint') ?? 800)
            this.yearSpan = this.hasAttribute('yearspan') ? Number(this.getAttribute('yearspan')) : 20
            this.reverse = this.hasAttribute('reverse')
            this.selects = this.hasAttribute('selects')
            this.disabled = this.hasAttribute('disabled')
            this.min = parseISO(this.getAttribute('min')) ? this.getAttribute('min') : ''
            this.max = parseISO(this.getAttribute('max')) ? this.getAttribute('max') : ''
            this.todayText = this.getAttribute('today-text') || 'Today'
            this.buttonLabel = this.getAttribute('button-label') || 'Choose date'
            this.formatHint = this.reverse ? 'DD-MM-YYYY' : 'YYYY-MM-DD'

            // first day of the week: attribute (0 = Sunday .. 6 = Saturday), else the locale's, else Monday
            const attr = this.getAttribute('first-day')
            if (attr !== null && attr !== '' && !Number.isNaN(Number(attr))) {
                this.firstDay = ((Number(attr) % 7) + 7) % 7
            } else {
                try {
                    const locale = new Intl.Locale(this.locale)
                    const info = locale.getWeekInfo ? locale.getWeekInfo() : locale.weekInfo
                    this.firstDay = info ? info.firstDay % 7 : 1
                } catch (e) {
                    this.firstDay = 1
                }
            }

            this.fullFormat = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' })
            this.monthFormat = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' })
            this.monthNameFormat = new Intl.DateTimeFormat(this.locale, { month: 'long' })
            this.weekdayFormat = new Intl.DateTimeFormat(this.locale, { weekday: 'narrow' })
        }

        init() {
            this.input = this.querySelector('input')
            if (!this.input) {
                console.warn('as-date-picker expects an <input> inside it', this)
                return
            }
            this.datePickerId = crypto.randomUUID()
            this.configure()

            // starting value, in the display format or already ISO
            const initial = this.input.value.trim()
            const asIso = parseISO(initial) ? initial : parseISO(this.parseText(initial) || '') ? this.parseText(initial) : ''
            this._value = asIso && this.inRange(asIso) ? asIso : ''

            this.fieldName = this.input.getAttribute('name')
            // a placeholder written on the input wins over the attribute on the component
            this.ownPlaceholder = this.input.getAttribute('placeholder')
            this.build()
            this.bindEvents()
            this.viewFrom(this._value || today())
            this.renderField()
            this.syncTwin()
            this.renderCalendar()
            this.built = true
            this.applyMode(true)
            this.broadcastEvent('as-date-picker:created', { id: this.datePickerId })
        }

        build() {
            // trigger button
            this.trigger = document.createElement('as-button')
            this.trigger.setAttribute('variant', 'transparent')
            this.trigger.setAttribute('icon-name', '--as-icon-calendar')
            this.trigger.setAttribute('button-class', 'as-date-picker__trigger')
            this.trigger.setAttribute('popovertarget', this.datePickerId)
            this.trigger.setAttribute('aria-haspopup', 'dialog')
            this.trigger.setAttribute('aria-expanded', 'false')
            this.trigger.style.setProperty('anchor-name', `--${this.datePickerId}`)

            // calendar popover
            this.panel = document.createElement('div')
            this.panel.setAttribute('popover', '')
            this.panel.setAttribute('role', 'dialog')
            this.panel.setAttribute('id', this.datePickerId)
            this.panel.style.setProperty('position-anchor', `--${this.datePickerId}`)

            this.calendar = document.createElement('div')
            this.calendar.setAttribute('calendar', '')

            this.header = document.createElement('header')
            this.prevButton = this.makeNavButton('--as-icon-chevron-left', -1)
            this.nextButton = this.makeNavButton('--as-icon-chevron-right', 1)

            this.weekdays = document.createElement('div')
            this.weekdays.setAttribute('weekdays', '')
            this.weekdays.setAttribute('aria-hidden', 'true')

            this.grid = document.createElement('div')
            this.grid.setAttribute('cal', '')
            this.grid.setAttribute('role', 'group')

            this.footer = document.createElement('footer')
            this.todayButton = document.createElement('as-button')
            this.todayButton.setAttribute('variant', 'outline')
            this.todayButton.setAttribute('size', 'm')
            this.todayButton.setAttribute('today-button', '')
            this.footer.append(this.todayButton)

            this.calendar.append(this.header, this.weekdays, this.grid, this.footer)
            this.panel.append(this.calendar)
            this.append(this.trigger, this.panel)
        }

        makeNavButton(icon, delta) {
            const button = document.createElement('as-button')
            button.setAttribute('month', '')
            button.setAttribute('size', 'm')
            button.setAttribute('icon-name', icon)
            button.addEventListener('click', () => this.moveMonth(delta))
            return button
        }

        bindEvents() {
            this.panel.addEventListener('toggle', e => this.onToggle(e))
            this.panel.addEventListener('keydown', e => this.onGridKey(e))
            // month / year select changes are internal, they must not look like a change of the field to a form
            this.panel.addEventListener('change', e => e.stopPropagation())
            // one listener for all days
            this.grid.addEventListener('click', e => {
                const day = e.target.closest('button[data-date]')
                if (day && !day.disabled)
                    this.pick(day.dataset.date)
            })
            this.todayButton.addEventListener('click', () => {
                const iso = today()
                if (this.inRange(iso))
                    this.pick(iso)
            })

            this.input.addEventListener('keydown', e => this.onInputKey(e))
            this.input.addEventListener('change', e => {
                // events dispatched by this component are not trusted, only the user's own edits are parsed
                if (e.isTrusted)
                    this.commitText()
            })
            this.input.addEventListener('blur', () => {
                if (this.mode === 'desktop')
                    this.commitText()
            })

            this.addGlobal(window, 'resize', this._onResize ??= () => this.applyMode())
        }

        // field and mode ---------------------------------------------------------------

        // text shown in the input, plus the hidden ISO twin when the display format differs
        renderField() {
            const input = this.input
            input.toggleAttribute('disabled', this.disabled)
            input.setAttribute('autocomplete', 'off')
            if (this.mode === 'mobile') {
                input.value = this._value
                this.min ? input.setAttribute('min', this.min) : input.removeAttribute('min')
                this.max ? input.setAttribute('max', this.max) : input.removeAttribute('max')
            } else {
                input.value = this.format(this._value)
                input.setAttribute('pattern', this.reverse ? '[0-9]{2}-[0-9]{2}-[0-9]{4}' : '[0-9]{4}-[0-9]{2}-[0-9]{2}')
                input.setAttribute('title', this.formatHint)
                input.setAttribute('inputmode', 'numeric')
                input.removeAttribute('min')
                input.removeAttribute('max')
                input.setAttribute('placeholder', this.ownPlaceholder || this.getAttribute('placeholder') || this.formatHint)
            }
            this.trigger.toggleAttribute('disabled', this.disabled)
            this.trigger.setAttribute('label', this.buttonLabel)
            this.panel.setAttribute('aria-label', this.buttonLabel)
        }

        // submitted value is always ISO: when the display format differs it moves to a hidden twin field
        syncTwin() {
            if (this.reverse && this.fieldName) {
                if (!this.twin) {
                    this.twin = document.createElement('input')
                    this.twin.type = 'hidden'
                    this.twin.name = this.fieldName
                    this.append(this.twin)
                }
                this.input.removeAttribute('name')
                this.twin.disabled = this.disabled
                this.twin.value = this._value
            } else {
                this.twin?.remove()
                this.twin = null
                if (this.fieldName)
                    this.input.setAttribute('name', this.fieldName)
            }
        }

        // below the breakpoint the native date input takes over
        applyMode(force = false) {
            const mode = window.innerWidth < this.breakpoint ? 'mobile' : 'desktop'
            if (!force && mode === this.mode)
                return
            this.mode = mode
            this.setAttribute('mode', mode)
            if (mode === 'mobile') {
                this.panel.hidePopover()
                this.trigger.hidden = true
                this.input.setAttribute('type', 'date')
            } else {
                this.trigger.hidden = false
                this.input.setAttribute('type', 'text')
            }
            this.renderField()
            this.broadcastEvent('as-date-picker:breakpoint', { id: this.datePickerId, breakpoint: mode })
        }

        // typing in the field -------------------------------------------------------------

        commitText() {
            const text = this.input.value.trim()
            // nothing typed since the last commit: leave the calendar alone, rebuilding it on blur would swallow a click on a day
            if (text === (this.mode === 'mobile' ? this._value : this.format(this._value)))
                return
            if (text === '') {
                this.setValue('', true)
                return
            }
            const iso = this.mode === 'mobile' ? text : this.parseText(text)
            if (!parseISO(iso || '')) {
                this.markInvalid(`Enter a valid date (${this.formatHint})`)
                return
            }
            if (!this.inRange(iso)) {
                this.markInvalid(this.min && this.max
                    ? `Choose a date between ${this.format(this.min)} and ${this.format(this.max)}`
                    : this.min ? `Choose ${this.format(this.min)} or later` : `Choose ${this.format(this.max)} or earlier`)
                return
            }
            this.setValue(iso, true)
        }

        markInvalid(message) {
            this.input.setAttribute('aria-invalid', 'true')
            this.input.setCustomValidity(message)
        }

        onInputKey(e) {
            if (this.disabled)
                return
            if (e.key === 'ArrowDown' && e.altKey) {
                e.preventDefault()
                if (this.mode === 'desktop')
                    this.panel.showPopover()
                return
            }
            if (e.key === 'Enter') {
                this.commitText()
                return
            }
            // up / down step the date by one day, from today when the field is empty
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.mode === 'desktop') {
                e.preventDefault()
                const base = this._value || today()
                const next = this._value ? addDays(base, e.key === 'ArrowUp' ? 1 : -1) : base
                if (this.inRange(next))
                    this.setValue(next, true)
            }
        }

        // calendar -----------------------------------------------------------------------

        // which month is shown and which day is the roving focus target
        viewFrom(iso) {
            const date = parseISO(this.clamp(iso)) || new Date()
            this.view = { year: date.getFullYear(), month: date.getMonth() }
            this.focusDate = fromDate(date)
        }

        pick(iso) {
            this.setValue(iso, true)
            this.panel.hidePopover()
            this.input.focus()
        }

        // the remembered day when it belongs to the shown month, else the first of the month
        anchorDate() {
            const date = parseISO(this.focusDate)
            const inView = date && date.getMonth() === this.view.month && date.getFullYear() === this.view.year
            return inView ? this.focusDate : toISO(this.view.year, this.view.month, 1)
        }

        moveMonth(delta) {
            const anchor = this.anchorDate()
            this.showDate(this.clamp(addMonths(anchor, delta)))
        }

        // shows the month of the date and makes it the focus target
        showDate(iso, focus = false) {
            const date = parseISO(iso)
            this.focusDate = iso
            this.view = { year: date.getFullYear(), month: date.getMonth() }
            this.renderCalendar()
            if (focus)
                this.grid.querySelector('[tabindex="0"]')?.focus()
        }

        onToggle(e) {
            const open = e.newState === 'open'
            this.trigger.setAttribute('aria-expanded', String(open))
            if (open) {
                this.viewFrom(this._value || today())
                this.renderCalendar()
                this.grid.querySelector('[tabindex="0"]')?.focus()
            }
            this.broadcastEvent(open ? 'as-date-picker:open' : 'as-date-picker:closed', { id: this.datePickerId })
        }

        onGridKey(e) {
            const day = e.target.closest?.('button[data-date]')
            if (!day)
                return
            let next
            const current = day.dataset.date
            const date = parseISO(current)
            switch (e.key) {
                case 'ArrowLeft': next = addDays(current, -1); break
                case 'ArrowRight': next = addDays(current, 1); break
                case 'ArrowUp': next = addDays(current, -7); break
                case 'ArrowDown': next = addDays(current, 7); break
                case 'Home': next = addDays(current, -((date.getDay() - this.firstDay + 7) % 7)); break
                case 'End': next = addDays(current, 6 - ((date.getDay() - this.firstDay + 7) % 7)); break
                case 'PageUp': next = addMonths(current, e.shiftKey ? -12 : -1); break
                case 'PageDown': next = addMonths(current, e.shiftKey ? 12 : 1); break
                default: return
            }
            e.preventDefault()
            next = this.clamp(next)
            if (next === current)
                return
            const cell = this.grid.querySelector(`button[data-date="${next}"]`)
            if (cell && cell.hasAttribute('curr') && !cell.disabled) {
                // same month: only move the roving focus
                this.grid.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1')
                cell.setAttribute('tabindex', '0')
                this.focusDate = next
                cell.focus()
            } else {
                this.showDate(next, true)
            }
        }

        renderCalendar() {
            if (!this.grid)
                return
            const { year, month } = this.view
            const todayIso = today()

            this.renderHeader()

            // weekday names, starting on the first day of the week
            this.weekdays.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
                const cell = document.createElement('div')
                // 2023-08-06 is a Sunday
                cell.textContent = this.weekdayFormat.format(new Date(2023, 7, 6 + ((this.firstDay + i) % 7)))
                return cell
            }))

            const lead = (new Date(year, month, 1).getDay() - this.firstDay + 7) % 7
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const cells = Math.ceil((lead + daysInMonth) / 7) * 7

            const fragment = new DocumentFragment()
            let hasFocusTarget = false
            for (let i = 0; i < cells; i++) {
                const date = new Date(year, month, 1 - lead + i)
                const iso = fromDate(date)
                const button = document.createElement('button')
                button.type = 'button'
                button.textContent = date.getDate()
                button.dataset.date = iso
                button.setAttribute('aria-label', this.fullFormat.format(date))
                const offset = (date.getFullYear() * 12 + date.getMonth()) - (year * 12 + month)
                button.setAttribute(offset < 0 ? 'prev' : offset > 0 ? 'next' : 'curr', '')
                if (iso === todayIso) {
                    button.setAttribute('today', '')
                    button.setAttribute('aria-current', 'date')
                }
                button.setAttribute('aria-pressed', String(iso === this._value))
                if (iso === this._value)
                    button.setAttribute('selected', '')
                if (!this.inRange(iso))
                    button.disabled = true
                const target = iso === this.focusDate && !button.disabled
                button.setAttribute('tabindex', target ? '0' : '-1')
                hasFocusTarget ||= target
                fragment.append(button)
            }
            this.grid.setAttribute('aria-label', this.monthFormat.format(new Date(year, month, 1)))
            this.grid.replaceChildren(fragment)
            if (!hasFocusTarget) {
                // the remembered day is not in this grid or not selectable, fall back to the first enabled day of the month
                this.grid.querySelector('button[curr]:not([disabled])')?.setAttribute('tabindex', '0')
            }

            // month buttons and today are disabled when nothing can be reached
            const first = toISO(year, month, 1)
            const last = toISO(year, month, daysInMonth)
            this.prevButton.disabled = !!this.min && first <= this.min
            this.nextButton.disabled = !!this.max && last >= this.max
            this.prevButton.setAttribute('label', 'Previous month')
            this.nextButton.setAttribute('label', 'Next month')
            this.todayButton.text = this.todayText
            this.todayButton.disabled = !this.inRange(todayIso)
        }

        renderHeader() {
            const { year, month } = this.view
            const label = this.monthFormat.format(new Date(year, month, 1))
            if (!this.selects) {
                if (!this.monthLabel) {
                    this.monthLabel = document.createElement('div')
                    this.monthLabel.setAttribute('month-label', '')
                    this.monthLabel.setAttribute('aria-live', 'polite')
                }
                this.monthLabel.textContent = label
                this.header.removeAttribute('selects')
                this.header.replaceChildren(this.prevButton, this.monthLabel, this.nextButton)
                this.monthSelectWrap = this.yearSelectWrap = null
                return
            }

            // feature flag: month and year selects instead of the plain label
            this.header.setAttribute('selects', '')
            if (!this.monthSelectWrap) {
                this.yearRange = null
                this.monthSelectWrap = document.createElement('as-select')
                this.monthSelectWrap.setAttribute('month', '')
                this.monthSelect = document.createElement('select')
                this.monthSelect.setAttribute('aria-label', 'Month')
                for (let m = 0; m < 12; m++) {
                    const option = document.createElement('option')
                    option.value = m
                    option.text = this.monthNameFormat.format(new Date(2000, m, 1))
                    this.monthSelect.append(option)
                }
                this.monthSelectWrap.append(this.monthSelect)
                this.monthSelect.addEventListener('change', () => {
                    if (!this._syncing)
                        this.showDate(this.clamp(addMonths(this.anchorDate(), Number(this.monthSelect.value) - this.view.month)))
                })

                this.yearSelectWrap = document.createElement('as-select')
                this.yearSelectWrap.setAttribute('year', '')
                this.yearSelect = document.createElement('select')
                this.yearSelect.setAttribute('aria-label', 'Year')
                this.yearSelectWrap.append(this.yearSelect)
                this.yearSelect.addEventListener('change', () => {
                    if (!this._syncing)
                        this.showDate(this.clamp(addMonths(this.anchorDate(), (Number(this.yearSelect.value) - this.view.year) * 12)))
                })
                this.header.replaceChildren(this.monthSelectWrap, this.yearSelectWrap, this.prevButton, this.nextButton)
            }

            // year range: around today, but always includes the shown year and respects min / max
            const thisYear = new Date().getFullYear()
            let from = Math.min(thisYear - this.yearSpan, year)
            let to = Math.max(thisYear + this.yearSpan, year)
            if (this.min) from = Math.max(from, Number(this.min.slice(0, 4)))
            if (this.max) to = Math.min(to, Number(this.max.slice(0, 4)))
            const rangeKey = `${from}-${to}`
            if (this.yearRange !== rangeKey) {
                this.yearRange = rangeKey
                this.yearSelect.replaceChildren(...Array.from({ length: to - from + 1 }, (_, i) => {
                    const option = document.createElement('option')
                    option.value = from + i
                    option.text = from + i
                    return option
                }))
                // an as-select that is already built needs telling about the new options, one that is not will read them itself
                if (this.yearSelectWrap.ready)
                    this.yearSelectWrap.setAttribute('updated', '')
            }

            // selects mirror the shown month; as-select refreshes its text on a change event
            this._syncing = true
            if (this.monthSelect.value !== String(month)) {
                this.monthSelect.value = month
                this.monthSelect.dispatchEvent(new Event('change'))
            }
            if (this.yearSelect.value !== String(year)) {
                this.yearSelect.value = year
                this.yearSelect.dispatchEvent(new Event('change'))
            }
            this._syncing = false
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
})
