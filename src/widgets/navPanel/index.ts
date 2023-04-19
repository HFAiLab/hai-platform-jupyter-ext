import { JupyterFrontEnd } from '@jupyterlab/application'

import { WidgetTracker } from '@jupyterlab/apputils'

import { Panel } from '@lumino/widgets'

import { Context } from '@/contextManager'

import { labIcon } from '../../uiComponents'

import { OpenCommands, RequiredPlugins } from '../../consts'

import { WidgetComponentBase } from '../base'

import { NavPanelWidget } from './widget/navPanel'

export class NavigatorPanel extends WidgetComponentBase<Panel> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetTitle: void 0,
            widgetIcon: labIcon.hfIconColor,
            widgetArea: 'left',
            widgetShowMode: void 0,
            widgetCaption: 'HFAILab Navigator Panel',

            // Let the icon at bottom.
            widgetRank: 10,
            context: context
        })
    }

    register(p?: RequiredPlugins): void {
        const { commands } = this._app
        // Add a command to open log widget.
        commands.addCommand(OpenCommands.NavigatorPanel, {
            label: 'HF-AiLab Navigator Panel',
            caption: 'Open Navigator Panel',
            execute: () => {
                this.showWidget()
            }
        })

        this._tracker = new WidgetTracker<Panel>({
            namespace: 'jupyterlab_hai_platform_ext/Navigator'
        })

        this.showWidget()
    }

    _createWidget() {
        this._widget = new Panel()
        const w = new NavPanelWidget(this._app, this._context!)
        w.addClass('hf')
        w.addClass('navPanel')
        this._widget.id = 'hf-nav-panel'
        this._widget.addWidget(w)
        return this._widget
    }
}
