import { Context } from '@/contextManager'
import { ErrorHandler } from '@hai-platform/studio-pages/lib/utils/errorHandler'
import { VERSION } from '@/consts'
import { getToken, LevelLogger } from '@/utils'
import { CountlyEventKey, JupyterCountly } from '@/utils/countly/countly'
import { Languages, i18n } from '@hai-platform/i18n'
import { AppToaster, toastWithCancel } from '@/utils/toast'
import { BaseContainerAPI } from '@hai-platform/studio-pages/lib/entries/base/container'
import { IToastProps, IToaster } from '@hai-ui/core'
import { ApiServerClient } from '@hai-platform/client-api-server'
import { GlobalApiServerClient } from '@/serverConnection/apiServer'
import { CountlyEvent } from '@hai-platform/studio-toolkit/lib/esm/countly'
import { AilabServerClient } from '@hai-platform/client-ailab-server'
import { GlobalAilabServerClient } from '@/serverConnection/ailabServer'

export class JupyterBaseContainerAPI implements BaseContainerAPI {
    private _ctx?: Context

    getToken(): string {
        return getToken()
    }
    getLan(): Languages {
        return i18n.currentLanguage
    }
    getVersion(): string {
        return VERSION
    }
    getSettingStorage(): void {
        throw new Error('Method not implemented.')
    }
    getLogger() {
        return LevelLogger
    }
    getErrorHandler(): ErrorHandler {
        return this._ctx!._errorHandler
    }
    getApiServerClient(): ApiServerClient {
        return GlobalApiServerClient
    }
    getAilabServerClient(): AilabServerClient {
        return GlobalAilabServerClient
    }
    i18n(key: string, params?: Record<string, any>): string {
        return 'no-i18n'
    }
    getHFUIToaster(): IToaster {
        return AppToaster
    }
    toastWithCancel(
        props: IToastProps,
        key?: string | undefined
    ): Promise<boolean> {
        return toastWithCancel(props, key)
    }
    hasAbility() {
        return false
    }
    countlyReportEvent(key: string, event?: CountlyEvent): void {
        JupyterCountly.safeReport(key as CountlyEventKey, event)
    }
}

export const baseContainerAPI = new JupyterBaseContainerAPI()
