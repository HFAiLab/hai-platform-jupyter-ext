/**
 * The side panel used for create experiment or show bound status.
 */
import { JupyterFrontEnd } from '@jupyterlab/application'
import { WidgetTracker } from '@jupyterlab/apputils'
import { Context } from 'src/contextManager'
import { labIcon } from '../../uiComponents'
import { HideCommands, OpenCommands, RequiredPlugins } from '../../consts'
import { WidgetComponentBase } from '../base'
import { Panel } from '@lumino/widgets'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { ExperimentPanelHFAppWidgetV2 } from './hfappWidget2'

// 该文件主要负责创建和注册 widget 给 jupyterlab
export class ExperimentPanel extends WidgetComponentBase<Panel> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetTitle: undefined,
            widgetIcon: labIcon.experimentIcon,
            widgetArea: 'right',
            widgetCaption: i18n.t(i18nKeys.biz_exp_experiment_detail),
            widgetRank: -1,
            context: context
        })
        this._rw = null

        this._tracker = new WidgetTracker<Panel>({
            namespace: 'jupyterlab_hai_platform_ext/ExperimentPanel'
        })
    }

    register(p: RequiredPlugins) {
        const { commands } = this._app
        const { restorer, hfMenu } = p

        commands.addCommand(OpenCommands.ExperimentSidePanel, {
            label: 'HF-AiLab Experiment Panel',
            caption: 'Open Main Panel',
            execute: () => {
                this.showWidget()
            }
        })

        commands.addCommand(HideCommands.ExperimentSidePanel, {
            label: 'HF-AiLab Experiment Panel',
            caption: 'Hide Main Panel',
            execute: () => {
                try {
                    if (
                        typeof (this._app.shell as any).collapseRight ===
                        'function'
                    ) {
                        ;(this._app.shell as any).collapseRight()
                    }
                } catch {}
            }
        })

        if (hfMenu) {
            hfMenu.addItem({ command: OpenCommands.ExperimentSidePanel })
        }

        // make a widgetTracker to track this, and it will reopen at workspace restore.
        restorer.restore(this._tracker, {
            command: OpenCommands.ExperimentSidePanel,
            name: () => 'jupyterlab_hai_platform_ext/ExperimentPanel'
        })

        commands.addCommand(OpenCommands.ShowSidePanel, {
            label: 'HF-AiLab Experiment Panel',
            caption: 'Assign a chain to side panel',
            execute: args => {
                if (!this._widget?.isVisible) {
                    this.showWidget()
                }
            }
        })

        this.showWidget()
    }

    _createWidget() {
        this._widget = new Panel()
        this._widget.id = 'hf-main-panel'
        this._rw = new ExperimentPanelHFAppWidgetV2(this._app, this._context!)
        this._rw.addClass('reactWidgetDiv')
        this._widget.addWidget(this._rw)
        this._widget.node.style.minWidth = '270px'
        this._widget.addClass('hf')
        this._widget.addClass('expSidePanel')

        return this._widget
    }
    _tracker: WidgetTracker<Panel>
    _rw: ExperimentPanelHFAppWidgetV2 | null
}
