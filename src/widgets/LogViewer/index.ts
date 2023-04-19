/**
 * Show experiment's log.
 */

// @ts-ignore
import { LogWidgetExp } from './widget'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { MainAreaWidget } from '@jupyterlab/apputils'
import { WidgetTracker } from '@jupyterlab/apputils'
import { labIcon } from '../../uiComponents'
import { Context, IQueryType, ISidePanelChainUpdated } from '@/contextManager'
import { OpenCommands, RequiredPlugins } from '../../consts'
import { WidgetComponentBase } from '../base'
// @ts-ignore
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'
import _ from 'lodash'
import { ISettingRegistry } from '@jupyterlab/settingregistry'

type ILogItem = {
    widget: MainAreaWidget<LogWidgetExp>
    type: 'path' | 'chainId'
    openAt: Date
}

type ILogPool = Array<ILogItem>

/**
 * Log viewer, auto refresh when context.bound changed or updated.
 */
export class HFLogViewer extends WidgetComponentBase<MainAreaWidget> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetIcon: labIcon.log14Icon,
            widgetShowMode: 'split-bottom',
            widgetTitle: 'HFAILab Log Viewer',
            context: context
        })
        // @ts-ignore
        this._widget = null

        this._pool = []
        this._tracker
        this._handleSidePanelChainUpdated = this._handleSidePanelChainUpdated.bind(
            this
        )
        this._context!.sidePanelChainUpdated.connect(
            this._handleSidePanelChainUpdated,
            this
        )
    }

    register(p: RequiredPlugins) {
        const app = this._app
        const { restorer } = p

        // Add a global open command
        const { commands } = app

        commands.addCommand(OpenCommands.LogViewer, {
            label: 'HF-AiLab Log Viewer',
            caption: 'Open Log Viewer',
            execute: args => {
                const chain = ((args.chain as unknown) as Chain) ?? null
                const rank = (args.rank as number) ?? 0
                const queryType =
                    ((args.queryType as unknown) as IQueryType) ?? 'chainId'
                const ignoreRank =
                    ((args.ignoreRank as unknown) as boolean) ?? false

                if (!chain) {
                    return
                }
                this._handleCommand({ chain, rank, queryType, ignoreRank })
            }
        })

        // Add a widgetTracker to restore this window.
        this._tracker = new WidgetTracker<MainAreaWidget>({
            namespace: 'jupyterlab_hai_platform_ext-LogViewer'
        })

        if (restorer) {
            // 暂时不加到 restore 里面
            // restorer.restore(this._tracker, {
            //     command: OpenCommands.LogViewer,
            //     name: () => 'jupyterlab_hai_platform_ext-LogViewer'
            // })
        }
    }
    get poolUsed() {
        this._pool = this._pool.filter(i => !i.widget.isDisposed)
        return this._pool.length
    }

    get poolMaxSize() {
        return Math.max(
            (this._context?._user.settings.maxLogViewer as number) ?? 1,
            1
        )
    }

    // 多LOG窗口模式下已经没用了
    _createWidget() {
        const logViewerInstance = new LogWidgetExp(
            this._context!,
            this.settingRegistry!
        )
        this._widget = new MainAreaWidget({ content: logViewerInstance })
        this._widget.id = 'jupyterlab_hai_platform_ext-LogViewer'
        return this._widget
    }

    // 获取一个要被替换掉的log窗口
    _getWidgetFromPool(
        type: 'path' | 'chainId',
        query?: string | number | null,
        justFind?: boolean
    ): { item: ILogItem | null; found: boolean } {
        this._pool = this._pool.filter(i => !i.widget.isDisposed)

        // 参数不为空，则先查找
        if (query) {
            let alreadyOpened: Array<ILogItem> = []
            if (type === 'chainId') {
                alreadyOpened = this._pool.filter(
                    i =>
                        i.type === 'chainId' &&
                        i.widget.content._chain?.chain_id === query
                )
            }
            if (type === 'path') {
                alreadyOpened = this._pool.filter(
                    i =>
                        i.type === 'path' &&
                        i.widget.content._chain?.showName === query
                )
            }
            if (alreadyOpened.length) {
                return { item: alreadyOpened[0], found: true }
            }
        }

        if (justFind) {
            return { item: null, found: false }
        }

        // 如果没到上限，新建一个
        if (this._pool.length < this.poolMaxSize) {
            const logViewer = new LogWidgetExp(
                this._context!,
                this.settingRegistry!
            )

            const widget = new MainAreaWidget({ content: logViewer })
            widget.title.icon = this._widgetIcon
            const item = { openAt: new Date(), type: type, widget } as ILogItem
            this._pool.push(item)
            return { item, found: false }

            // 如果到达上限，根据打开时间返回一个旧的
        } else {
            let i = this._pool[0]
            // 这里替换最早打开的
            for (const item of this._pool) {
                if (!i || item.openAt < i.openAt) {
                    i = item
                }
            }
            return { item: i!, found: false }
        }
    }

    _handleCommand(p: {
        chain: Chain
        rank: number
        queryType: IQueryType
        ignoreRank: boolean
    }) {
        if (!p || !p.chain) {
            return
        }
        let rank = p.rank ?? 0
        const query =
            p.queryType === 'path' ? p.chain.showName : p.chain.chain_id
        const { item, found } = this._getWidgetFromPool(p.queryType, query)
        // 这里主要是照顾 auto show log，点击时，不覆盖之前的rank
        if (found && p.ignoreRank) {
            rank = item!.widget.content?._rank ?? 0
        }
        item!.openAt = new Date()
        item!.type = p.queryType
        item!.widget.content.setChainAndRank(p.chain, rank)
        item!.widget.title.caption = item!.widget.title.label = `${
            p.chain.showName
        } ${p.queryType == 'path' ? '-' : '|'} Log`

        if (p.queryType == 'path') {
            item!.widget.removeClass('q-chain')
            item!.widget.addClass('q-path')
        } else {
            item!.widget.removeClass('q-path')
            item!.widget.addClass('q-chain')
        }

        this.addOrActivateWidget(item!.widget, true)
    }

    _handleSidePanelChainUpdated(_: any, args: ISidePanelChainUpdated | null) {
        if (!args || !args.chain) {
            return
        }
        // 没有活动log的情况下，不打开
        if (!this._pool.length) {
            return
        }

        const chain = args.chain
        if (args.queryType === 'path') {
            const { item, found } = this._getWidgetFromPool(
                'path',
                args.chain.showName,
                true
            )
            // 如果开了，直接active过去
            if (!item) {
                return
            }
            item.openAt = new Date()
            if (found) {
                let newRank =
                    item.widget.content._chain!.chain_id == chain.chain_id
                        ? item.widget.content._rank
                        : 0
                if (newRank >= chain.pods.length) {
                    newRank = 0
                }
                item.widget.content.setChainAndRank(chain, newRank)
            } else {
                item.widget.content.setChainAndRank(chain, 0)
            }
            item.widget.title.caption = item.widget.title.label = chain
                ? `${chain.showName} ${
                      args.queryType == 'path' ? '-' : '|'
                  } Log`
                : 'No selected - Log'
            item.widget.removeClass('q-chain')
            item.widget.addClass('q-path')

            this.addOrActivateWidget(item.widget, false)
        } else {
            // 目前不处理chainId的逻辑
            return
        }
    }

    addOrActivateWidget(
        widget: MainAreaWidget<LogWidgetExp>,
        activate: boolean
    ) {
        if (widget) {
            if (!widget.isAttached) {
                const otherLogItem = this._pool.filter(
                    item => item.widget !== widget
                )
                const lastItem = otherLogItem.length
                    ? _.sortBy(otherLogItem, 'openAt').pop()
                    : null
                if (!lastItem) {
                    this._app.shell.add(widget, this._widgetArea, {
                        mode: this._widgetShowMode,
                        rank: this._widgetRank,
                        activate
                    })
                } else {
                    // 注，从Pool创建widget时并未指定widget.id，因此lastItem.widget.id会是一个uuid
                    this._app.shell.add(widget, this._widgetArea, {
                        mode: 'tab-after',
                        ref: lastItem.widget.id,
                        activate
                    })
                }
            } else {
                activate && this._app.shell.activateById(widget.id)
            }
        }
    }

    _context?: Context
    _pool: ILogPool
    settingRegistry: ISettingRegistry | null = null
}
