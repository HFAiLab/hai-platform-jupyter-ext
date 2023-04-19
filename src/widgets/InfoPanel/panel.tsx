import { ReactWidget } from '@jupyterlab/apputils'
import { Context } from '@/contextManager'
import React from 'react'
import { uikit } from '../../uiComponents'
import { Quota } from '@/bizComponents/quota'
import { ServiceContext } from '@/uiComponents/reactContext'
import { MessageItem } from '@/bizComponents/messager'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { GlobalOverview } from '@/bizComponents/globalOverview'
export class InfoPanelWidget extends ReactWidget {
    constructor(context: Context) {
        super()
        this._context = context

        // token 更新之后刷新状态
        this.update = this.update.bind(this)
        this._context._user.settingChanged.connect(this.update)
        this._context.messageManager.messageUpdated.connect(this.update)

        this.ready = true
    }

    render(): JSX.Element {
        return (
            <div className="wrapper">
                <uikit.Collapse desc={i18n.t(i18nKeys.biz_info_platform_title)}>
                    <ServiceContext.Provider
                        value={{ ctx: this._context, forceUpdate: this.update }}
                    >
                        {this.ready && <GlobalOverview update={this.update} />}
                    </ServiceContext.Provider>
                </uikit.Collapse>
                <uikit.Collapse desc={i18n.t(i18nKeys.biz_notifications)}>
                    <div
                        className="notifications"
                        style={{
                            padding: '10px 0 10px 0'
                        }}
                    >
                        {this._context.messageManager.allMessages.length ? (
                            this._context.messageManager.allMessages.map(
                                item => <MessageItem {...item} />
                            )
                        ) : (
                            <div className="no-message">
                                {i18n.t(i18nKeys.biz_no_notification)}
                            </div>
                        )}
                    </div>
                </uikit.Collapse>
                <uikit.Collapse desc={i18n.t(i18nKeys.biz_quota)}>
                    <div
                        style={{
                            textAlign: 'center'
                        }}
                    >
                        <ServiceContext.Provider
                            value={{
                                ctx: this._context,
                                forceUpdate: this.update
                            }}
                        >
                            <Quota />
                        </ServiceContext.Provider>
                    </div>
                </uikit.Collapse>
            </div>
        )
    }

    ready = false
    _context: Context
}
