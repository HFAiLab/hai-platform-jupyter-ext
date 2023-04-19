/**
 * AvailablePath
 */
import { JupyterFrontEnd } from '@jupyterlab/application'

import { MainAreaWidget } from '@jupyterlab/apputils'

import { labIcon } from '../../uiComponents'

import { Context } from '@/contextManager'

import { OpenCommands, RequiredPlugins } from '../../consts'

import { WidgetComponentBase } from '../base'

import { AvailablePathWidget } from './widget'
import { i18n, i18nKeys } from '@hai-platform/i18n'

export class AvailablePathWindow extends WidgetComponentBase<MainAreaWidget> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetIcon: labIcon.hfIconColor,
            widgetShowMode: void 0,
            widgetTitle: () => i18n.t(i18nKeys.biz_avail_path_title),
            context: context
        })
        this._widget = null
    }

    register(p: RequiredPlugins) {
        const app = this._app

        // Add a global open command
        const { commands } = app
        commands.addCommand(OpenCommands.AvailablePath, {
            label: 'HFAILab Available Path',
            caption: 'HFAILab Available Path',
            execute: args => {
                this.showWidget()
            }
        })
    }

    _createWidget() {
        this._widget = new MainAreaWidget({
            content: new AvailablePathWidget(this._context!)
        })
        this._widget.id = 'jupyterlab_hai_platform_ext-AvailablePathWindow'
        return this._widget
    }

    _context?: Context
}
