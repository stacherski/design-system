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
                // console.log(cEvent)
            }

        }
        window.customElements.define("as-table-actions", ASTableActions)
    }
})