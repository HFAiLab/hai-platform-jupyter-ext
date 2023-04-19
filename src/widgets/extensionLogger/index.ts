import { JupyterFrontEnd } from '@jupyterlab/application'

import { MainAreaWidget } from '@jupyterlab/apputils'

import { Widget } from '@lumino/widgets'

import { Context } from '@/contextManager'

import { ExtLogHandler } from '../../extLogHandler'

import { OpenCommands, RequiredPlugins } from '../../consts'

import { labIcon } from '../../uiComponents'

import { WidgetComponentBase } from '../base'

import { ExtLoggerWidget } from './widgets'

export class HFExtensionLogger extends WidgetComponentBase<MainAreaWidget> {
    register(p?: RequiredPlugins): void {
        const { commands } = this._app
        const { hfMenu } = p!
        // Add a command to open log widget.
        commands.addCommand(OpenCommands.ExtensionLogs, {
            label: 'Show Extension Logs',
            caption: "View Extension 's log",
            execute: () => {
                this.showWidget()
            }
        })
        if (hfMenu) {
            hfMenu.addItem({ command: OpenCommands.ExtensionLogs })
        }
    }

    _createWidget(): MainAreaWidget<Widget> {
        this._widget = new MainAreaWidget({
            content: new ExtLoggerWidget(
                this._extlogHandler.logUpdatedSginal,
                this._extlogHandler.messages
            )
        })
        this._widget.id = 'jupyterlab_hai_platform_ext-extLogger'
        return this._widget
    }

    constructor(app: JupyterFrontEnd, ctx: Context) {
        super({
            app: app,
            widgetIcon: labIcon.hfIconColor,
            widgetShowMode: 'split-bottom',
            widgetTitle: 'HFAILab Extension Logger'
        })

        this._extlogHandler = ctx._extLogHandler
        this._widget = null
    }

    _extlogHandler: ExtLogHandler
}
