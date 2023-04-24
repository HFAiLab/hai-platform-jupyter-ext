/**
 * Messenger Widget
 */

import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { ReactWidget } from '@jupyterlab/apputils'
import { Messenger } from '@/bizComponents/messenger'
import { Context } from '@/contextManager'

import React from 'react'

class MessengerWidget extends ReactWidget {
    ctx: Context

    constructor(ctx: Context) {
        super()
        this.ctx = ctx

        this.onMessageUpdate = this.onMessageUpdate.bind(this)
        this.handleClose = this.handleClose.bind(this)

        this.ctx.messageManager.messageUpdated.connect(this.onMessageUpdate)
    }

    handleClose(id: number | undefined) {
        id && this.ctx.messageManager.setClosed(id)
        this.update()
    }

    onMessageUpdate() {
        this.update()
    }

    render() {
        return (
            <Messenger
                closeHandler={this.handleClose}
                messages={this.ctx.messageManager.popupMessages}
                position="bottom-right"
            ></Messenger>
        )
    }
}

export class MessengerWrapper {
    ctx: Context
    constructor(app: JupyterFrontEnd, ctx: Context) {
        this._app = app
        this.ctx = ctx
        this.initWidget()
    }

    initWidget() {
        this._widget = new MessengerWidget(this.ctx)
        this._widget.id = 'hfext-popup-message'
        this._widget.addClass('hf')
        this._widget.addClass('message')

        // 只需要被挂载进界面且渲染且不影响 shell 布局即可，挂在哪里无所谓
        this._app.shell.add(this._widget, 'top', { rank: -1 })
        this.ctx.messageManager.fetchMessage()
    }

    _app: JupyterFrontEnd
    _widget?: Widget
}
