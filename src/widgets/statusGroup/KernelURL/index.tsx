/**
 * MEMORY USAGE FOR HUB USER
 */
import React from 'react'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { ReactWidget } from '@jupyterlab/apputils'
import { TopWidgetRanks } from '@/consts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { KernelBtn } from './KernelBtn'

class KernelTipWidget extends ReactWidget {
    render() {
        return <KernelBtn />
    }
}

export class KernelURLTip {
    constructor(app: JupyterFrontEnd) {
        this._app = app
        this.showWidget()
    }

    showWidget() {
        this._widget = new KernelTipWidget()
        this._widget.id = 'hfext-kernel-url-top'
        this._widget.addClass('hf')
        this._widget.addClass('kernel-url-tip')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.KernelURLRank
        })
    }

    _app: JupyterFrontEnd
    _widget?: KernelTipWidget
}
