export function getNameSpace() {
    try {
        // @ts-ignore
        return process.env.BLUEPRINT_NAMESPACE
    } catch (e) {
        return 'hai-ui'
    }
}

export const DARK_THEME_KEY = 'JupyterLab Dark'

export function getDarkNameSpace() {
    return `${getNameSpace()}-dark`
}

export function getThemeClassName(currentTheme: string) {
    return currentTheme == 'JupyterLab Dark' ? getDarkNameSpace() : ''
}
