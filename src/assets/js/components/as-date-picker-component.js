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