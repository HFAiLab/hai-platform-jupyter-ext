/**
 * Show performance chart.
 */
import { PerformanceChartWidget } from './widget'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { MainAreaWidget } from '@jupyterlab/apputils'
import { labIcon } from '../../uiComponents'
import { Context, IQueryType } from '@/contextManager'
import { OpenCommands, RequiredPlugins } from '../../consts'
import { WidgetComponentBase } from '../base'
import { addWidgetRefToWindow } from '@/utils'
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import {
    PerfDataInterval,
    PerfQueryType
} from '@hai-platform/studio-pages/lib/entries/perf/widgets/ChartBlock'

/**
 * No refresh function, just fetch log when called.
 */
export class HFPerformanceChart extends WidgetComponentBase<
    PerformanceChartWidget
> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetIcon: labIcon.hfIconColor,
            widgetShowMode: 'tab-after',
            widgetTitle: 'Perf',
            context: context
        })
        this._widget = null
    }

    openNewWindow(
        chain: Chain,
        defaultRank: number,
        defaultType: PerfQueryType,
        continuous: boolean,
        dup: boolean,
        creatorQueryType: IQueryType,
        dataInterval: PerfDataInterval
    ) {
        const w = new MainAreaWidget({
            content: new PerformanceChartWidget(
                this._context!,
                this.settingRegistry!,
                chain,
                defaultRank,
                defaultType,
                continuous,
                creatorQueryType,
                dataInterval
            )
        })
        // w.title.label = 'Perf - ' + chain.showName
        w.title.label = `${i18n.t(i18nKeys.biz_exp_perf)} ${
            creatorQueryType === 'chainId' ? '|' : '-'
        } ${chain.showName}`
        w.title.icon = this._widgetIcon
        w.title.caption = w.title.label
        const showMode = dup ? 'split-right' : this._widgetShowMode
        this._app.shell.add(w, this._widgetArea, {
            mode: showMode,
            rank: this._widgetRank
        })
        addWidgetRefToWindow(w.id, w)
    }

    register(p: RequiredPlugins) {
        const app = this._app
        this.settingRegistry = p.settingRegistry

        // Add a global open command
        const { commands } = app
        commands.addCommand(OpenCommands.PerformanceChart, {
            label: 'HF-AiLab Performance Chart',
            caption: 'Open Performance Chart',
            execute: args => {
                const chain = (args.chain as unknown) as Chain
                const rank = args.rank as number
                const type = args.type as PerfQueryType
                const continuous = args.continuous as boolean
                const dup = args.duplicate as boolean
                const creatorQueryType =
                    (args.creatorQueryType as IQueryType) || 'chainId'
                const dataInterval = args.dataInterval as PerfDataInterval
                this.openNewWindow(
                    chain,
                    rank,
                    type,
                    continuous,
                    dup,
                    creatorQueryType,
                    dataInterval
                )
            }
        })
    }

    // 实际使用时不会调用_createWidget
    //@ts-ignore
    _createWidget() {
        return
    }

    settingRegistry: ISettingRegistry | null = null
    _context?: Context
}
