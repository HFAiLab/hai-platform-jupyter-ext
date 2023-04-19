/**
 * CLUSTER USAGE FOR HUB USER
 */
import React from 'react'
import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { ReactWidget } from '@jupyterlab/apputils'
import { TopWidgetRanks } from '../../../consts'
import { ClusterPop } from './ClusterPop'
import { ServiceContext } from '@/uiComponents/reactContext'
import { Context } from '@/contextManager'

class ClusterInfoWidget extends ReactWidget {
    constructor(ctx: Context) {
        super()
        this._ctx = ctx
    }

    render() {
        return (
            <ServiceContext.Provider value={{ ctx: this._ctx }}>
                <ClusterPop update={this.update} />
            </ServiceContext.Provider>
        )
    }

    _ctx: Context
}

export class ClusterInfo {
    constructor(app: JupyterFrontEnd, ctx: Context) {
        this._app = app
        this._ctx = ctx

        this._app.started.then(() => {
            this.initWidget()
        })
    }

    initWidget() {
        this._widget = new ClusterInfoWidget(this._ctx)
        this._widget.id = 'hfext-cluster-top'
        this._widget.addClass('hf')
        this._widget.addClass('cluster')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.ClusterInfoRank
        })
    }
    _ctx: Context
    _app: JupyterFrontEnd
    _widget?: Widget
}
