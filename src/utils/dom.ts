let cache_width: number | null = null

export function getScrollbarWidth() {
    if (cache_width != null) {
        return cache_width
    }
    const outer = document.createElement('div')
    outer.style.visibility = 'hidden'
    outer.style.width = '100px'
    // @ts-ignore
    outer.style.msOverflowStyle = 'scrollbar' // needed for WinJS apps

    document.body.appendChild(outer)

    const widthNoScroll = outer.offsetWidth
    // force scrollbars
    outer.style.overflow = 'scroll'

    // add innerdiv
    const inner = document.createElement('div')
    inner.style.width = '100%'
    outer.appendChild(inner)

    const widthWithScroll = inner.offsetWidth

    // remove divs
    outer.parentNode!.removeChild(outer)

    cache_width = widthNoScroll - widthWithScroll
    return cache_width
}

export function getThemeColor() {
    if (localStorage.getItem('USER_COLOR')) {
        return localStorage.getItem('USER_COLOR')!
    }
    return getComputedStyle(document.body)
        .getPropertyValue('--hf-theme-color')
        .trim()
}
