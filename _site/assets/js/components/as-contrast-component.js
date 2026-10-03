if (!window.AS.ASContrast) {
    class ASContrast {
        constructor(el, colours) {
            this.el = el
            this.colours = colours | []
            this.init()
        }

        init() {
            // get HEX value from computed styles of the element
            const bg = this.rgbToHex(this.srgbToRgb(window.getComputedStyle(this.el)['background-color']))

            // put calculated HEX colur value into P tag below element
            if (this.el.parentNode.querySelector('p'))
                this.el.parentNode.querySelector('p').textContent = bg
            else {
                const p = document.createElement('p')
                p.textContent = bg
                this.el.after(p)
            }
            colours.forEach(colour => {
                const cbox = document.createElement('div')
                cbox.style.backgroundColor = (colour.includes('--')) ? `var(${colour})` : colour
                cbox.setAttribute('hidden', '')
                this.el.append(cbox)

                const c = (colour.includes('--')) ? this.rgbToHex(this.srgbToRgb(window.getComputedStyle(cbox)['background-color'])) : colour

                cbox.remove()

                const ratio = this.getContrastRatioForHex(c, bg)
                if (ratio < 3)
                    return

                const info = document.createElement('div')
                info.classList.add('color-accent')
                info.setAttribute('title', 'Click to copy token')
                info.textContent = `${ratio} (${colour})`
                info.style.setProperty('--color', c)

                info.addEventListener('click', () => {
                    navigator.clipboard.writeText(colour)
                        .then(() => new Toast(`'${colour}' copied`, 1.5))
                        .catch(err => new Toast(`Failed to copy: ${err}`))
                })
                this.el.append(info)
            })

        }

        srgbToRgb(srgbString) {
            if (!srgbString.includes('srgb'))
                return srgbString
            // Use a regex to extract the float values
            const srgbValues = srgbString.match(/[\d.]+/g).map(Number);

            if (srgbValues.length < 3) {
                throw new Error('Invalid srgb string format');
            }

            const [sR, sG, sB] = srgbValues;

            const toRgb = (s) => {
                // The sRGB to linear RGB conversion formula
                if (s <= 0.04045)
                    return (s / 12.92);
                else
                    return Math.pow((s + 0.055) / 1.055, 2.4);
            };

            const r = Math.round(toRgb(sR) * 255);
            const g = Math.round(toRgb(sG) * 255);
            const b = Math.round(toRgb(sB) * 255);

            return `rgb(${r}, ${g}, ${b})`;
        }
        rgbToHex(rgbString) {
            // Use a regex to extract the numbers from the rgb string
            const rgb = rgbString.match(/\d+/g);

            if (!rgb || rgb.length < 3)
                return null;

            // Convert each number to a two-digit hexadecimal string
            const toHex = (c) => parseInt(c).toString(16).padStart(2, '0');

            // Map the array and join the results
            const hex = rgb.map(toHex).join('');

            return `#${hex}`;
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

    window.AS.ASContrast = ASContrast
    window.ASContrast = ASContrast

    const boxes = document.querySelectorAll('.colorbox:not(.exclude)')
    const colours = [
        '--as-color-accent',
        '--as-color-accent-strong',
        '--as-color-accent-weak',
        '--as-color-text',
        '--as-color-text-strong',
        '--as-color-text-weak',
        '--as-color-text-neutral',
        '--as-color-background-button',
        '--as-color-background-button-strong',
        '--as-color-background-button-weak',
        '--as-color-text-button',
        '--as-color-text-nav',
        '--as-color-text-nav-active',
        '--as-color-status-warning',
        '--as-color-status-warning-strong',
        '--as-color-status-warning-weak',
        '--as-color-status-error',
        '--as-color-status-error-strong',
        '--as-color-status-error-weak',
        '--as-color-status-success',
        '--as-color-status-success-strong',
        '--as-color-status-success-weak',
        '--as-color-status-neutral',
        '--as-color-status-neutral-strong',
        '--as-color-status-neutral-weak'
    ]
    boxes.forEach(box => {
        const contrast = new ASContrast(box, colours)
    })

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.token, .layouts legend .item').forEach(token => token.__myWidgetInstance ? null : new ASCopy(token))
    })
    document.addEventListener('as-svg-to-base:generated', () => {
        document.querySelectorAll('.token').forEach(token => token.__myWidgetInstance ? null : new ASCopy(token))
    })
}