document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-carousel')) return

    const MOBILE = window.matchMedia('(max-width: 47.9375rem)')
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)')

    class ASCarousel extends HTMLElement {
        static get observedAttributes() {
            return ['per-view', 'per-view-mobile', 'gap', 'controls', 'controls-align', 'loop', 'autoplay', 'label']
        }

        constructor() {
            super()
            this.ready = false
            this.index = 0
            this.playing = false
            this._onScroll = () => this.scheduleUpdate()
            this._onResize = () => this.update()
            this._onKeydown = e => this.handleKeydown(e)
            this._onVisibility = () => document.hidden ? this.stopTimer() : this.startTimer()
        }

        connectedCallback() {
            if (!this.ready) {
                this.ready = true
                this.build()
            }
            // global listeners live while connected
            window.addEventListener('resize', this._onResize)
            document.addEventListener('visibilitychange', this._onVisibility)
            MOBILE.addEventListener('change', this._onResize)
            this.update()
            if (this.playing)
                this.startTimer()
        }

        disconnectedCallback() {
            window.removeEventListener('resize', this._onResize)
            document.removeEventListener('visibilitychange', this._onVisibility)
            MOBILE.removeEventListener('change', this._onResize)
            this.stopTimer()
            cancelAnimationFrame(this.frame)
        }

        attributeChangedCallback() {
            // attributes are also reported while the element is upgraded, before it is built
            if (!this.ready || !this.track)
                return
            this.configure()
            this.renderControls()
            this.update()
        }

        // settings come from attributes, read fresh on every change
        configure() {
            const num = (name, fallback) => Number(this.getAttribute(name)) || fallback
            this.perView = Math.max(1, num('per-view', 1))
            this.perViewMobile = Math.max(1, num('per-view-mobile', 1))
            this.gap = this.hasAttribute('gap') ? Number(this.getAttribute('gap')) || 0 : 16
            this.controls = this.getAttribute('controls') || 'arrows'
            this.align = this.getAttribute('controls-align') || 'end'
            this.loop = this.hasAttribute('loop')
            // autoplay: seconds between slides, bare attribute means 5s
            this.autoplay = this.hasAttribute('autoplay') ? (Number(this.getAttribute('autoplay')) || 5) : 0
            this.slideId = this.getAttribute('slideid') || 'item'

            this.style.setProperty('--as-carousel-per-view', this.perView)
            this.style.setProperty('--as-carousel-per-view-mobile', this.perViewMobile)
            this.style.setProperty('--as-carousel-gap', `${this.gap}px`)
            this.style.setProperty('--as-carousel-delay', `${this.autoplay}s`)

            this.setAttribute('role', 'group')
            this.setAttribute('aria-roledescription', 'carousel')
            const label = this.getAttribute('label')
            label ? this.setAttribute('aria-label', label) : this.removeAttribute('aria-label')
        }

        build() {
            this.removeAttribute('hidden')
            this.configure()

            // the track is the list of slides, or everything inside when there is no list
            this.track = this.querySelector(':scope > ul, :scope > ol')
            if (!this.track) {
                this.track = document.createElement('div')
                this.track.append(...this.childNodes)
                this.append(this.track)
            }
            this.track.classList.add('as-carousel__track')
            this.track.setAttribute('tabindex', '0')
            this.track.addEventListener('scroll', this._onScroll, { passive: true })
            this.track.addEventListener('scrollend', () => { this.pending = null; this.update() })
            this.track.addEventListener('keydown', this._onKeydown)
            // pointer interaction pauses the rotation, as does keyboard focus
            this.addEventListener('pointerenter', () => this.hold(true))
            this.addEventListener('pointerleave', () => this.hold(false))
            this.addEventListener('focusin', () => this.hold(true))
            this.addEventListener('focusout', () => this.hold(false))

            this.slides = [...this.track.querySelectorAll(`:scope > [${this.slideId}]`)]
            if (!this.slides.length)
                this.slides = [...this.track.children]
            this.slides.forEach((slide, i) => {
                slide.setAttribute('role', 'group')
                slide.setAttribute('aria-roledescription', 'slide')
                slide.setAttribute('aria-label', `${i + 1} of ${this.slides.length}`)
            })

            // autoplay never starts for people who asked for less motion
            this.playing = this.autoplay > 0 && !REDUCED_MOTION.matches

            this.controlsEl = document.createElement('div')
            this.append(this.controlsEl)
            this.renderControls()
            this.broadcastEvent('as-carousel:created', { id: this.id, slides: this.slides.length })
        }

        renderControls() {
            const el = this.controlsEl
            el.className = 'as-carousel__controls'
            el.setAttribute('data-align', this.align)
            el.replaceChildren()
            el.hidden = this.controls === 'none'

            const wantsArrows = this.controls === 'arrows' || this.controls === 'both'
            const wantsDots = this.controls === 'dots' || this.controls === 'both'

            if (wantsDots) {
                this.dotsEl = document.createElement('div')
                this.dotsEl.className = 'as-carousel__dots'
                this.dotsEl.setAttribute('role', 'group')
                this.dotsEl.setAttribute('aria-label', 'Slides')
                el.append(this.dotsEl)
            } else
                this.dotsEl = null

            this.prevBtn = this.nextBtn = null
            if (wantsArrows) {
                this.prevBtn = this.makeButton('--as-icon-chevron-left', 'Previous', () => this.userStep(-1))
                this.nextBtn = this.makeButton('--as-icon-chevron-right', 'Next', () => this.userStep(1))
                el.append(this.prevBtn, this.nextBtn)
            }

            this.playBtn = null
            if (this.autoplay) {
                this.playBtn = document.createElement('as-button')
                this.playBtn.setAttribute('button-class', 'as-carousel__control as-carousel__play')
                this.playBtn.innerHTML = '<span class="as-carousel__glyph"></span>'
                this.playBtn.addEventListener('click', () => this.toggle())
                el.append(this.playBtn)
            }
            this.syncPlayButton()
        }

        makeButton(icon, label, handler) {
            const btn = document.createElement('as-button')
            btn.setAttribute('button-class', 'as-carousel__control')
            btn.setAttribute('size', 'm')
            btn.setAttribute('icon-name', icon)
            btn.setAttribute('label', label)
            btn.addEventListener('click', handler)
            return btn
        }

        // slides visible at once for the current viewport
        get visible() {
            return Math.min(MOBILE.matches ? this.perViewMobile : this.perView, this.slides.length)
        }

        get lastIndex() {
            return Math.max(0, this.slides.length - this.visible)
        }

        slideLeft(i) {
            return this.slides[i].offsetLeft - parseFloat(getComputedStyle(this.track).paddingInlineStart || 0)
        }

        scheduleUpdate() {
            cancelAnimationFrame(this.frame)
            this.frame = requestAnimationFrame(() => this.update())
        }

        // works out the current position from the scroll offset
        update() {
            if (!this.slides?.length)
                return
            const max = this.track.scrollWidth - this.track.clientWidth
            let index = this.lastIndex
            if (this.track.scrollLeft < max - 1) {
                let best = Infinity
                this.slides.slice(0, this.lastIndex + 1).forEach((_, i) => {
                    const d = Math.abs(this.slideLeft(i) - this.track.scrollLeft)
                    if (d < best) { best = d; index = i }
                })
            }
            const changed = index !== this.index
            this.index = index
            this.renderState()
            if (changed)
                this.broadcastEvent('as-carousel:change', { id: this.id, index })
        }

        renderState() {
            const atStart = this.index <= 0
            const atEnd = this.index >= this.lastIndex
            if (this.prevBtn) this.prevBtn.disabled = atStart && !this.loop
            if (this.nextBtn) this.nextBtn.disabled = atEnd && !this.loop

            // slides outside the viewport are hidden from assistive technology and the tab order
            this.slides.forEach((slide, i) => {
                const visible = i >= this.index && i < this.index + this.visible
                visible ? slide.removeAttribute('inert') : slide.setAttribute('inert', '')
            })

            if (this.dotsEl) {
                const count = this.lastIndex + 1
                if (this.dotsEl.children.length !== count) {
                    this.dotsEl.replaceChildren(...Array.from({ length: count }, (_, i) => {
                        const dot = document.createElement('button')
                        dot.type = 'button'
                        dot.className = 'as-carousel__dot'
                        dot.setAttribute('aria-label', `Slide ${i + 1}`)
                        dot.addEventListener('click', () => { this.userPause(); this.goTo(i) })
                        return dot
                    }))
                }
                ;[...this.dotsEl.children].forEach((dot, i) => i === this.index ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'))
            }
        }

        goTo(index, behavior = 'smooth') {
            if (!this.slides.length)
                return
            let target = index
            if (target > this.lastIndex) target = this.loop || this.autoplay ? 0 : this.lastIndex
            if (target < 0) target = this.loop ? this.lastIndex : 0
            // rapid clicks continue from where the running scroll is heading, not from where it currently is
            this.pending = target
            clearTimeout(this.pendingTimer)
            this.pendingTimer = setTimeout(() => { this.pending = null }, 1500)
            this.track.scrollTo({ left: this.slideLeft(target), behavior: REDUCED_MOTION.matches ? 'auto' : behavior })
        }

        step(dir) {
            // loops: past the last position goes back to the first, and the other way round
            this.goTo((this.pending ?? this.index) + dir)
        }

        userStep(dir) {
            this.userPause()
            this.step(dir)
        }

        handleKeydown(e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); this.userStep(1) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); this.userStep(-1) }
            else if (e.key === 'Home') { e.preventDefault(); this.userPause(); this.goTo(0) }
            else if (e.key === 'End') { e.preventDefault(); this.userPause(); this.goTo(this.lastIndex) }
        }

        // autoplay ---------------------------------------------------------------

        toggle() {
            this.playing ? this.pause() : this.play()
        }

        play() {
            if (!this.autoplay)
                return
            this.playing = true
            this.startTimer()
            this.syncPlayButton()
            this.broadcastEvent('as-carousel:play', { id: this.id })
        }

        pause() {
            this.playing = false
            this.stopTimer()
            this.syncPlayButton()
            this.broadcastEvent('as-carousel:pause', { id: this.id })
        }

        // using any control stops the rotation, the play button resumes it
        userPause() {
            if (this.playing)
                this.pause()
        }

        // hovering or focusing the carousel holds the timer without changing the play state
        hold(on) {
            this.held = on
            on ? this.stopTimer() : this.startTimer()
        }

        startTimer() {
            this.stopTimer()
            if (!this.playing || this.held || document.hidden || !this.autoplay)
                return
            this.restartProgress()
            this.timer = setInterval(() => { this.step(1); this.restartProgress() }, this.autoplay * 1000)
        }

        stopTimer() {
            clearInterval(this.timer)
            this.timer = null
            this.playBtn?.removeAttribute('data-ticking')
        }

        // the ring around the play button fills over one slide duration
        restartProgress() {
            if (!this.playBtn)
                return
            this.playBtn.removeAttribute('data-ticking')
            void this.playBtn.offsetWidth
            this.playBtn.setAttribute('data-ticking', '')
        }

        syncPlayButton() {
            if (!this.playBtn)
                return
            this.playBtn.setAttribute('data-state', this.playing ? 'playing' : 'paused')
            this.playBtn.setAttribute('label', this.playing ? 'Pause automatic scrolling' : 'Start automatic scrolling')
            // a moving carousel must not announce every change
            this.track.setAttribute('aria-live', this.playing ? 'off' : 'polite')
        }

        broadcastEvent(name, detail = {}) {
            this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
        }
    }

    window.customElements.define('as-carousel', ASCarousel)
})
