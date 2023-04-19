import { ReactWidget } from '@jupyterlab/apputils'
import { Context, IFileChangedParam, IQueryType } from '@/contextManager'
import { ManageApp } from '@hai-platform/studio-pages/lib/entries/manage/index'
import { ManagerContainerAPI } from '@hai-platform/studio-pages/lib/entries/manage/container'
import { CONSTS, OpenCommands } from '@/consts'
import {
    AsyncExpsManageServiceNames,
    AsyncExpsManageServiceParams,
    AsyncExpsManageServiceResult,
    ManageServiceAbilityNames,
    ExpsManageServiceNames,
    ExpsManageServiceParams,
    ExpsManageServiceResult,
    ExpsPageManageState
} from '@hai-platform/studio-pages/lib/entries/manage/schema'
import { ExtractProps } from '@hai-platform/studio-pages/lib/schemas/basic'
import { BaseContainerAPI } from '@hai-platform/studio-pages/lib/entries/base/container'
import { JupyterBaseContainerAPI } from '@/hfapp/baseContainerAPI'
import { applyMixins } from '@hai-platform/studio-pages/lib/utils'
import { getCurrentUserName } from '@/utils/countly/countly'
import { tryOpenFile } from '@/utils/jupyter'
import { LogWidgetExp } from '../LogViewer/widget'
import { PerformanceChartWidget } from '../PerformanceChart/widget'
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'
import { EventsKeys } from '@hai-platform/studio-pages/lib/entries/manage/schema/event'

interface TrainingContainerOptions {
    getCurrentState: () => ExpsPageManageState | null
    setCurrentState: (state: ExpsPageManageState) => void
}

class Container implements ManagerContainerAPI {
    options: TrainingContainerOptions

    constructor(
        w: ReactWidget,
        ctx: Context,
        options: TrainingContainerOptions
    ) {
        this._ctx = ctx
        this._node = w.node as HTMLDivElement
        this.options = options
    }
    invokeAsyncService<T extends AsyncExpsManageServiceNames>(
        key: T,
        params: ExtractProps<T, AsyncExpsManageServiceParams>
    ): Promise<AsyncExpsManageServiceResult[T]> {
        if ((key === AsyncExpsManageServiceNames.openFile, params)) {
            const p = params as AsyncExpsManageServiceParams[AsyncExpsManageServiceNames.openFile]
            const filePath = p.path
            return tryOpenFile(this._ctx._app, filePath) as any
        } else if (key === AsyncExpsManageServiceNames.reflushClusterInfo) {
            return Promise.resolve() as any
        } else {
            throw new Error(`invokeAsyncService ${key} Method not implemented.`)
        }
    }
    invokeService<T extends ExpsManageServiceNames>(
        key: T,
        params: ExpsManageServiceParams[T]
    ): ExpsManageServiceResult[T] {
        if (key === ExpsManageServiceNames.getAutoShowLog) {
            return JSON.parse(
                window.localStorage.getItem(CONSTS.SETTING_AUTO_SHOWLOG) ??
                    'false'
            )
        } else if (key === ExpsManageServiceNames.setAutoShowLog) {
            window.localStorage.setItem(
                CONSTS.SETTING_AUTO_SHOWLOG,
                params ? 'true' : 'false'
            )
            return undefined as any
        } else if (
            key === ExpsManageServiceNames.getExperimentsFilterMemorize
        ) {
            return false as any
        } else if (key === ExpsManageServiceNames.getTrainingsColumns) {
            return JSON.parse(
                window.localStorage.getItem(
                    CONSTS.SETTING_TRAINING_CUSTON_COLUMNS
                ) || JSON.stringify(CONSTS.DEFAULT_TRAINING_CUSTON_COLUMNS)
            ) as any
        } else if (key === ExpsManageServiceNames.setTrainingsColumns) {
            window.localStorage.setItem(
                CONSTS.SETTING_TRAINING_CUSTON_COLUMNS,
                JSON.stringify(params)
            )
            return undefined as any
        } else if (key === ExpsManageServiceNames.setCurrentChain) {
            const p = params as ExpsManageServiceParams[ExpsManageServiceNames.setCurrentChain]
            this._ctx.emitInvokeChainUpdate({
                chainId: p?.chain_id || '',
                sender: null
            })
            this._ctx._app.commands.execute(OpenCommands.ShowSidePanel)
            return undefined as any
        } else if (key === ExpsManageServiceNames.openLog) {
            const p = params as ExpsManageServiceParams[ExpsManageServiceNames.openLog]
            this._ctx._app.commands.execute(OpenCommands.LogViewer, {
                chain: p.chain,
                rank: p.rank,
                queryType: p.queryType,
                ignoreRank: p.ignoreRank
            } as any)
            return undefined as any
        } else if (key === ExpsManageServiceNames.emitChainChanged) {
            const p = params as ExpsManageServiceParams[ExpsManageServiceNames.emitChainChanged]
            this._ctx.emitInvokeChainUpdate({
                chainId: p.chainId,
                sender: p.sender
            })
            return undefined as any
        } else if (key === ExpsManageServiceNames.getUserName) {
            return getCurrentUserName() as any
        } else if (key === ExpsManageServiceNames.getDefaultManageState) {
            // 主要的作用是从 url 中获得
            return this.options.getCurrentState() as any
        } else if (key === ExpsManageServiceNames.setPageState) {
            this.options.setCurrentState(
                params as ExpsManageServiceParams[ExpsManageServiceNames.setPageState]
            )
            return true as any
        } else {
            throw new Error(`invokeService ${key} Method not implemented.`)
        }
    }
    hasAbility(name: ManageServiceAbilityNames) {
        const abilityDict = {
            [ManageServiceAbilityNames.openFile]: true,
            [ManageServiceAbilityNames.switchAutoShowLog]: true,
            [ManageServiceAbilityNames.stopExperiment]: true,
            [ManageServiceAbilityNames.filterMemorize]: true
        }
        return abilityDict[name] ?? false
    }
    getContainer() {
        return this._node
    }
    _node: HTMLDivElement
    _ctx: Context
}

applyMixins(Container, [JupyterBaseContainerAPI])

type TrainingsWidgetOptions = TrainingContainerOptions

export class TrainingsWidget extends ReactWidget {
    _manageApp: ManageApp
    _capi: ManagerContainerAPI & BaseContainerAPI

    options: TrainingsWidgetOptions

    constructor(ctx: Context, options: TrainingsWidgetOptions) {
        super()
        this.options = options
        this._ctx = ctx
        this.addClass('hf')
        this.addClass('trainingsWindow')
        this._capi = (new Container(
            this,
            ctx,
            this.options
        ) as unknown) as ManagerContainerAPI & BaseContainerAPI
        this._manageApp = new ManageApp(this._capi)
    }

    onThemeChanged() {
        this.update()
    }

    onAfterAttach(msg: any) {
        this._ctx._themeManager.themeChanged.connect(this.onThemeChanged, this)
        setTimeout(() => {
            // 这里如果不加 setTimeout 的话 this.node.offsetHeight 拿到的是 0，会导致计算 pageSize 的时候偏少，页面空间有所浪费，但也不是什么大问题
            // 这个和 jupyter 的行为逻辑有关系，暂时没找到更好的解决方式
            this._manageApp.start()
        })

        this._ctx.currentWidgetChanged.connect(this.handleCurrentChanged, this)
    }

    private handleCurrentChanged = (_: any, changed: IFileChangedParam) => {
        let nextChain: Chain | null = null
        // @ts-expect-error ignore _content
        if (changed.widget._content instanceof LogWidgetExp) {
            const queryType: IQueryType = /.*\s\-\sLog$/.test(
                changed.widget!.title.label
            )
                ? 'path'
                : 'chainId'

            if (queryType === 'chainId') {
                // @ts-expect-error ignore _content
                nextChain = changed.widget!._content!._chain as Chain
            }
        } else if (
            // @ts-expect-error ignore _content
            changed.widget._content instanceof PerformanceChartWidget
        ) {
            const perfInstance = (changed.widget as any)
                ._content as PerformanceChartWidget
            const queryType: IQueryType = perfInstance.createrQueryType

            if (queryType === 'chainId') {
                nextChain = perfInstance.chain
            }
        }

        if (nextChain && this._manageApp) {
            this._manageApp.emit(EventsKeys.AssignSelectChain, nextChain)
        }
    }

    getCurrentActiveChain() {
        return this._manageApp.getCurrentChain()
    }

    onBeforeDetach() {
        this._manageApp.stop()
    }

    onAfterDetach(msg: any) {
        this._ctx._themeManager.themeChanged.disconnect(
            this.onThemeChanged,
            this
        )

        this._ctx.currentWidgetChanged.disconnect(
            this.handleCurrentChanged,
            this
        )
    }

    render() {
        return null
    }
    _ctx: Context
}
