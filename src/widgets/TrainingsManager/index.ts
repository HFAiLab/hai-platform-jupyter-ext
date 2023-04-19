/**
 * 训练管理 tab
 * 本文件给出了一个如何利用 restore 机制存储当前 widget 信息的一个示例
 */

import { ILayoutRestorer, JupyterFrontEnd } from '@jupyterlab/application'
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils'
import { labIcon } from '../../uiComponents'
import { Context } from '@/contextManager'
import { OpenCommands, RequiredPlugins } from '../../consts'
import { WidgetComponentBase } from '../base'
import { TrainingsWidget } from './widget'
import { CountlyEventKey, JupyterCountly } from '@/utils/countly/countly'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { ExpsPageManageState } from '@hai-platform/studio-pages/lib/entries/manage/schema'

export class TrainingsWindow extends WidgetComponentBase<MainAreaWidget> {
    currentManageState: ExpsPageManageState | null = null

    getCurrentManageState = () => {
        return this.currentManageState
    }

    setCurrentManageState = (state: ExpsPageManageState) => {
        this.currentManageState = state
        this.saveWidget()
    }

    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetIcon: labIcon.hfIconColor,
            widgetShowMode: void 0,
            widgetTitle: () => i18n.t(i18nKeys.biz_exp_training_history_title),
            context: context
        })
        this._widget = null
    }

    getWidgetArgs = () => {
        return {
            page: 1,
            pageSize: 1
        }
    }

    register(p: RequiredPlugins) {
        const app = this._app

        // Add a global open command
        const { commands } = app
        commands.addCommand(OpenCommands.MyTrainings, {
            label: 'HFAiLab Trainings',
            caption: 'HFAiLab Trainings',
            icon: labIcon.trainingsIcon,
            execute: args => {
                if (args.manageState) {
                    this.currentManageState = (args.manageState as unknown) as ExpsPageManageState
                }
                this.showWidget()
            }
        })

        this.restorer = p.restorer

        this._tracker = new WidgetTracker<MainAreaWidget>({
            namespace: 'jupyterlab_hai_platform_ext/MyTrainings'
        })

        this.restorer.restore(this._tracker, {
            command: OpenCommands.MyTrainings,
            name: () => 'jupyterlab_hai_platform_ext/MyTrainings',
            args: () => {
                return { manageState: this.getCurrentManageState() || {} }
            }
        })
    }

    saveWidget() {
        if (!this._tracker) {
            return
        }

        if (this._widget) {
            this._tracker.save(this._widget)
        }
    }

    _createWidget() {
        JupyterCountly.safeReport(CountlyEventKey.TrainingsOpen)
        this._widget = new MainAreaWidget({
            content: new TrainingsWidget(this._context!, {
                getCurrentState: this.getCurrentManageState,
                setCurrentState: this.setCurrentManageState
            })
        })
        this._widget.id = 'jupyterlab_hai_platform_ext-trainingWindow'
        return this._widget
    }

    restorer?: ILayoutRestorer

    _context?: Context
}
