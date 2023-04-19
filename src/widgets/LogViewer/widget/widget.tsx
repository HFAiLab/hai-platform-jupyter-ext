import { IThemeManager } from '@jupyterlab/apputils'
import { ChainUpdateArgs, Context } from '@/contextManager'
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'
import HFLogger from '@/utils/log'
import { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { ILabShell, LabShell } from '@jupyterlab/application'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import {
    AsyncLogServiceNames,
    AsyncLogServiceParams,
    AsyncLogServiceResult,
    LogServiceNames,
    LogServiceParams,
    LogServiceResult
} from '@hai-platform/studio-pages/lib/entries/logs/schema'
import { LogApp } from '@hai-platform/studio-pages/lib/entries/logs/index'
import { LogContainerAPI } from '@hai-platform/studio-pages/lib/entries/logs/container'
import { ExtractProps } from '@hai-platform/studio-pages/lib/schemas/basic'
import { EventsKeys } from '@hai-platform/studio-pages/lib/entries/logs/schema/event'
import { Widget } from '@lumino/widgets'
import { IChangedArgs } from '@jupyterlab/coreutils'
import { applyMixins } from '@hai-platform/studio-pages/lib/utils'
import { JupyterBaseContainerAPI } from '@/hfapp/baseContainerAPI'
import { BaseContainerAPI } from '@hai-platform/studio-pages/lib/entries/base/container'

class WebContainerAPI implements LogContainerAPI {
    private _ctx: Context
    private _widget_ref: LogWidgetExp

    constructor(ctx: Context, widget: LogWidgetExp) {
        this._ctx = ctx
        this._widget_ref = widget
    }
    invokeAsyncService<T extends AsyncLogServiceNames>(
        key: T,
        params: ExtractProps<T, AsyncLogServiceParams>
    ): Promise<AsyncLogServiceResult[T]> {
        throw new Error('Method not implemented.')
    }
    invokeService<T extends keyof LogServiceParams>(
        key: T,
        params: LogServiceParams[T]
    ): LogServiceResult[T] {
        if (key === LogServiceNames.getCurrentLogChain) {
            return this._widget_ref._chain as any
        } else if (key === LogServiceNames.getCurrentLogRank) {
            return this._widget_ref._rank as any
        } else if (key === LogServiceNames.invokeRankChanged) {
            return this._widget_ref.setChainAndRank(
                this._widget_ref._chain,
                params as number
            ) as any
        } else if (key === LogServiceNames.getTheme) {
            return this._ctx._themeManager.theme! as any
        } else if (key === LogServiceNames.getHandleCR) {
            return (this._ctx._user.settings.handleCR as boolean) as any
        } else if (key === LogServiceNames.getCurrentLogService) {
            return undefined as any
        } else {
            throw new Error('Method not implemented.')
        }
    }
    getContainer(): HTMLDivElement {
        return this._widget_ref.node as HTMLDivElement
    }
    hasAbility() {
        // 目前只有一个分享日志的功能，是不开的
        return false
    }
}

applyMixins(WebContainerAPI, [JupyterBaseContainerAPI])

export class LogWidgetExp extends Widget {
    _ctx: Context
    settingRegistry: ISettingRegistry
    constructor(ctx: Context, settingRegistry: ISettingRegistry) {
        super()
        this._ctx = ctx
        this.addClass('hf')
        this.addClass('hfapp-log-view')
        this.title.label = 'Widget Example View'
        this.title.closable = true
        // this.node

        this._chain = null
        this._rank = 0
        this.settingRegistry = settingRegistry

        this._ctx._themeManager.themeChanged.connect(this.onThemeChanged, this)
    }

    onThemeChanged = (
        themeManager: IThemeManager,
        changed: IChangedArgs<string, string | null, string>
    ) => {
        this.app?.emit(EventsKeys.ThemeChange, {
            theme: changed.newValue
        })
    }

    setChainAndRank(chain: Chain | null, rank: number) {
        this._chain = chain
        this._rank = rank

        if (this.app) {
            // @ts-ignore
            this.app.emit(EventsKeys.LogMetaChange, { chain, rank })
        }
    }

    onAfterShow = (msg: any) => {
        this.app && this.app.emit(EventsKeys.VisibilityChanged, true);
    }

    onAfterHide = (msg: any) => {
        this.app && this.app.emit(EventsKeys.VisibilityChanged, false);
    }

    onAfterAttach = (msg: any) => {
        const webContainerAPI = new WebContainerAPI(this._ctx, this)

        this.app = new LogApp(
            (webContainerAPI as unknown) as LogContainerAPI & BaseContainerAPI
        )
        // @ts-ignore
        if (!window.__log_apps_ref) {
            // @ts-ignore
            window.__log_apps_ref = new WeakMap()
        }
        // @ts-ignore
        window.__log_apps_ref.set(this.app, 1)

        this.app.start()

        this.app.emit(EventsKeys.LogMetaChange, {
            // @ts-ignore
            chain: this._chain,
            rank: this._rank
        })

        this._ctx.invokeChainUpdated.connect(
            this._listenInvokeChainUpdate,
            this
        )
        const shell = this._ctx._app.shell as LabShell
        shell.activeChanged.connect(this._activeListener, this)

        super.onAfterAttach(msg)
    }

    onBeforeDetach() {
        if (this.app) {
            this.app.stop()
        }
        this.app = null
    }

    onAfterDetach(msg: any) {
        this._ctx.invokeChainUpdated.disconnect(
            this._listenInvokeChainUpdate,
            this
        )

        const shell = this._ctx._app.shell as LabShell
        shell.activeChanged.disconnect(this._activeListener, this)

        super.onAfterDetach(msg)
    }

    dispose() {
        this._ctx.invokeChainUpdated.disconnect(
            this._listenInvokeChainUpdate,
            this
        )

        super.dispose()
    }

    // 根据窗口激活状态改变 document.title
    _activeListener(shell: ILabShell, args: ILabShell.IChangedArgs) {
        if (args.newValue?.id === this.parent?.id) {
            const fileNameRaw = this._chain?.showName?.split('/')
            const fileName = fileNameRaw
                ? fileNameRaw[fileNameRaw.length - 1]
                : null
            fileName &&
                setTimeout(() => {
                    document.title = this.title.label!
                }, 100)
            fileName &&
                setTimeout(() => {
                    document.title = this.title.label!
                }, 500)
        }
    }

    _listenInvokeChainUpdate(ctx: Context, args: ChainUpdateArgs) {
        if (!this._chain) {
            HFLogger.log(
                '[logView] chain is empty when get update',
                HF_LOGGER_LEVEL.INFO
            )
            return
        }
        if (this._chain.chain_id != args.chainId) {
            return
        }

        // @ts-ignore
        this.app?.emit(EventsKeys.LogRefresh, {
            chain: this._chain,
            rank: this._rank
        })
    }

    _chain: Chain | null
    _rank: number
    app: LogApp | null = null
}
