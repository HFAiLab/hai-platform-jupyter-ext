/* eslint-disable class-methods-use-this */
import { GlobalAilabServerClient } from '@/serverConnection/ailabServer'
import { VERSION } from '@/consts'
import { AppToaster } from '@/utils/toast'
import { Button } from '@hai-ui/core'
import React from 'react'
import { AilabServerApiName } from '@hai-platform/client-ailab-server'

enum ShowTipStatus {
    NOT_SHOW = 'not_show',
    SHOWING = 'showing',
    SHOWED = 'showed'
}

enum TipTypes {
    OPEN_TOO_LONG = 'open_too_long',
    NEW_VERSION = 'new_version'
}

enum TipActions {
    RETURN_TO_CONTAINER_LIST = 'return_to_container_list',
    RELOAD = 'reload',
    NONE = 'none'
}

const getShowTipByType = (tipType: TipTypes, action: TipActions) => {
    switch (tipType) {
        case TipTypes.OPEN_TOO_LONG:
            return '检测到打开本页面已经超过 14 天，为获得更好的使用体验，建议刷新页面获取更新'
        case TipTypes.NEW_VERSION:
        default:
            if (action === TipActions.RETURN_TO_CONTAINER_LIST) {
                return '检测到新版本 (大版本) 发布，为获得更好的使用体验，建议重启容器以获取更新'
            }
            return '检测到新版本发布，为获得更好的使用体验，建议刷新页面获取更新'
    }
}

const getShowBtnTipByType = (tipType: TipTypes, action: TipActions) => {
    switch (tipType) {
        case TipTypes.OPEN_TOO_LONG:
            return '立即刷新'
        case TipTypes.NEW_VERSION:
        default:
            if (action === TipActions.RETURN_TO_CONTAINER_LIST) {
                return '返回容器管理控制台'
            }
            return '立即刷新'
    }
}

const execAction = (action: TipActions) => {
    if (action === TipActions.RELOAD) {
        window.location.reload()
        return
    }

    if (action === TipActions.RETURN_TO_CONTAINER_LIST) {
        // 这个逻辑需要用户补充具体的行为逻辑，例：window.open('http://xxx')
            }
}

// 这个网页最多开多久就触发 toast: 7 天
const APP_SHOULD_RELOAD_TIME = 14 * 24 * 60 * 60 * 1000

// 多久检查一次：24 小时
const APP_CHECK_TIP_TIME = 24 * 60 * 60 * 1000

// 当这次弹窗被 dismiss 之后，多久可以弹下一次：3 天
const SHOW_TIP_NEXT_AFTER_DISMISS = 3 * 24 * 60 * 60 * 1000
export class RefreshNoticeManager {
    appStartTime = Date.now()

    showTipStatus = ShowTipStatus.NOT_SHOW

    lastCloseTipTime: number | null = null

    currentShowTipType: TipTypes | null = null

    intervalId: number | null = null

    start() {
        this.stop()
        this.intervalId = window.setInterval(() => {
            this.checkShouldShowTip()
        }, APP_CHECK_TIP_TIME)
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
    }

    // 是否应该展示 Tip 了
    checkShouldShowTip = async () => {
        if (this.showTipStatus === ShowTipStatus.SHOWING) {
            return
        }

        if (
            this.lastCloseTipTime &&
            Date.now() - this.lastCloseTipTime < SHOW_TIP_NEXT_AFTER_DISMISS
        ) {
            return
        }

        const checkNewVersionResult = await this.checkHasNewVersion()

        if (checkNewVersionResult.hasNew) {
            this.showTip(TipTypes.NEW_VERSION, checkNewVersionResult.action)
        }

        const checkTooLongResult = await this.checkOpenTimeTooLong()

        if (checkTooLongResult.hasNew) {
            this.showTip(TipTypes.NEW_VERSION, checkTooLongResult.action)
        }
    }

    showTip = (tipType: TipTypes, action: TipActions) => {
        this.showTipStatus = ShowTipStatus.SHOWING
        AppToaster.show({
            message: (
                <div className="refresh-notice-container">
                    <p className="refresh-notice-desc">
                        {getShowTipByType(tipType, action)}
                    </p>
                    <Button
                        outlined
                        small
                        intent="primary"
                        className="refresh-notice-btn"
                        onClick={() => {
                            execAction(action)
                        }}
                    >
                        {getShowBtnTipByType(tipType, action)}
                    </Button>
                </div>
            ),
            timeout: 0,
            intent: 'none',
            onDismiss: () => {
                this.lastCloseTipTime = Date.now()
                this.showTipStatus = ShowTipStatus.SHOWED
            }
        })
    }

    checkHasNewVersion = async (): Promise<{
        hasNew: boolean
        action: TipActions
    }> => {
        const requestVersionResult = await GlobalAilabServerClient.request(
            AilabServerApiName.INTERNAL_PLATFORM_GET_LATEST_APP_VERSION,
            {
                app_name: 'jupyter',
                base_app_version: 'online' // jupyter 的测试环境没什么升级的必要
            }
        )
        if (!requestVersionResult.version || /-alpha.*?$/.test(VERSION)) {
            return {
                hasNew: false,
                action: TipActions.NONE
            }
        }

        const currentVersionList = VERSION.replace(/-alpha.*?$/, '').split('.')
        const requestVersionList = requestVersionResult.version
            .replace(/-alpha.*?$/, '')
            .split('.')

        if (
            VERSION === requestVersionResult.version ||
            currentVersionList.length !== 3 ||
            requestVersionList.length !== 3
        ) {
            return {
                hasNew: false,
                action: TipActions.NONE
            }
        }

        if (
            Number(requestVersionList[0]) > Number(currentVersionList[0]) ||
            (Number(requestVersionList[0]) === Number(currentVersionList[0]) &&
                Number(requestVersionList[1]) > Number(currentVersionList[1]))
        ) {
            return {
                hasNew: true,
                action: TipActions.RETURN_TO_CONTAINER_LIST
            }
        }

        if (
            Number(requestVersionList[0]) === Number(currentVersionList[0]) &&
            Number(requestVersionList[1]) === Number(currentVersionList[1]) &&
            Number(requestVersionList[2]) > Number(currentVersionList[2])
        ) {
            // 这里有一个默认假设：version 都是有效的
            return {
                hasNew: true,
                action: TipActions.RELOAD
            }
        }

        return {
            hasNew: false,
            action: TipActions.NONE
        }
    }

    checkOpenTimeTooLong() {
        const tooLong = Date.now() - this.appStartTime > APP_SHOULD_RELOAD_TIME
        return {
            hasNew: tooLong,
            action: tooLong ? TipActions.RELOAD : TipActions.NONE
        }
    }
}

// export const GlobalRefreshNoticeManager = new RefreshNoticeManager()
