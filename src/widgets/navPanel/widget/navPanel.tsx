// /**
//  * The navigator panel of the extension
//  */

import { JupyterFrontEnd } from '@jupyterlab/application'
import React, { MouseEvent, useEffect, useState } from 'react'
import { ReactWidget } from '@jupyterlab/apputils'
import { Context } from '@/contextManager'
import { VERSION, OpenCommands, docURL } from '../../../consts'
import { icons, SVGWrapper } from '../../../uiComponents'
import { getToken, ErrorStatus, getGlobalErrorHandler } from '../../../utils'
import HFLogger from '@hai-platform/logger'
import { getThemeColor } from '@/utils/dom'
// import ThemePicker from "./sketchPicker";
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { MessageItem } from '@/bizComponents/messager'
import { downloadDialog } from '@hai-platform/studio-pages/lib/ui-components/dialog'

const commandMap = {
    User: OpenCommands.User,
    Dashboard: OpenCommands.Dashboard,
    MyTrainings: OpenCommands.MyTrainings,
    AvailablePath: OpenCommands.AvailablePath
} as { [widgetName: string]: string }

const NavPanelComponent = (props: { context: Context }): JSX.Element => {
    const globalErrorHandler = getGlobalErrorHandler()
    const [errorStatus, setErrorStatus] = useState<ErrorStatus>(
        globalErrorHandler.errorStatus
    )

    const errorStatusListener = (errorStatus: ErrorStatus) => {
        setErrorStatus(errorStatus)
    }

    useEffect(() => {
        globalErrorHandler.addListener(errorStatusListener)
        return () => {
            globalErrorHandler.removeListener(errorStatusListener)
        }
    }, [errorStatus])

    const handleListClick = (e: MouseEvent<HTMLElement>): void => {
        const el = e.nativeEvent.target as HTMLElement
        const n = el.dataset?.n

        /**
         * @hf/trainings_change:
         * 暂时先不特殊处理了
         */
        // if (n == `MyTrainings`) {
        //     if (!ifInTrainingsWorkspace()) {
        //         // 如果不是在 trainings 打开 trainings 页面，需要新建
        //         openTrainingsNewTab();
        //         return;
        //     }
        // }

        if (n && commandMap[n]) {
            props.context._app.commands.execute(commandMap[n])
        }
    }

    return (
        <>
            <div className="flexbox">
                <div className="nav-title-wrapper bp3-dark">
                    <div className="nav-title-logo">
                        {' '}
                        <SVGWrapper
                            svg={icons.highflyerText}
                            width="162"
                            height="22"
                            fill={getThemeColor()}
                        ></SVGWrapper>
                    </div>
                    <div className="nav-title-ver">extension {VERSION}</div>
                    <div className="borderline"></div>
                </div>
                <div className="nav-list-wrapper" onClick={handleListClick}>
                    <ul className="type">
                        <li className="item ptr">
                            <span data-n="MyTrainings">
                                {i18n.t(i18nKeys.biz_nav_trainings)}
                            </span>
                        </li>
                        {/* <li className="item ptr" data-n="Dashboard">Dashboard</li> */}
                        <li className="item ptr">
                            <span data-n="AvailablePath">
                                {i18n.t(i18nKeys.biz_nav_storage)}
                            </span>
                        </li>
                    </ul>
                </div>

                <div className="messages">
                    {!getToken() && (
                        // 无 token 的提示，一般不会出现
                        <MessageItem
                            closeable={false}
                            title={i18n.t(i18nKeys.biz_tip)}
                            type="warning"
                            messageId={0}
                            important={true}
                            content={'token not found'}
                            date={new Date()}
                            assigned_to={'none'}
                            expiry={new Date()}
                        >
                            <p>{i18n.t(i18nKeys.biz_token_tip_title)}</p>
                            <p
                                style={{ whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{
                                    __html: i18n.t(i18nKeys.biz_token_tip_desc)
                                }}
                            ></p>
                        </MessageItem>
                    )}
                    {/* important messages */}
                    {props.context.messageManager.importantMessages.map(
                        item => (
                            <MessageItem {...item} closeable={false} />
                        )
                    )}
                </div>
            </div>

            <div className="documentation">
                {props.context._user.in && (
                    <>
                        <a href={docURL} target="_blank">
                            {i18n.t(i18nKeys.biz_user_guide)}
                        </a>
                        <span> | </span>
                    </>
                )}
                <a
                    onClick={async () => {
                        const accept = await downloadDialog(
                            i18n.t(i18nKeys.biz_error_report_desc)
                        )
                        if (accept) {
                            HFLogger.triggerSaveBundle()
                        }
                    }}
                    className={
                        errorStatus == ErrorStatus.ErrorCatched
                            ? 'errorDetected'
                            : ''
                    }
                >
                    {i18n.t(i18nKeys.biz_error_report)}
                </a>
                {/* <ThemePicker /> */}
                <div className="logo">
                    <SVGWrapper
                        svg={icons.highflyerFooter}
                        width="86"
                        height="18"
                    ></SVGWrapper>
                </div>
            </div>
        </>
    )
}

export class NavPanelWidget extends ReactWidget {
    constructor(app: JupyterFrontEnd, context: Context) {
        super()
        this._context = context

        // token 更新之后刷新状态
        this.update = this.update.bind(this)
        this._context._user.settingChanged.connect(this.update)
        this._context.messageManager.messageUpdated.connect(this.update)
    }
    render(): JSX.Element {
        return <NavPanelComponent context={this._context} />
    }
    _context: Context
}
