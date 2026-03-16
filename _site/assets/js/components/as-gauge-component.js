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