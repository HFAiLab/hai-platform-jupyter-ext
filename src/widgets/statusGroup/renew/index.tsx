/**
 * renew manage
 */
import React from 'react'
import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { conn } from '../../../serverConnection'
import { ReactWidget } from '@jupyterlab/apputils'
import { CONSTS, TopWidgetRanks } from '../../../consts'
import { RenewManagerRender } from './render'
import { Context } from '@/contextManager'

class RenewWidget extends ReactWidget {
    constructor(context: Context) {
        super()
        this.ready = false
        this.context = context
        this.context._themeManager.themeChanged.connect(this.themeChanged)
    }

    themeChanged = () => {
        this.update()
    }

    setData(p: conn.IWatchDogInfo | null) {
        requestAnimationFrame(() => {
            this.update()
        })
    }

    render() {
        return <RenewManagerRender theme={this.context._themeManager.theme} />
    }

    dispose() {
        this.context._themeManager.themeChanged.disconnect(this.themeChanged)
        super.dispose()
    }

    context: Context
    ready: boolean
}

export class RenewManager {
    constructor(app: JupyterFrontEnd, context: Context) {
        this._app = app
        this._context = context
        this._app.started.then(() => {
            this.initWidget()
        })
    }

    initWidget() {
        if (this._context._user._in) {
            return
        }
        this._widget = new RenewWidget(this._context)
        this._widget.id = 'hfext-renew-manager-top'
        this._widget.addClass('hf')
        this._widget.addClass('renew')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.RenewMetricsRank
        })
    }

    hideWidget() {
        if (!this._widget) {
            return
        }
        const newClassName = this._widget.node.className.replace(
            'corner-component',
            ''
        )
        this._widget.node.setAttribute('style', 'display:none')
        this._widget.node.setAttribute('class', newClassName)
    }

    _app: JupyterFrontEnd
    _context: Context
    _widget?: Widget
}
