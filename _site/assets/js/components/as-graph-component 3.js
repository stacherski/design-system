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