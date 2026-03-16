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