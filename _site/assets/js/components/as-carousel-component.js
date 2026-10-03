document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-carousel')) return

    class ASCarousel extends HTMLElement {
        static get observedAttributes() {
            return ['gap', 'delay', 'speed']
        }

        connectedCallback() {
            this.gap = 16
            this.delay = 3
            this.speed = 200
            this.autorotate = false

            this.velocity = 0
            this.lastX = 0
            this.lastTime = 0
            this.inertiaFrame = null

            this.isDragging = false

            this._onResize = this.resize.bind(this)
            this._onPointerMove = this.dragAction.bind(this)
            this._onPointerUp = this.dragEnd.bind(this)
            this._onWheel = this.dragStart.bind(this)

            this.carouselId = this.getAttribute('id') || 'as-carousel-' + crypto.randomUUID()
            if (!this.getAttribute('id')) this.setAttribute('id', this.carouselId)

            this.slideIdentifier = this.getAttribute('slideid') || 'item'
            this.gap = Number(this.getAttribute('gap')) || 16
            this.delay = Number(this.getAttribute('delay')) || 3
            this.speed = Number(this.getAttribute('speed')) || 200
            this.autorotate = this.hasAttribute('autorotate')

            const content = this.innerHTML

            this.innerHTML = `
                <div class="slider">
                    ${content}
                    <div class="controls">
                        <button class="btn"><as-icon name="arrow-right" flip-x></as-icon>Prev</button>
                        <button class="btn">Next<as-icon name="arrow-right"></as-icon></button>
                    </div>
                </div>
                <button class="btn" id="playpause">Play</button>
            `

            this.sliderRoot = this.querySelector('div.slider')
            this.slider = this.sliderRoot.querySelector('ul')
            this.playpausebutton = this.querySelector('#playpause')
            this.prevbutton = this.querySelector('.controls button:first-child')
            this.nextbutton = this.querySelector('.controls button:last-child')

            this.init()
        }

        disconnectedCallback() {
            window.removeEventListener('resize', this._onResize)
            document.removeEventListener('pointermove', this._onPointerMove)
            document.removeEventListener('pointerup', this._onPointerUp)
            this.sliderRoot.removeEventListener('wheel', this._onWheel)

            cancelAnimationFrame(this.inertiaFrame)
            clearInterval(this.rotateInterval)
            clearTimeout(this.autostart)
        }

        attributeChangedCallback() {
            this.resize()
        }

        init() {
            window.addEventListener('resize', this._onResize)
            this.removeAttribute('hidden')

            this.prevbutton.addEventListener('click', () => {
                this.abortInertia()
                this.step(0)
                if (this.autorotate) this.pause()
            })

            this.nextbutton.addEventListener('click', () => {
                this.abortInertia()
                this.step(1)
                if (this.autorotate) this.pause()
            })

            this.playpausebutton.addEventListener('click', () =>
                this.autorotate ? this.pause() : this.autoplay()
            )

            this.sliderRoot.addEventListener('pointerdown', e => this.dragStart(e))
            this.sliderRoot.addEventListener('wheel', this._onWheel, { passive: false })

            if (!this.hasAttribute('cloned')) {
                this.cloneSlides(this.slider)
                this.setAttribute('cloned', '')
            }

            this.resize()

            if (this.autorotate) {
                this.autostart = setTimeout(() => this.autoplay(), this.delay * 1000)
                this.playpausebutton.textContent = 'Pause'
            }
        }

        resize() {
            const slide = this.slider.querySelector(`[${this.slideIdentifier}]`)
            if (!slide) return

            this.slideWidth = slide.getBoundingClientRect().width
            const count = this.slider.querySelectorAll(`[${this.slideIdentifier}]`).length
            this.sliderWidth = (this.slideWidth + this.gap) * count - this.gap
            this.maxLeft = this.sliderWidth / 3
            this.slider.style.left = -this.maxLeft + 'px'
        }

        autoplay() {
            this.autorotate = true
            this.autoRotate(1, this.delay)
            this.dispatchEvent(new CustomEvent('as-carousel:play', { bubbles: true }))
        }

        pause() {
            this.autorotate = false
            clearInterval(this.rotateInterval)
            clearTimeout(this.autostart)
            this.playpausebutton.textContent = 'Play'
            this.dispatchEvent(new CustomEvent('as-carousel:pause', { bubbles: true }))
        }

        abortInertia() {
            cancelAnimationFrame(this.inertiaFrame)
            this.velocity = 0
            this.isDragging = false
        }

        dragStart(evt) {
            if (evt.type === 'wheel') {
                evt.preventDefault()
                this.abortInertia()
                this.step(evt.deltaX > 0 ? 1 : 0)
                if (this.autorotate) this.pause()
                return
            }

            this.abortInertia()
            this.isDragging = true
            this.lastX = evt.clientX
            this.lastTime = performance.now()

            document.addEventListener('pointermove', this._onPointerMove)
            document.addEventListener('pointerup', this._onPointerUp)

            if (this.autorotate) this.pause()
        }

        dragAction(evt) {
            if (!this.isDragging) return

            const now = performance.now()
            const dx = evt.clientX - this.lastX
            const dt = now - this.lastTime || 1

            this.velocity = dx / dt
            this.lastX = evt.clientX
            this.lastTime = now

            this.slider.style.transitionDuration = '0ms'
            this.slider.style.left =
                (parseFloat(this.slider.style.left) + dx) + 'px'

            evt.preventDefault()
        }

        dragEnd() {
            this.isDragging = false
            document.removeEventListener('pointermove', this._onPointerMove)
            document.removeEventListener('pointerup', this._onPointerUp)
            this.applyInertia()
        }

        applyInertia() {
            const friction = 0.92

            const step = () => {
                if (Math.abs(this.velocity) < 0.02) {
                    this.snapWithVelocity()
                    return
                }

                this.velocity *= friction
                this.slider.style.left =
                    (parseFloat(this.slider.style.left) + this.velocity * 16) + 'px'

                this.inertiaFrame = requestAnimationFrame(step)
            }

            this.inertiaFrame = requestAnimationFrame(step)
        }

        snapWithVelocity() {

            const absV = Math.abs(this.velocity)
            if (absV === 0) return

            const dir = this.velocity < 0 ? 1 : 0
            let slides = 1

            if (absV > 0.005) slides = 2
            if (absV > 0.01) slides = 3
            if (absV > 0.02) slides = 4

            console.log('s', slides)
            for (let i = 0; i < slides; i++)
                this.step(dir)
        }

        step(dir) {
            this.moveSlide(dir)
        }

        cloneSlides(slider) {
            const slides = [...slider.querySelectorAll(`[${this.slideIdentifier}]`)]
            slides.forEach(s => slider.appendChild(s.cloneNode(true)))
            slides.forEach(s => slider.appendChild(s.cloneNode(true)))
        }

        autoRotate(dir, delay) {
            this.step(dir)
            this.rotateInterval = setInterval(() => this.step(dir), delay * 1000)
            this.playpausebutton.textContent = 'Pause'
        }

        moveSlide(dir) {
            console.log('slide')
            const slides = this.slider.querySelectorAll(`[${this.slideIdentifier}]`)
            this.slider.style.transitionDuration = `${this.speed}ms`

            if (dir) {
                this.slider.appendChild(slides[0].cloneNode(true))
                this.slider.style.left =
                    (-this.maxLeft - this.gap - this.slideWidth) + 'px'

                setTimeout(() => {
                    slides[0].remove()
                    this.resetPosition()
                }, this.speed)
            }
            else {
                this.slider.style.left =
                    (-this.maxLeft + this.gap + this.slideWidth) + 'px'

                setTimeout(() => {
                    this.slider.insertBefore(
                        slides[slides.length - 1].cloneNode(true),
                        slides[0]
                    )
                    slides[slides.length - 1].remove()
                    this.resetPosition()
                }, this.speed)
            }
        }

        resetPosition() {
            this.slider.style.transitionDuration = '0ms'
            this.slider.style.left = -this.maxLeft + 'px'
        }
    }

    window.customElements.define('as-carousel', ASCarousel)
})