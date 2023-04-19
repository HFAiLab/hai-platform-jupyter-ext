import { Widget } from '@lumino/widgets'

interface WindowWidgetRef {
    [propName: string]: Widget
}

declare let window: Window & { __widgetsRef: WindowWidgetRef }

/**
 * 将 widget 挂到 Windows 上面，方便在生产环境直接查看关键组件的状态
 * @param id
 * @param widget
 */
export function addWidgetRefToWindow(id: string, widget: Widget) {
    // HINT: 目前的 widget 是不会销毁的，因此使用对象的方式不会造成额外内存泄漏
    if (!window.__widgetsRef) {
        window.__widgetsRef = {}
    }
    window.__widgetsRef[id] = widget
}
