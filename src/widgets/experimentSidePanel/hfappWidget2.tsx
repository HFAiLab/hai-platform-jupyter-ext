import React from 'react'
import { ReactWidget } from '@jupyterlab/apputils'
import { ChainUpdateArgs, Context, IFileChangedParam } from '@/contextManager'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { Chain } from '@hai-platform/studio-pages/lib/index'
import { IQueryType } from '@/contextManager'
import { PerformanceChartWidget } from '../PerformanceChart/widget'
import {
    AsyncServiceNames,
    AsyncServiceParams,
    AsyncServiceResult,
    CreateExperimentParams,
    ExpServiceAbilityNames,
    ExpServiceResult,
    ServiceNames,
    ServiceParams
} from '@hai-platform/studio-pages/lib/entries/experiment2/schema'
import { CONSTS, OpenCommands } from '@/consts'
import { Experiment2ContainerAPI } from '@hai-platform/studio-pages/lib/entries/experiment2/container'
import { CountlyEventKey, JupyterCountly } from '@/utils/countly/countly'
import { applyMixins } from '@hai-platform/studio-pages/lib/utils'
import { JupyterBaseContainerAPI } from '@/hfapp/baseContainerAPI'
import { clearAndCreateNewContainer } from '@hai-platform/studio-pages/lib/entries/base/app'
import { Experiment2App } from '@hai-platform/studio-pages/lib/entries/experiment2/app'
import { BaseContainerAPI } from '@hai-platform/studio-pages/lib/entries/base/container'
import { TrainingsWidget } from '../TrainingsManager/widget'
import { LogWidgetExp } from '../LogViewer/widget'
import { getServerRoot, LevelLogger, maybeCreatedWithJupyter } from '@/utils'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { conn } from '@/serverConnection'
import { IExp2StateByProps } from '@hai-platform/studio-pages/lib/entries/experiment2/schema/params'

class Experiment2Container implements Experiment2ContainerAPI {
    constructor(
        node: HTMLDivElement,
        ctx: Context,
        options: {
            directoryList: Array<string> | null
            editorReadyCheck: () => Promise<void>
        }
    ) {
        this._ctx = ctx
        this._node = node as HTMLDivElement
        this.directoryList = options.directoryList
        this.editorReadyCheck = options.editorReadyCheck
    }
    invokeAsyncService<T extends AsyncServiceNames>(
        key: T,
        params: AsyncServiceParams[T]
    ): Promise<AsyncServiceResult[T]> {
        if (key === AsyncServiceNames.createExperiment) {
            return conn.createExperiment(
                params as CreateExperimentParams
            ) as any
        }
        if (key === AsyncServiceNames.getHaiEnvList) {
            return conn.getHaiEnvList() as any
        }
        if (key === AsyncServiceNames.editorReadyCheck) {
            return this.editorReadyCheck() as any
        }
        throw new Error(`invokeAsyncService ${key} Method not implemented.`)
    }
    invokeService<T extends ServiceNames>(
        key: T,
        params: ServiceParams[T]
    ): ExpServiceResult[T] {
        if (key === ServiceNames.openLogViewer) {
            JupyterCountly.safeReport(CountlyEventKey.ExpNodeClick)
            return this._ctx.app.commands.execute(
                OpenCommands.LogViewer,
                params as any
            ) as any
        } else if (key === ServiceNames.showPerformance) {
            // @ts-ignore
            return this._ctx.app.commands.execute(
                OpenCommands.PerformanceChart,
                {
                    // @ts-ignore
                    chain: params.chain!,
                    // @ts-ignore
                    creatorQueryType: params.creatorQueryType!
                }
            ) as any
        } else if (key === ServiceNames.maybeCreatedWithJupyter) {
            return maybeCreatedWithJupyter(params as Chain) as any
        } else if (key === ServiceNames.getServerRoot) {
            return getServerRoot() as any
        } else if (key === ServiceNames.getDirectoryList) {
            // 如果是 null，它内部会把 Chain.workspace 自动包含
            return this.directoryList as any
        } else if (key === ServiceNames.getUserGroupList) {
            return this._ctx._user.userInfo?.group_list || ([] as any)
        }
        throw new Error(`invokeService ${key} Method not implemented.`)
    }
    hasAbility(name: ExpServiceAbilityNames) {
        const abilityDict = {
            [ExpServiceAbilityNames.openFile]: true,
            [ExpServiceAbilityNames.openJupyter]: false,
            [ExpServiceAbilityNames.stopExperiment]: true,
            [ExpServiceAbilityNames.grafana]: false
        }
        return abilityDict[name] ?? false
    }
    getContainer() {
        return this._node
    }
    _node: HTMLDivElement
    _ctx: Context
    directoryList: Array<string> | null
    editorReadyCheck: () => Promise<void>
}

applyMixins(Experiment2Container, [JupyterBaseContainerAPI])

export class ExperimentPanelHFAppWidgetV2 extends ReactWidget {
    private context: Context
    private app: JupyterFrontEnd
    private exp2StateProps: IExp2StateByProps | null = null
    private exp2App: Experiment2App | null = null

    private isTrainingsWidgetActive = false

    constructor(app: JupyterFrontEnd, ctx: Context) {
        super()
        this.context = ctx
        this.app = app
    }

    private makeCurrentDirectoryList = () => {
        if (
            !this.exp2StateProps ||
            this.exp2StateProps?.queryType === 'chainId'
        ) {
            return null
        }

        const path = this.exp2StateProps.queryValue

        const dItems = path.split('/')
        if (dItems.length === 1) {
            return [CONSTS.WORKSPACE_ROOT_STR]
        } else {
            // Has dir.
            dItems.pop() // Drop the file name.

            const temp_path = []
            const fileList = []
            for (const i of dItems) {
                temp_path.push(i)
                fileList.unshift(temp_path.join('/') + '/')
            }
            fileList.push(CONSTS.WORKSPACE_ROOT_STR)
            return fileList
        }
    }

    private editorReadyCheck = async () => {
        if (
            !this.exp2StateProps ||
            this.exp2StateProps?.queryType === 'chainId'
        ) {
            throw new Error('Editor not found')
        } // 一般不会有这种情况

        const path = this.exp2StateProps.queryValue

        await this.context.editorReadyCheck(path)
    }

    private reCreateApp = () => {
        if (this.exp2App) {
            this.exp2App.stop()
        }
        if (!this.exp2StateProps) {
            return
        }

        const containerDiv = clearAndCreateNewContainer(
            this.node as HTMLDivElement
        )
        const containerAPI = new Experiment2Container(
            containerDiv,
            this.context,
            {
                directoryList: this.makeCurrentDirectoryList(),
                editorReadyCheck: this.editorReadyCheck
            }
        )
        this.exp2App = new Experiment2App(
            (containerAPI as unknown) as Experiment2ContainerAPI &
                BaseContainerAPI
        )

        LevelLogger.info('[side] exp2 app start:', this.exp2StateProps)
        this.exp2App.start(this.exp2StateProps)
    }

    private handleExp2StatePropsChange = (
        nextExp2StateProps: IExp2StateByProps | null
    ) => {
        if (!nextExp2StateProps) {
            this.node.innerHTML = `<div class="exp2-panel no-current">
                <span>${i18n.t(i18nKeys.biz_exp_no_current)}</span>
            </div>`
            this.exp2StateProps = null
        } else {
            if (
                this.exp2StateProps &&
                this.exp2StateProps.mode === nextExp2StateProps.mode &&
                this.exp2StateProps.queryType ===
                    nextExp2StateProps.queryType &&
                this.exp2StateProps.queryValue === nextExp2StateProps.queryValue
            ) {
                return
            } else {
                this.exp2StateProps = nextExp2StateProps
                this.reCreateApp()
            }
        }
    }

    private handleCurrentChanged = (_: any, changed: IFileChangedParam) => {
        let nextExp2StateProps: IExp2StateByProps | null = null

        if (!changed) {
            return
        } else {
            this.isTrainingsWidgetActive = false
            // @ts-ignore
            if (changed.widget._content instanceof TrainingsWidget) {
                LevelLogger.info('[side] current change to Training')
                this.isTrainingsWidgetActive = true
                // @ts-expect-error ignore _content
                const currentChain = changed.widget._content.getCurrentActiveChain() as Chain | null
                if (!currentChain) {
                    nextExp2StateProps = null
                } else {
                    nextExp2StateProps = {
                        queryType: 'chainId',
                        queryValue: currentChain.chain_id,
                        mode: 'readControl'
                    }
                }

                // @ts-expect-error ignore _content
            } else if (changed.widget._content instanceof LogWidgetExp) {
                const queryType: IQueryType = /.*\s\-\sLog$/.test(
                    changed.widget!.title.label
                )
                    ? 'path'
                    : 'chainId'
                if (queryType === 'path') {
                    const changedName = /^(.*?)\s\-\sLog$/g.exec(
                        changed.widget!.title.label
                    )![1]
                    nextExp2StateProps = {
                        queryType,
                        queryValue: changedName,
                        mode: 'readControl'
                    }
                } else {
                    // @ts-expect-error ignore _content
                    const chain = changed.widget!._content!._chain as Chain
                    nextExp2StateProps = {
                        queryType,
                        queryValue: chain.chain_id,
                        mode: 'readControl'
                    }
                }
            } else if (
                // @ts-expect-error ignore _content
                changed.widget._content instanceof PerformanceChartWidget
            ) {
                const perfInstance = (changed.widget as any)
                    ._content as PerformanceChartWidget
                const queryType: IQueryType = perfInstance.creatorQueryType
                if (queryType === 'path') {
                    nextExp2StateProps = {
                        queryType,
                        queryValue: perfInstance.chain.showName || '',
                        mode: 'readControl'
                    }
                } else {
                    const chain = perfInstance.chain
                    nextExp2StateProps = {
                        queryType,
                        queryValue: chain.chain_id,
                        mode: 'readControl'
                    }
                }
            } else if (
                // @ts-expect-error because schema error is ok
                changed.widget.context &&
                // @ts-expect-error because schema error is ok
                changed.widget.context._path &&
                // @ts-expect-error because schema error is ok
                (changed.widget.context._path.toLowerCase().endsWith('.py') ||
                    // @ts-expect-error because schema error is ok
                    changed.widget.context._path.toLowerCase().endsWith('.sh'))
            ) {
                // @ts-ignore
                const changedName = changed.widget.context._path
                nextExp2StateProps = {
                    queryType: 'path',
                    queryValue: changedName,
                    mode: 'readWrite'
                }
            }

            this.handleExp2StatePropsChange(nextExp2StateProps)
        }
    }

    private listenInvokeChainUpdate = (ctx: Context, args: ChainUpdateArgs) => {
        /**
         * 这个有两个情况：
         * 1. 自己点击的，这种情况肯定 training 是 active
         * 2. 初始化记忆过来的，这个时候如果不忽视这里有可能造成打开的文件和侧边栏不一致！
         */
        if (!this.isTrainingsWidgetActive) {
            LevelLogger.info(
                '[side] listenInvokeChainUpdate skip, training not active'
            )
            return
        }

        const nextExp2StateProps: IExp2StateByProps = {
            queryType: 'chainId',
            queryValue: args.chainId,
            mode: 'readControl'
        }
        this.handleExp2StatePropsChange(nextExp2StateProps)
    }

    onAfterAttach(msg: any) {
        super.onAfterAttach(msg)
        /*
         * currentWidgetChanged:
         * 文件改名称的时候会触发
         * 定位到一个新的 py 文件的时候会触发
         */
        this.context.currentWidgetChanged.connect(
            this.handleCurrentChanged,
            this
        )
        /*
         * emitChainChanged:
         * Trainings 点击 item
         * **/
        this.context.invokeChainUpdated.connect(
            this.listenInvokeChainUpdate,
            this
        )
    }

    dispose() {
        this.context.invokeChainUpdated.disconnect(
            this.listenInvokeChainUpdate,
            this
        )
        this.context.currentWidgetChanged.disconnect(
            this.handleCurrentChanged,
            this
        )
        super.dispose()
    }

    render() {
        return (
            <div className="exp2-panel no-current">
                <span>{i18n.t(i18nKeys.biz_exp_no_current)}</span>
            </div>
        )
    }
}
