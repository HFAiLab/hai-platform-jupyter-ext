import { getCountlyBffUrl, VERSION } from '@/consts'
import { PAGE_NAME } from './config'
import {
    CountlyEvent,
    CountlyReport
} from '@hai-platform/studio-toolkit/lib/esm/countly'
import { isProduction } from '../env'

const DebugDeviceId = 'debug-device'
let DebugUserName = 'unknown'
try {
    // @ts-ignore
    DebugUserName = process.env.DEBUG_USER_NAME
} catch (e) {
    console.warn('get DebugUserName error')
}
export function getCurrentUserName() {
    const user = /\/([^\/]*?)\/([^\/]*?)\/lab/.exec(window.location.href)
    if (user && user.length >= 2) {
        return user[1] || DebugUserName
    }
    return DebugUserName
}

export function getCurrentDeviceId() {
    // 用户名 + 他的哪个实例
    const device = /\/([^\/]*?\/[^\/]*?)\/lab/.exec(window.location.href)
    if (device && device.length >= 2) {
        return device[1]
    }

    return DebugDeviceId
}

export enum CountlyEventKey {
    ExtPrepareInit = 'ExtPrepareInit',
    ExtLanInit = 'ExtLanInit',
    ExtConfigInit = 'ExtConfigInit', // 插件初始化获取 config 的耗时
    ExtInit = 'ExtInit',
    ExpDetailOpenSideBarCreate = 'ExpDetailOpenSideBarCreate',
    ExpSubmit = 'ExpSubmit',
    ExpDetailRefresh = 'ExpDetailRefresh',
    ExpDetailFilterClick = 'ExpDetailFilterClick',
    ExpNodeClick = 'ExpNodeClick',
    ExpNodeValidate = 'ExpNodeValidate',
    InfoPanelOpen = 'InfoPanelOpen',
    InfoPanelQuotaReq = 'InfoPanelQuotaReq',
    TrainingsOpen = 'TrainingsOpen',
    TrainingsRefresh = 'TrainingsRefresh',
    TrainingsOnlyTrainingsClick = 'TrainingsOnlyTrainingsClick',
    TrainingsFilterTabClick = 'TrainingsFilterTabClick',
    TrainingsFilterTextEnter = 'TrainingsFilterTextEnter',
    ExpDetailContainerFindTimesTooMuch = 'ExpDetailContainerFindTimesTooMuch',
    ExpDetailContainerFindTimesTooFew = 'ExpDetailContainerFindTimesTooFew',
    LogModuleInit = 'LogModuleInit',
    IOclickIoStatus = 'clickIoStatus', // 点击 io 状态图标
    IOmanuallyDisconnect = 'IOmanuallyDisconnect', // 手动断开长链接
    IOmanuallyConnect = 'IOmanuallyConnect', // 手动链接长链接
    VisitBrowserVersion = 'VisitBrowserVersion', // 访问的 browser 的版本
    AppVersionTrack = 'AppVersionTrack' // app 版本号跟踪
}

interface ReportCache {
    key: CountlyEventKey
    event?: CountlyEvent
}

let jupyterCountly: CountlyReport<CountlyEventKey> | null = null
const reportCaches: ReportCache[] = []

export class JupyterCountly {
    static getInstance() {
        return jupyterCountly
    }

    static safeReport(key: CountlyEventKey, event?: CountlyEvent) {
        if (
            !window.haiConfig?.countly?.apiKey ||
            !window.haiConfig?.countly?.url
        ) {
            return
        }
        if (!isProduction) {
            // eslint-disable-next-line no-console
            console.info(`[debug] safeReport key: ${key}, event:`, event)
            return
        }
        if (!JupyterCountly.getInstance()) {
            reportCaches.push({
                key,
                event
            })
        } else {
            JupyterCountly.getInstance()!.addEvent(key, event)
        }
    }

    static lazyInit() {
        if (
            !window.haiConfig?.countly?.apiKey ||
            !window.haiConfig?.countly?.url
        ) {
            return
        }
        jupyterCountly = new CountlyReport<CountlyEventKey>({
            apiKey: window.haiConfig.countly.apiKey,
            countlyURL: window.haiConfig.countly.url,
            pageName: PAGE_NAME,
            version: VERSION,
            deviceId: getCurrentUserName(),
            proxy_url: getCountlyBffUrl(),
            debug: !isProduction,
            stopCallback: (stop: boolean) => {
                // do nothing
            }
        })
        // @ts-ignore
        window.jupyterCountly = jupyterCountly
        if (reportCaches) {
            reportCaches.forEach(item => {
                jupyterCountly!.addEvent(item.key, item.event)
            })
        }
    }
}
