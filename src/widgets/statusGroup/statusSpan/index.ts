/**
 * SSH ADDRESS DISPLAY FOR HUB USER
 */

import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { TopWidgetRanks } from '@/consts'

// hint: 这个应该是一个用于定位的 span
export class StatusSpan {
    constructor(app: JupyterFrontEnd) {
        this._app = app
        this.initWidget()
    }
    initWidget() {
        this._widget = new Widget({})
        this._widget.id = 'hf-status-span'
        this._widget.addClass('corner-span')
        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.StatusSpanRank
        })
    }
    _widget?: Widget
    _app: JupyterFrontEnd
}
