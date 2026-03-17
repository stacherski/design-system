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