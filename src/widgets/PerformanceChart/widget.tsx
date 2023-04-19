import { IThemeManager } from '@jupyterlab/apputils'
import { Context } from '@/contextManager'
import { OpenCommands } from '../../consts'
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import {
    AsyncPerfServiceNames,
    AsyncPerfServiceParams,
    AsyncPerfServiceResult,
    PerfServiceNames,
    PerfServiceParams,
    PerfServiceResult
} from '@hai-platform/studio-pages/lib/entries/perf/schema'
import { PerfApp } from '@hai-platform/studio-pages/lib/entries/perf/index'
import { PerfContainerAPI } from '@hai-platform/studio-pages/lib/entries/perf/container'
import { ExtractProps } from '@hai-platform/studio-pages/lib/schemas/basic'
import { EventsKeys } from '@hai-platform/studio-pages/lib/entries/perf/schema/event'
import { Widget } from '@lumino/widgets'
import { IChangedArgs } from '@jupyterlab/coreutils'
import { applyMixins } from '@hai-platform/studio-pages/lib/utils'
import { JupyterBaseContainerAPI } from '@/hfapp/baseContainerAPI'
import { BaseContainerAPI } from '@hai-platform/studio-pages/lib/entries/base/container'
import {
    dkey,
    dKey,
    PerfDataInterval,
    PerfQueryType
} from '@hai-platform/studio-pages/lib/entries/perf/widgets/ChartBlock'
import { IQueryType } from '@hai-platform/studio-pages/lib/schemas/basic'
import { PerfServiceAbilityNames } from '@hai-platform/studio-pages/lib/entries/perf/schema/services'

class WebContainerAPI implements PerfContainerAPI {
    private _ctx: Context
    private _widget_ref: PerformanceChartWidget

    constructor(ctx: Context, widget: PerformanceChartWidget) {
        this._ctx = ctx
        this._widget_ref = widget
    }
    invokeAsyncService<T extends AsyncPerfServiceNames>(
        key: T,
        params: ExtractProps<T, AsyncPerfServiceParams>
    ): Promise<AsyncPerfServiceResult[T]> {
        throw new Error(`Method not implemented: ${key}`)
    }
    invokeService<T extends keyof PerfServiceParams>(
        key: T,
        params: PerfServiceParams[T]
    ): PerfServiceResult[T] {
        if (key === PerfServiceNames.openPerformanceChart) {
            this._ctx._app.commands.execute(
                OpenCommands.PerformanceChart,
                params as any
            )
            return true as any
        } else if (key === PerfServiceNames.getTheme) {
            return this._ctx._themeManager.theme! as any
        } else {
            throw new Error(`Method not implemented: ${key}`)
        }
    }
    getContainer(): HTMLDivElement {
        return this._widget_ref.node as HTMLDivElement
    }
    hasAbility(name: string) {
        if (name === PerfServiceAbilityNames.duplicate) {
            return true
        }
        return false
    }
}

applyMixins(WebContainerAPI, [JupyterBaseContainerAPI])

export class PerformanceChartWidget extends Widget {
    _ctx: Context
    settingRegistry: ISettingRegistry
    chain: Chain
    rank: number
    type: PerfQueryType
    continuous: boolean
    createrQueryType: IQueryType
    app: PerfApp | null = null
    _height: number | null
    _width: number | null
    dataInterval: PerfDataInterval
    constructor(
        ctx: Context,
        settingRegistry: ISettingRegistry,
        chain: Chain,
        defaultRank: number,
        defaultType: PerfQueryType,
        continuous: boolean,
        createrQueryType: IQueryType,
        dataInterval: PerfDataInterval
    ) {
        super()
        this._ctx = ctx
        this.addClass('hf')
        this.addClass('perf')
        this.chain = chain
        this.rank = defaultRank ?? 0
        this.type = defaultType ?? 'gpu'
        this.dataInterval = dataInterval ?? '5min'
        this.continuous = continuous ?? true
        this.createrQueryType = createrQueryType
        this.settingRegistry = settingRegistry
        this._ctx._themeManager.themeChanged.connect(this.onThemeChanged, this)

        this._height = null
        this._width = null
    }

    onThemeChanged = (
        themeManager: IThemeManager,
        changed: IChangedArgs<string, string | null, string>
    ) => {
        this.app?.emit(EventsKeys.ThemeChange, {
            theme: changed.newValue
        })
    }

    setter = (type: dKey, v: any) => {
        if (!dkey.has(type)) {
            throw new Error(
                'Performance chart setter: Invalid key - ' + String(type)
            )
        }
        //@ts-ignore
        this[type] = v
        this.update()
    }

    onResize(msg: Widget.ResizeMessage) {
        super.onResize(msg)

        const h = Math.max(this.node.clientHeight, 350)
        const w = Math.max(this.node.clientWidth, 590)
        if (!this._height || Math.abs(this._height - h) > 2) {
            this._height = h
            this.update()
        }
        if (!this._width || Math.abs(this._width - w) > 2) {
            this._width = w
            this.update()
        }
    }

    getAppProps = () => {
        return {
            chain: this.chain,
            rank: this.rank,
            type: this.type,
            continuous: this.continuous,
            setter: this.setter,
            height: this._height!,
            width: this._width!,
            dataInterval: this.dataInterval,
            createrQueryType: this.createrQueryType
        }
    }

    update() {
        super.update()
        this.app && this.app.update(this.getAppProps())
    }

    onAfterAttach = (msg: any) => {
        const webContainerAPI = new WebContainerAPI(this._ctx, this)
        this.app = new PerfApp(
            (webContainerAPI as unknown) as PerfContainerAPI & BaseContainerAPI
        )
        this.app.start(this.getAppProps())
        super.onAfterAttach(msg)
    }

    onBeforeDetach() {
        if (this.app) {
            this.app.stop()
        }
    }

    onAfterDetach(msg: any) {
        super.onAfterDetach(msg)
    }

    dispose() {
        super.dispose()
    }
}
