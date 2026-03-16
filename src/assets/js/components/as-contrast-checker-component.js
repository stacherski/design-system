document.addEventListener('DOMContentLoaded', () => {
    if (window.customElements.get('as-contrast-checker') === undefined) {
        class ASContrastChecker extends HTMLElement {
            connectedCallback() {
                this.text = this.getAttribute('text') || this.innerText || 'Lorem ipsum dolor sit amet'

                this.contrastCheckerId = this.getAttribute("id") || "default";

                this.innerHTML = `
                <div class="controls">
                    <input type="color" name="bgcolor"/>
                    <button>&harr;</button>
                    <input type="color" value="#ffffff" name="textcolor"/>
                </div>
                <div class="bg">
                    <div class="text">${this.text}</div>
                </div>
                <div class="contrast"></div>
                <button class="save">Save colour pair</button>
                <div class="saved"></div>
                <br/>
                <p>Add your own colours to the box below, #RRGGBB, coma separated, click <b><code>Update colours</code></b> button to see list of all unique colour combinations.</p>
                <textarea></textarea>
                <button class="update">Update colours</button>
                `

                this.colourPairs = JSON.parse(localStorage.getItem(`colourPairs-${this.contrastCheckerId}`)) || [];

                this.bg = this.querySelector('.bg')
                this.text = this.querySelector('.text')
                this.contrast = this.querySelector('.contrast')
                this.swap = this.querySelector('.controls button')
                this.textarea = this.querySelector('textarea')
                this.updateBtn = this.querySelector('button.update')

                this.bgcolor = this.querySelector('input[type="color"][name="bgcolor"]')
                this.textcolor = this.querySelector('input[type="color"][name="textcolor"]')

                this.saved = this.querySelector('.saved')
                this.saveBtn = this.querySelector('button.save')

                this.bgcolor.addEventListener('change', color => {
                    this.bg.style.setProperty('--bgcolor', color.target.value)
                    this.calculateRatio(color.target.value, this.textcolor.value)
                })
                this.textcolor.addEventListener('change', color => {
                    this.text.style.setProperty('--textcolor', color.target.value)
                    console.log(this.bgcolor.value, color.target.value)
                    this.calculateRatio(this.bgcolor.value, color.target.value)
                })

                this.swap.addEventListener('click', () => {
                    const bgcolor = this.bgcolor.value
                    this.bgcolor.value = this.textcolor.value
                    this.textcolor.value = bgcolor
                    this.bg.style.setProperty('--bgcolor', this.bgcolor.value)
                    this.text.style.setProperty('--textcolor', this.textcolor.value)
                    this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                })

                this.saveBtn.addEventListener('click', () => {
                    this.saveColourPair(this.bgcolor.value, this.textcolor.value)
                })

                this.updateBtn.addEventListener('click', () => {
                    const coloursSet = this.textarea.value.replace(/[\n\s]/g, '').split(',') || []
                    const colourPairs = this.generateColourPairs(coloursSet)
                    this.colourPairs = []
                    colourPairs.forEach(pair => {
                        this.saveColourPair(pair.bg, pair.text)
                        this.bgcolor.value = pair.bg
                        this.textcolor.value = pair.text
                    })
                })
                this.calculateRatio(this.bgcolor.value, this.textcolor.value)
                this.renderSavedColours()
            }

            generateColoursSet() {
                const colourPairs = this.colourPairs
                const coloursSet = new Set()
                colourPairs.forEach(colour => {
                    coloursSet.add(colour.bg).add(colour.text)
                })
                this.textarea.value = [...coloursSet].join(',')
                return coloursSet
            }

            generateColourPairs(coloursSet) {
                const colourPairsSet = new Set();
                const c = [...coloursSet]
                for (let t = 0; t < c.length; t++) {
                    for (let b = t + 1; b < c.length; b++) {
                        colourPairsSet.add({ "bg": c[b], "text": c[t] })
                    }
                }
                return colourPairsSet
            }

            saveColourPair(bg, text) {
                const colourPairs = this.colourPairs
                colourPairs.push({ "bg": bg, "text": text, "ratio": this.calculateRatio(bg, text) })
                this.colourPairs = colourPairs
                localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(colourPairs))
                this.renderSavedColours()
            }

            renderSavedColours() {
                if (!this.colourPairs.length)
                    return
                this.saved.innerHTML = ''
                this.colourPairs.forEach((pair, index) => {
                    const colourPairWrapper = document.createElement('div')
                    colourPairWrapper.innerHTML = `
                        <div style="background-color: ${pair.text}; color: ${pair.bg}">BG:<br/>${pair.bg}</div><div style="background-color: ${pair.bg}; color: ${pair.text}">Text:<br/>${pair.text}</div><div style="border: 1px solid #000000; align-content: center; ${(pair.ratio < 3) ? 'color: #f00;' : ''}">Ratio:<br/>${pair.ratio}:1</div>
                    `
                    const removePairBtn = document.createElement('button')
                    removePairBtn.innerText = '×'
                    removePairBtn.addEventListener('click', () => {
                        this.colourPairs.splice(index, 1)
                        colourPairWrapper.remove();
                        localStorage.setItem(`colourPairs-${this.contrastCheckerId}`, JSON.stringify(this.colourPairs))
                        this.renderSavedColours()
                    })

                    colourPairWrapper.append(removePairBtn)
                    this.saved.prepend(colourPairWrapper)
                })
                this.generateColoursSet()
                this.generateColourPairs(this.generateColoursSet())
            }

            calculateRatio(bg, text) {
                const ratio = this.getContrastRatioForHex(bg, text)

                let level = ''
                this.saveBtn.removeAttribute('disabled')
                if (ratio < 3) {
                    level = 'DNP'
                    this.saveBtn.setAttribute('disabled', '')
                    this.contrast.setAttribute('pass', 'DNP')
                }
                if (ratio >= 3) {
                    level = 'AA18'
                    this.contrast.setAttribute('pass', 'AA18')
                }
                if (ratio >= 4.5) {
                    level = 'AA'
                    this.contrast.setAttribute('pass', 'AA')
                }
                if (ratio >= 7) {
                    level = 'AAA'
                    this.contrast.setAttribute('pass', 'AAA')
                }

                this.contrast.textContent = `${ratio}:1`
                return ratio
            }



            ////////////////////////////////////////////
            // MIT Licensed functions courtesty of Qambar Raza
            // https://github.com/Qambar/color-contrast-checker/blob/master/src/colorContrastChecker.js
            rgbClass = {
                toString: function () {
                    return "<r: " + this.r + " g: " + this.g + " b: " + this.b + " >"
                },
            };

            getRGBFromHex(color) {
                var rgb = Object.create(this.rgbClass),
                    rVal,
                    gVal,
                    bVal

                if (typeof color !== "string")
                    throw new Error("must use string")

                rVal = parseInt(color.slice(1, 3), 16)
                gVal = parseInt(color.slice(3, 5), 16)
                bVal = parseInt(color.slice(5, 7), 16)

                rgb.r = rVal
                rgb.g = gVal
                rgb.b = bVal

                return rgb
            }

            calculateSRGB(rgb) {
                var sRGB = Object.create(this.rgbClass),
                    key

                for (key in rgb) {
                    if (rgb.hasOwnProperty(key))
                        sRGB[key] = parseFloat(rgb[key] / 255, 10)
                }

                return sRGB
            }

            calculateLRGB(rgb) {
                var sRGB = this.calculateSRGB(rgb)
                var lRGB = Object.create(this.rgbClass),
                    key,
                    val = 0

                for (key in sRGB) {
                    if (sRGB.hasOwnProperty(key)) {
                        val = parseFloat(sRGB[key], 10)
                        if (val <= 0.03928)
                            lRGB[key] = val / 12.92
                        else
                            lRGB[key] = Math.pow((val + 0.055) / 1.055, 2.4)
                    }
                }

                return lRGB
            }

            calculateLuminance(lRGB) {
                return 0.2126 * lRGB.r + 0.7152 * lRGB.g + 0.0722 * lRGB.b
            }

            getContrastRatio(lumA, lumB) {
                var ratio, lighter, darker;

                if (lumA >= lumB) {
                    lighter = lumA;
                    darker = lumB;
                } else {
                    lighter = lumB;
                    darker = lumA;
                }

                ratio = (lighter + 0.05) / (darker + 0.05);

                return ratio.toFixed(1);
            }

            getContrastRatioForHex(foregroundColor, backgroundColor) {
                var color1 = this.getRGBFromHex(foregroundColor),
                    color2 = this.getRGBFromHex(backgroundColor),
                    l1RGB = this.calculateLRGB(color1),
                    l2RGB = this.calculateLRGB(color2),
                    l1 = this.calculateLuminance(l1RGB),
                    l2 = this.calculateLuminance(l2RGB)

                return this.getContrastRatio(l1, l2)
            }

            rgb2hex(rgb) {
                if (/^#[0-9A-F]{6}$/i.test(rgb))
                    return rgb

                rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

                function hex(x) {
                    return ("0" + parseInt(x, 10).toString(16)).slice(-2);
                }
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }

        }
        // register new custom element
        window.customElements.define("as-contrast-checker", ASContrastChecker)
    }
})