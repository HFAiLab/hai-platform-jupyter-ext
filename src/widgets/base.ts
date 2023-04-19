import { JupyterFrontEnd } from '@jupyterlab/application'

import { WidgetTracker } from '@jupyterlab/apputils'

import { Widget } from '@lumino/widgets'

import { LabIcon } from '@jupyterlab/ui-components'

import { DockLayout } from '@lumino/widgets'

import { RequiredPlugins } from '../consts'

import { Context } from '@/contextManager'

import { addWidgetRefToWindow } from '../utils'

export interface HasWidgetComponent {
    /**
     * Show Widget in Some place
     */
    showWidget<T>(options?: T): void

    /**
     * Add commands, add menu item, tracker, use restorer... to the jupyter app.
     */
    register(p: RequiredPlugins): void
}

export interface BaseOptions {
    app: JupyterFrontEnd
    context?: Context
    widgetIcon: LabIcon
    widgetTitle?: string | (() => string)
    widgetShowMode?: DockLayout.InsertMode
    widgetArea?: 'main' | 'left' | 'right' | 'top'
    widgetCaption?: string | (() => string)
    widgetRank?: number
}

export abstract class WidgetComponentBase<T extends Widget>
    implements HasWidgetComponent {
    constructor(p: BaseOptions) {
        this._app = p.app
        this._context = p.context ?? undefined
        this._widgetIcon = p.widgetIcon ?? undefined
        this._widgetTitle = p.widgetTitle ?? undefined
        this._widgetShowMode = p.widgetShowMode ?? undefined
        this._widgetArea = p.widgetArea ?? 'main'
        this._widgetCaption = p.widgetCaption ?? undefined
        this._widgetRank = p.widgetRank ?? undefined
    }

    /**
     * Get the widget for the instance
     */
    get widget() {
        if (!this._widget || this._widget.isDisposed) {
            return null
        }
        return this._widget
    }

    abstract register(p?: RequiredPlugins): void
    abstract _createWidget(): T

    /**
     * Show this widget in dock area.
     */
    showWidget() {
        if (this.widget) {
            if (!this._widget!.isAttached) {
                this._app.shell.add(this.widget, this._widgetArea, {
                    mode: this._widgetShowMode,
                    rank: this._widgetRank
                })
            }
            if (this._tracker && !this._tracker.has(this._widget!)) {
                this._tracker.add(this.widget)
            }
            this._app.shell.activateById(this.widget.id)
        } else {
            const w = this._createWidget()
            w.title.label =
                typeof this._widgetTitle === 'function'
                    ? this._widgetTitle()
                    : this._widgetTitle || ''
            w.title.icon = this._widgetIcon
            w.title.caption =
                typeof this._widgetCaption === 'function'
                    ? this._widgetCaption()
                    : this._widgetCaption || ''
            this._app.shell.add(w, this._widgetArea, {
                mode: this._widgetShowMode,
                rank: this._widgetRank
            })
            this._tracker && this._tracker.add(w)
            addWidgetRefToWindow(w.id, w)
        }
    }

    _widget: T | null = null
    _widgetIcon: LabIcon
    _widgetCaption?: string | (() => string)
    _app: JupyterFrontEnd
    _context?: Context
    _tracker?: WidgetTracker<T>
    _widgetArea: string
    _widgetTitle?: string | (() => string)
    _widgetShowMode?: DockLayout.InsertMode
    _widgetRank?: number
}
