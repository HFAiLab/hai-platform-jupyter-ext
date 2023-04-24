import React from 'react'

import { ReactWidget } from '@jupyterlab/apputils'

import { ISignal } from '@lumino/signaling'

import { ILogMsg } from '../../../extLogHandler'

import { ExtLoggerComponent } from './ExtLogger'

/**
 * A Widget for logger panel
 */
export class ExtLoggerWidget extends ReactWidget {
    constructor(signal: ISignal<any, null>, logs: Array<ILogMsg>) {
        super()
        this._signal = signal
        this._logs = logs
        this.addClass('hf')
        this.addClass('logger')
        this._signal.connect(this.update, this)
    }

    render(): JSX.Element {
        return <ExtLoggerComponent logs={this._logs} />
    }

    _signal: ISignal<any, null>
    _logs: Array<ILogMsg>
}
