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