import HFLogger, { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { VERSION } from '../consts'

let globalErrorHandlerInstance: GlobalErrorHandler | null = null

export function getGlobalErrorHandler() {
    if (!globalErrorHandlerInstance) {
        globalErrorHandlerInstance = new GlobalErrorHandler()
        globalErrorHandlerInstance.init()
    }

    return globalErrorHandlerInstance
}

interface ErrorMessage {
    extType: 'windowError'
    extVersion: string
    event: string
    source: string
    lineno: number
    colno: number
    stack: string
}

export enum ErrorStatus {
    Normal,
    ErrorCaught
}

type ErrorListener = (errorStatus: ErrorStatus) => void

export class GlobalErrorHandler {
    errorStatus: ErrorStatus = ErrorStatus.Normal
    listeners: Set<ErrorListener> = new Set()
    private _oldOnErrorHandler: OnErrorEventHandler = null

    constructor() {}

    init() {
        this.registerErrorHandler()
    }

    addListener = (listener: ErrorListener) => {
        this.listeners.add(listener)
    }

    removeListener = (listener: ErrorListener) => {
        this.listeners.delete(listener)
    }

    registerErrorHandler() {
        this._oldOnErrorHandler = window.onerror
        window.onerror = this.errorHandler
    }

    private errorHandler = (
        event: Event | string,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
    ): boolean => {
        if (this._oldOnErrorHandler) {
            this._oldOnErrorHandler(event, source, lineno, colno, error)
        }

        try {
            const errorMessage: ErrorMessage = {
                extType: 'windowError',
                extVersion: VERSION,
                event: `${event || ''}`,
                source: `${source || ''}`,
                lineno: lineno || 0,
                colno: colno || 0,
                stack: (!error ? '' : error.stack || '').toString()
            }

            console.error(
                `[window onerror]${JSON.stringify(errorMessage)}`,
                HF_LOGGER_LEVEL.INFO
            )
            HFLogger.log(
                `[window onerror]${JSON.stringify(errorMessage)}`,
                HF_LOGGER_LEVEL.INFO
            )

            if (this.errorStatus !== ErrorStatus.ErrorCaught) {
                this.errorStatus = ErrorStatus.ErrorCaught
                for (const listener of this.listeners) {
                    listener(this.errorStatus)
                }
            }
        } catch (e) {
            HFLogger.log(
                'get error when handle window onerror',
                HF_LOGGER_LEVEL.INFO
            )
        }

        return false
    }
}
