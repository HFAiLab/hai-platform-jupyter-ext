/**
 * MEMORY USAGE FOR HUB USER
 */
import React from 'react'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { ReactWidget } from '@jupyterlab/apputils'
import { OpenCommands, TopWidgetRanks } from '@/consts'
import {
    AllFatalErrorsType,
    IoStatus
} from '@hai-platform/studio-pages/lib/socket/index'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IOStatusTag } from './IOStatus'
import { LevelLogger } from '@/utils'

// hint: 它依赖 ClusterPop
class IOTipWidget extends ReactWidget {
    ioStatus: IoStatus
    ioLastError: AllFatalErrorsType | null = null

    constructor(opts: {
        ioStatus: IoStatus
        ioLastError: AllFatalErrorsType | null
    }) {
        super()
        this.ready = false
        this.ioStatus = opts.ioStatus
        this.ioLastError = opts.ioLastError
    }

    setIoStatus(ioStatus: IoStatus) {
        this.ioStatus = ioStatus
        this.update()
    }

    setIoLastError(ioLastError: AllFatalErrorsType | null) {
        this.ioLastError = ioLastError
        this.update()
    }

    render() {
        return (
            <IOStatusTag
                ioStatus={this.ioStatus}
                ioLastError={this.ioLastError}
            />
        )
    }

    dispose() {
        super.dispose()
    }

    ready: boolean
}

export class IoConnectionTip {
    ioStatus: IoStatus = IoStatus.fatal
    ioLastError: AllFatalErrorsType | null = null
    constructor(app: JupyterFrontEnd) {
        this._app = app

        const { commands } = app
        commands.addCommand(OpenCommands.IoConnectionTip, {
            execute: args => {
                this.ioStatus = (args.status as unknown) as IoStatus
                this.ioLastError = args.ioLastError as AllFatalErrorsType
                LevelLogger.info(
                    'call OpenCommands.IoConnectionTip',
                    `ioLastError:${this.ioLastError}`,
                    `ioStatus:${this.ioStatus}`
                )
                this.showWidget()
            }
        })
    }

    showWidget() {
        if (this._widget) {
            this._widget.node.setAttribute('style', 'display:block')
            // 使用该类来靠右加选择器实现右贴边
            this._widget.addClass('corner-component')
            this._widget.setIoStatus(this.ioStatus)
            this._widget.setIoLastError(this.ioLastError)
            return
        }
        this._widget = new IOTipWidget({
            ioStatus: this.ioStatus,
            ioLastError: this.ioLastError
        })
        this._widget.id = 'hfext-io-tip-top'
        this._widget.addClass('hf')
        this._widget.addClass('io-tip')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.IoConnectionTipRank
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
    _widget?: IOTipWidget
}
