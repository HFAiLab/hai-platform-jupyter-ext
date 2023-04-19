/**
 * MEMORY USAGE FOR HUB USER
 */
import React from 'react'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { ReactWidget } from '@jupyterlab/apputils'
import { TopWidgetRanks } from '@/consts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars

class ServerDebugTipWidget extends ReactWidget {
    render() {
        return <span>当前已指定服务端地址：{window._d_mars_server_url}</span>
    }
}

export class ServerDebugTip {
    constructor(app: JupyterFrontEnd) {
        this._app = app
        this.showWidget()
    }

    showWidget() {
        if (!window._d_mars_server_url) {
            return
        }

        this._widget = new ServerDebugTipWidget()
        this._widget.id = 'hfext-debug-tip'
        this._widget.addClass('hf')
        this._widget.addClass('kernel-debug-tip')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.ServerDebugTip
        })
    }

    _app: JupyterFrontEnd
    _widget?: ServerDebugTipWidget
}
