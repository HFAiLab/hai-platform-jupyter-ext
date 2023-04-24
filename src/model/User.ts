import { conn } from '../serverConnection/transport'

import { ErrorHandler } from '@hai-platform/studio-pages/lib/utils/errorHandler'

import { setToken } from '../utils/hfaiToken'

import { ISettingRegistry } from '@jupyterlab/settingregistry'
import { Signal } from '@lumino/signaling'
import { GlobalAilabServerClient } from '@/serverConnection/ailabServer'
import { AilabServerApiName } from '@hai-platform/client-ailab-server'
import { convertUserQuotaInfoToQuotaMap, SingleUserInfo } from '@hai-platform/shared'
import type { IQuotaMap } from '@hai-platform/shared'
import { IOFrontier } from '@hai-platform/studio-pages/lib/socket'
import { GlobalApiServerClient } from '../serverConnection/apiServer'
import { ApiServerApiName } from '@hai-platform/client-api-server'

type ISettingItem = number | string | boolean

declare global {
    interface Window {
        _hf_user_if_in: boolean
        _d_mars_server_url: string
        _d_mars_server_host: string
    }
}

/**
 * User info and settings.
 */
export class User {
    fetchingUserInfoPromise: Promise<void> | null = null;

    // userInfo 在最开始初始化的时候就会被获取
    userInfo?: SingleUserInfo
    constructor(errorHandler?: ErrorHandler) {
        this.userName = null
        this.quotaMap = {}
        this._settings = {}
        this._errorHandler = errorHandler
        this._fetchQuotaAt = null
        this._settingChanged = new Signal<this, null>(this)
        this._initDone = false
    }

    addChangeCallback(callback: () => void, thisObj?: any) {
        this._settingChanged.connect(callback, thisObj)
    }

    removeChangeCallback(callback: () => void, thisObj?: any) {
        this._settingChanged.disconnect(callback, thisObj)
    }

    bindTokenLoaded(setting: ISettingRegistry.ISettings) {
        setting.changed.connect(this.tokenChangedHandler, this)
        this.tokenChangedHandler(setting)
    }

    bindSettingLoaded(setting: ISettingRegistry.ISettings) {
        setting.changed.connect(this.settingChangedHandler, this)
        this.settingChangedHandler(setting)
    }

    tokenChangedHandler(s: ISettingRegistry.ISettings): void {
        const received = {} as { [propName: string]: ISettingItem }
        received.token = s.get('token').composite as string
        this.updateToken(received)
        this._settingChanged.emit(null)

        this.fetchQuotaInfo()
    }

    updateToken(s: { [setting: string]: ISettingItem }) {
        this._settings = { ...this._settings, ...s }
        const token = this._settings['token'] ?? ''
        setToken(token as string)
        this.fetchUserInfo(token as string)
    }

    settingChangedHandler(s: ISettingRegistry.ISettings): void {
        const received = {} as { [propName: string]: ISettingItem }
        received.__ar__ = s.get('__auto_refresh__').composite as string
        received.handleCR = s.get('handleCR').composite as boolean
        received.maxLogViewer = s.get('maxLogViewer').composite as number

        // 用于测试环境配置
        received.marsServerURL = s.get('marsServerURL').composite as string
        received.marsServerHost = s.get('marsServerHost').composite as string

        if (received.marsServerURL && received.marsServerHost) {

            window._d_mars_server_url = received.marsServerURL
            window._d_mars_server_host = received.marsServerHost

            IOFrontier.setAdditionalParams({
                marsServerURL: received.marsServerURL,
                marsServerHost: received.marsServerHost,
            })
            console.info('use debug marsServerURL:', received.marsServerURL)
            console.info('use debug marsServerHost:', received.marsServerHost)
        }

        this.updateSetting(received)
        this._settingChanged.emit(null)
    }

    updateSetting(s: { [setting: string]: ISettingItem }) {
        this._settings = { ...this._settings, ...s }
    }

    get settings() {
        return this._settings
    }

    get fetchQuotaAt() {
        return this._fetchQuotaAt
    }

    get settingChanged() {
        return this._settingChanged
    }

    get initDone() {
        return this._initDone
    }

    // @update: 删除 fetchInner，handler.py 对应逻辑暂保留，后需删除
    fetchUserInfo = async (token: string) =>{
        if (this.fetchingUserInfoPromise) {
            await this.fetchingUserInfoPromise
            return
        }
        try {
            this.fetchingUserInfoPromise =  GlobalApiServerClient.request(ApiServerApiName.GET_USER, {
                token,
            }).then(userInfo => {
                const isInternal = userInfo.group_list.includes('internal')
                // eslint-disable-next-line eqeqeq
                const inChanged = isInternal != this._in
                this.userInfo = userInfo
                window._hf_user_if_in = this._in = isInternal
                inChanged && this._settingChanged.emit(null)
            })
            await this.fetchingUserInfoPromise
        } finally {
            this.fetchingUserInfoPromise = null
        }
    }

    async fetchQuotaInfo(force?: boolean): Promise<IQuotaMap | undefined> {
        try {
            const resp = await GlobalAilabServerClient.request(
                AilabServerApiName.TRAININGS_USER_NODE_QUOTA_INFO,
                {
                    force
                }
            )
            this.quotaMap = convertUserQuotaInfoToQuotaMap(resp)
            this._fetchQuotaAt = new Date()
            this._initDone = true
            return this.quotaMap
        } catch (e) {
            if (this._errorHandler) {
                this._errorHandler.handleFetchError(e, 'user info')
            }
        }
    }

    async setQuota(
        group_label: string,
        priority_label: string,
        quota: number
    ): Promise<boolean | undefined> {
        try {
            await conn.setUserGpuQuota({ group_label, priority_label, quota })
            return true
        } catch (e) {
            if (this._errorHandler) {
                this._errorHandler.handleFetchError(e, 'set quota')
            }
        }
    }

    getQuota(
        group: string,
        priority_label: string
    ): { total: number; used: number } {
        // 针对 background task，最多一个
        if (group === 'jd_dgxa100#BG' || group === 'jd_dev_alpha#BG') {
            return {
                total: 1,
                used: 0
            }
        }

        return (
            // @ts-ignore
            (this.quotaMap[group] ?? ({} as any))[priority_label] ?? {
                total: 0,
                used: 0,
                limit: undefined
            }
        )
    }

    getGroupNames() {
        return Object.keys(this.quotaMap)
    }

    get in() {
        return Boolean(this._in)
    }

    userName: string | null

    /**
     * Internal User
     */
    _in = false

    quotaMap: IQuotaMap

    _errorHandler?: ErrorHandler
    _settings: { [setting: string]: ISettingItem }
    _fetchQuotaAt: Date | null = null
    _settingChanged: Signal<this, null>

    /**
     * If this init
     */
    _initDone: boolean
}
