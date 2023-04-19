/**
 * The side panel used for show cluster status , message, user quota.
 */

import { JupyterFrontEnd } from '@jupyterlab/application'

import { WidgetTracker } from '@jupyterlab/apputils'

import { Context } from '@/contextManager'

import { labIcon } from '../../uiComponents'

import { HideCommands, OpenCommands, RequiredPlugins } from '../../consts'

import { WidgetComponentBase } from '../base'

import { InfoPanelWidget } from './panel'

import { Panel } from '@lumino/widgets'
import { CountlyEventKey, JupyterCountly } from '@/utils/countly/countly'
import { i18n, i18nKeys } from '@hai-platform/i18n'

export class InfoPanel extends WidgetComponentBase<Panel> {
    constructor(app: JupyterFrontEnd, context: Context) {
        super({
            app: app,
            widgetTitle: void 0,
            widgetIcon: labIcon.infoIcon,
            widgetArea: 'right',
            widgetShowMode: void 0,
            widgetCaption: () => i18n.t(i18nKeys.biz_info_panel_caption),
            widgetRank: 11,
            context: context
        })

        this._context = context
    }

    register(p: RequiredPlugins) {
        const { commands } = this._app
        const { restorer } = p

        commands.addCommand(OpenCommands.InfoPanel, {
            label: 'AiLab Info Panel',
            caption: 'Open Info Panel',
            execute: () => {
                this.showWidget()
            }
        })

        commands.addCommand(HideCommands.InfoPanel, {
            label: 'AiLab Info Panel',
            caption: 'Hide Info Panel',
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

        // make a widgetTracker to track this, and it will reopen at workspace restore.
        this._tracker = new WidgetTracker<Panel>({
            namespace: 'jupyterlab_hai_platform_ext/InfoPanel'
        })
        restorer.restore(this._tracker, {
            command: OpenCommands.InfoPanel,
            name: () => 'jupyterlab_hai_platform_ext/InfoPanel'
        })

        this.showWidget()
    }

    _createWidget() {
        JupyterCountly.safeReport(CountlyEventKey.InfoPanelOpen)
        this._widget = new Panel()
        this._widget.id = 'hf-info-panel'
        this._widget.addWidget(new InfoPanelWidget(this._context!))
        this._widget.addClass('hf')
        this._widget.addClass('info')
        this._widget.node.style.minWidth = '270px'
        return this._widget
    }
    _tracker: WidgetTracker<Panel> | undefined
}
