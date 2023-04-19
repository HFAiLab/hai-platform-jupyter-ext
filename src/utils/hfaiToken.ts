export function getToken() {
    return (window as any).__HFT__ ?? null
}

export function setToken(token: string): void {
    ;(window as any).__HFT__ = token
}
