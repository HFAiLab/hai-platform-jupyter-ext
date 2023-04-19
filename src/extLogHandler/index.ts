/**
 * Collect extension's log and handle error.
 */

import { JupyterFrontEnd } from '@jupyterlab/application'
import { Signal } from '@lumino/signaling'
export interface ILogMsg {
    msg: string
    type: 'INFO' | 'SUCCESS' | 'ERROR'
    time?: Date | null
}

export class ExtLogHandler {
    constructor(app: JupyterFrontEnd) {
        this._app = app
        this._messages = []
        this._logUpdatedSginal = new Signal<this, any>(this)
    }

    log(msg: string, type: 'INFO' | 'SUCCESS' | 'ERROR'): void {
        this._messages.push({ msg, type, time: new Date() })
        this._logUpdatedSginal.emit(null)
    }
    info(msg: string) {
        this.log(msg, 'INFO')
    }
    success(msg: string) {
        this.log(msg, 'SUCCESS')
    }
    error(msg: string) {
        this.log(msg, 'ERROR')
    }

    get logUpdatedSginal() {
        return this._logUpdatedSginal
    }

    get messages() {
        return this._messages
    }

    _app: JupyterFrontEnd
    _logUpdatedSginal: Signal<this, any>
    _messages: Array<ILogMsg>
}
