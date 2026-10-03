if (!window.AS.Toast) {
    class Toast {
        constructor(message, options) {
            this.message = message
            this.type = options?.type || 'info'
            this.timeout = options?.timeout || 3000
            this.sticky = options?.sticky || false

            this.toastWrapper = document.querySelector('.toast-wrapper')
            if (!this.toastWrapper) {
                this.toastWrapper = document.createElement('div')
                this.toastWrapper.classList.add('toast-wrapper')
                this.toastWrapper.setAttribute('role', 'region')
                this.toastWrapper.setAttribute('aria-live', 'polite')
                document.querySelector('body').append(this.toastWrapper)
            }

            this.render()
        }

        render() {
            const toast = document.createElement('div')
            toast.classList.add('toast')
            toast.classList.add(this.type)
            toast.textContent = this.message
            toast.setAttribute('role', 'alert')
            toast.setAttribute('aria-label', this.type)

            toast.style.setProperty('--delay', Math.round(this.timeout / 1000) + 's')
            this.toastWrapper.prepend(toast)

            const gauge = document.createElement('as-gauge')
            gauge.textContent = Math.round(this.timeout / 1000)
            gauge.setAttribute('size', 1.5)
            gauge.setAttribute('delay', 0)
            //gauge.setAttribute('speed',-1)
            gauge.setAttribute('max', Math.round(this.timeout / 1000))

            if (this.sticky) {
                toast.style.animationName = 'unset'
                const close = document.createElement('button')
                const icon = document.createElement('as-icon')
                icon.setAttribute('name', 'plus')
                icon.setAttribute('rotate', '45deg')
                close.append(icon)
                close.addEventListener('click', () => {
                    toast.style.animationName = 'fadeout'
                    toast.style.setProperty('--delay', '0s')
                    setTimeout(() => toast.remove(), 1000)
                })
                toast.append(close)
            } else {
                toast.prepend(gauge)
                let val = Math.round(this.timeout / 1000)
                setInterval(() => {
                    val--
                    gauge.querySelector('div:first-child').style.setProperty('--gauge-value', val)
                    gauge.querySelector('div:last-child').setAttribute('data-value', val)
                }, 1000)
                setTimeout(() => toast.remove(), this.timeout + 1000)
            }
        }

    }

    window.AS.Toast = Toast
    window.Toast = Toast
}