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
                                e.preventDefault()
                                heading.searchWord = e.target.value
                                this.filterTable()
                            })
                            input.addEventListener('submit', e => {
                                e.preventDefault()
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
                // console.log(cEvent)
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