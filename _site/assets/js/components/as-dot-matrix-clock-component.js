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