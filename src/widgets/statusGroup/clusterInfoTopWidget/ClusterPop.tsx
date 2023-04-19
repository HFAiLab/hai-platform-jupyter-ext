import React, { useContext, useEffect, useState } from 'react'
import { Popover2 } from '@hai-ui/popover2/lib/esm'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { conn } from '@/serverConnection'
import { getToken, LevelLogger } from '@/utils'
import {
    AllFatalErrorsType,
    IoStatus
} from '@hai-platform/studio-pages/lib/socket/index'
import { CONSTS, OpenCommands } from '@/consts'
import { IOFrontier } from '@hai-platform/studio-pages/lib/socket/index'
import {
    SubPayload,
    SubscribeCommands
} from '@hai-platform/studio-pages/lib/index'
import { ServiceContext } from '@/uiComponents/reactContext'
import {
    ApiServerApiName,
    ClusterOverviewDetail
} from '@hai-platform/client-api-server'
import { GlobalApiServerClient } from '@/serverConnection/apiServer'

export const ClusterPop = (props: { update: () => void }): JSX.Element => {
    const [useIO, setUseIO] = useState<boolean>(true)
    const srvc = useContext(ServiceContext)

    const ioFatalErrorCallback = (error: AllFatalErrorsType) => {
        LevelLogger.info(`ClusterPop ioFatalErrorCallback: ${error}`)
        setUseIO(false)
        srvc.ctx._app.commands.execute(OpenCommands.IoConnectionTip, {
            status: IoStatus.fataled,
            ioLastError: error,
            op: 'show'
        })
    }
    const connectedCallback = () => {
        LevelLogger.info('Cluster connectedCallback')
        setUseIO(true)
        srvc.ctx._app.commands.execute(OpenCommands.IoConnectionTip, {
            status: IoStatus.connected,
            ioLastError: null,
            op: 'show'
        })
    }
    const disConnectedCallback = () => {
        LevelLogger.info('Cluster disConnectedCallback')
        // hint: disConnected 可能是可恢复的，但是对用户来说应该没什么区别
        srvc.ctx._app.commands.execute(OpenCommands.IoConnectionTip, {
            status: IoStatus.fataled,
            ioLastError: null,
            op: 'show'
        })
    }

    useEffect(() => {
        LevelLogger.info('emit ctx.hfaiExtMount')
        srvc.ctx.hfaiExtMount.emit(null)
    }, [])

    useEffect(() => {
        // 这些函数不会有副作用，都可以多次调用
        IOFrontier.lazyInit(getToken())
        IOFrontier.getInstance().setLogger(LevelLogger)
        IOFrontier.addFatalErrorCallback(ioFatalErrorCallback)
        IOFrontier.addConnectedCallback(connectedCallback)
        IOFrontier.addDisConnectCallback(disConnectedCallback)
        return () => {
            IOFrontier.removeFatalErrorCallback(ioFatalErrorCallback)
            IOFrontier.removeConnectedCallback(connectedCallback)
            IOFrontier.removeDisConnectCallback(disConnectedCallback)
        }
    }, [])

    return (
        <>
            {useIO && <IOClusterPop update={props.update} />}
            {!useIO && <HttpClusterPop update={props.update} />}
        </>
    )
}

export const IOClusterPop = (props: { update: () => void }): JSX.Element => {
    const [
        clusterInfo,
        setClusterInfo
    ] = useState<ClusterOverviewDetail | null>(null)

    const clusterOverviewChangeCallback = (
        payload: SubPayload<SubscribeCommands.ClusterOverview2>
    ) => {
        // @ts-ignore
        setClusterInfo(payload.content as conn.IGlobalClusterOverview)
    }

    useEffect(() => {
        // 这些函数不会有副作用，都可以多次调用
        IOFrontier.lazyInit(getToken())
        IOFrontier.getInstance().setLogger(LevelLogger)
        const clusterSubId = IOFrontier.getInstance().sub(
            SubscribeCommands.ClusterOverview2,
            {
                query: {}
            },
            clusterOverviewChangeCallback
        )

        return () => {
            IOFrontier.getInstance().unsub(clusterSubId)
        }
    }, [])

    return <ClusterPopUI update={props.update} info={clusterInfo} />
}

export const HttpClusterPop = (props: { update: () => void }): JSX.Element => {
    const [
        clusterInfo,
        setClusterInfo
    ] = useState<ClusterOverviewDetail | null>(null)

    const fetchClusterInfo = () => {
        if (document.hidden) {
            return
        }
        GlobalApiServerClient.request(
            ApiServerApiName.GET_CLUSTER_OVERVIEW_FOR_CLIENT
        )
            .then(p => {
                setClusterInfo(p)
            })
            .catch(e => {
                setClusterInfo(null)
            })
    }

    useEffect(() => {
        fetchClusterInfo()
        const intervalId = setInterval(() => {
            fetchClusterInfo()
        }, CONSTS.CLUSTER_REFRESH_INTERVAL_SEC * 1000)
        return () => {
            clearInterval(intervalId)
        }
    }, [])

    return <ClusterPopUI update={props.update} info={clusterInfo} />
}

export const ClusterPopUI = (props: {
    update: () => void
    info: ClusterOverviewDetail | null
}): JSX.Element => {
    const styleNoWrap = { wordBreak: 'keep-all' as 'keep-all' }
    const info = props.info
    const u = info ? info.usage_rate * 100 : 0

    const infoLines = [
        // 总共
        {
            k: i18n.t(i18nKeys.biz_info_nodes_total),
            v: info?.total ?? 0
        },
        // 空闲
        {
            k: i18n.t(i18nKeys.biz_info_nodes_free_or_schedule),
            v: info?.free ?? 0
        },
        // 使用中
        { k: i18n.t(i18nKeys.biz_info_nodes_total_used), v: info?.working },
        // 不可用
        {
            k: i18n.t(i18nKeys.biz_info_nodes_not_ok),
            v: info?.other ?? 0
        }
    ]

    return (
        <Popover2
            interactionKind="hover"
            content={
                <div className="cluster pop">
                    <p style={styleNoWrap}>
                        <span className="key">
                            {i18n.t(i18nKeys.biz_info_cluster_usage_ratio)}
                        </span>{' '}
                        : {u.toFixed(2) + '%'}
                    </p>
                    {infoLines.map(l => (
                        <p style={styleNoWrap}>
                            <span className="key">{l.k}</span> : {l.v}
                        </p>
                    ))}
                </div>
            }
        >
            <div className="wrap">
                <div className="box" style={{ position: 'relative' }}>
                    <div
                        className="usagebox"
                        style={{ right: String(100 - u) + '%' }}
                    ></div>
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10
                        }}
                    >
                        <span>{i18n.t(i18nKeys.base_Cluster)} </span>
                        <span>{info ? u.toFixed(1) + '%' : '??'}</span>
                    </div>
                </div>
            </div>
        </Popover2>
    )
}
