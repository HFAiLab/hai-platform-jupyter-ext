import { conn } from '@/serverConnection'
import React, { useState } from 'react'
import { ArtColumn } from 'ali-react-table'
import { RefreshBtn } from '@/uiComponents/refresh'
import { PriorityIcon } from '../../uiComponents'
import { InWrapper } from '@/uiComponents/common'
import { Button } from '@hai-ui/core'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { TaskPriority, taskPriorityNameMap } from '@hai-platform/shared'
import { HFTable } from '@/uiComponents/HFTable'
import {
    AllFatalErrorsType,
    IOFrontier
} from '@hai-platform/studio-pages/lib/socket/index'
import { useEffect } from 'react'
import { getToken, LevelLogger } from '@/utils'
import { SubPayload, SubscribeCommands } from '@hai-platform/studio-pages/lib/index'
import {
    ApiServerApiName,
    ClusterOverviewDetail
} from '@hai-platform/client-api-server'
import { GlobalApiServerClient } from '@/serverConnection/apiServer'
import { GlobalAilabServerClient } from '@/serverConnection/ailabServer'
import {
    AilabServerApiName,
    GetTaskTypedOverviewResult
} from '@hai-platform/client-ailab-server'
import type { CurrentScheduleTotalInfo } from '@hai-platform/studio-schemas/lib/esm/isomorph/schedule'

interface ColumnPriority {
    name: string
    value: number
}
interface ColumnDataType {
    priority: ColumnPriority
    scheduled: number
    queued: number
}

export const GlobalOverview = (props: { update: () => void }): JSX.Element => {
    const [useIO, setUseIO] = useState<boolean>(true)

    const ioFatalErrorCallback = (error: AllFatalErrorsType) => {
        LevelLogger.info(`GlobalOverview ioFatalErrorCallback: ${error}`)
        setUseIO(false)
    }
    const connectedCallback = () => {
        setUseIO(true)
    }
    const disConnectedCallback = () => {}

    return (
        <>
            {useIO && (
                <IOGlobalOverview
                    ioFatalErrorCallback={ioFatalErrorCallback}
                    disConnectedCallback={disConnectedCallback}
                    connectedCallback={connectedCallback}
                    update={props.update}
                />
            )}
            {!useIO && <HttpGlobalOverview update={props.update} />}
        </>
    )
}

export const IOGlobalOverview = (props: {
    ioFatalErrorCallback: (error: AllFatalErrorsType) => void
    disConnectedCallback: () => void
    connectedCallback: () => void
    update: () => void
}): JSX.Element => {
    const ignoreTaskOverview = !window._hf_user_if_in

    const [
        clusterOverview,
        setClusterOverview
    ] = useState<ClusterOverviewDetail | null>(null)
    const [
        taskOverview,
        setTaskOverview
    ] = useState<GetTaskTypedOverviewResult | null>(null)
    const [taskLoading, setTaskLoading] = useState(true)
    const [clusterLoading, setClusterLoading] = useState(true)
    const [taskError, setTaskError] = useState(false)
    const [clusterError, setClusterError] = useState(false)
    const fetchOverView = () => {}

    const clusterOverviewChangeCallback = (
        payload: SubPayload<SubscribeCommands.ClusterOverview2>
    ) => {
        setClusterLoading(false)
        setClusterError(false)
        // @ts-ignore
        setClusterOverview(payload.content as conn.IGlobalClusterOverview)
    }

    const tasksOverviewChangeCallback = (
        payload: SubPayload<SubscribeCommands.TaskOverview2>
    ) => {
        setTaskLoading(false)
        setTaskError(false)
        // @ts-ignore
        setTaskOverview(payload.content as conn.IGlobalTaskOverview)
    }

    useEffect(() => {
        IOFrontier.lazyInit(getToken())
        IOFrontier.getInstance().setLogger(LevelLogger)
        IOFrontier.addFatalErrorCallback(props.ioFatalErrorCallback)
        IOFrontier.addConnectedCallback(props.connectedCallback)
        IOFrontier.addDisConnectCallback(props.disConnectedCallback)

        const clusterSubId = IOFrontier.getInstance().sub(
            SubscribeCommands.ClusterOverview2,
            {
                query: {}
            },
            clusterOverviewChangeCallback
        )

        let tasksSubId: number | null = null
        if (ignoreTaskOverview) {
            setTaskLoading(false)
        } else {
            tasksSubId = IOFrontier.getInstance().sub(
                SubscribeCommands.TaskOverview2,
                {
                    query: {}
                },
                tasksOverviewChangeCallback
            )
        }

        return () => {
            IOFrontier.getInstance().unsub(clusterSubId)
            if (tasksSubId) {
                IOFrontier.getInstance().unsub(tasksSubId)
            }
            IOFrontier.removeFatalErrorCallback(props.ioFatalErrorCallback)
            IOFrontier.removeConnectedCallback(props.connectedCallback)
            IOFrontier.removeDisConnectCallback(props.disConnectedCallback)
        }
    }, [])

    return (
        <GlobalOverviewUI
            update={props.update}
            clusterOverview={clusterOverview}
            taskOverview={taskOverview}
            taskError={taskError}
            clusterError={clusterError}
            taskLoading={taskLoading}
            clusterLoading={clusterLoading}
            fetchOverView={fetchOverView}
            hideRefresh
        />
    )
}

export const HttpGlobalOverview = (props: {
    update: () => void
}): JSX.Element => {
    const [
        clusterOverview,
        setClusterOverview
    ] = useState<ClusterOverviewDetail | null>(null)
    const [
        taskOverview,
        setTaskOverview
    ] = useState<GetTaskTypedOverviewResult | null>(null)
    const [firstUpdate, setFirstUpdate] = useState(false)
    const [taskLoading, setTaskLoading] = useState(false)
    const [clusterLoading, setClusterLoading] = useState(false)
    const [taskError, setTaskError] = useState(false)
    const [clusterError, setClusterError] = useState(false)
    const ignoreTaskOverview = !window._hf_user_if_in

    const fetchOverView = () => {
        if (taskLoading) {
            return
        }

        setTaskLoading(true)
        setTaskError(false)
        setClusterLoading(true)
        setClusterError(false)
        props.update()

        if (ignoreTaskOverview) {
            setTaskLoading(false)
        } else {
            GlobalAilabServerClient.request(
                AilabServerApiName.GET_TASK_TYPED_OVERVIEW
            )
                .then(res => {
                    setTaskOverview(res)
                    setTaskLoading(false)
                    props.update()
                })
                .catch(e => {
                    setTaskError(true)
                    setTaskLoading(false)
                    props.update()
                })
        }

        GlobalApiServerClient.request(
            ApiServerApiName.GET_CLUSTER_OVERVIEW_FOR_CLIENT
        )
            .then(res => {
                setClusterOverview(res.gpu_detail)
                setClusterLoading(false)
                props.update()
            })
            .catch(e => {
                setClusterError(true)
                setTaskLoading(false)
                props.update()
            })
    }

    if (!firstUpdate) {
        setFirstUpdate(true)
        setTaskOverview(null)
        fetchOverView()
    }

    return (
        <GlobalOverviewUI
            update={props.update}
            clusterOverview={clusterOverview}
            taskOverview={taskOverview}
            taskError={taskError}
            clusterError={clusterError}
            taskLoading={taskLoading}
            clusterLoading={clusterLoading}
            fetchOverView={fetchOverView}
        />
    )
}

export const GlobalOverviewUI = (props: {
    update: () => void
    clusterOverview: ClusterOverviewDetail | null
    taskOverview: GetTaskTypedOverviewResult | null
    taskError?: boolean
    clusterError?: boolean
    taskLoading?: boolean
    clusterLoading?: boolean
    fetchOverView: () => void
    hideRefresh?: boolean
}): JSX.Element => {
    const taskOverview = props.taskOverview
    const clusterOverview = props.clusterOverview
    const ignoreTaskOverview = !window._hf_user_if_in

    const columnsOfPaths = [
        {
            code: 'priority',
            name: i18n.t(i18nKeys.biz_priority),
            align: 'left',
            render: p => {
                return (
                    <>
                        <PriorityIcon priority={p.value} />
                        {p.name}
                    </>
                )
            }
        },
        {
            code: 'scheduled',
            name: i18n.t(i18nKeys.biz_info_task_working),
            width: 60,
            align: 'center'
        },
        {
            code: 'queued',
            name: i18n.t(i18nKeys.biz_info_task_queued),
            width: 60,
            align: 'center'
        }
    ] as Array<ArtColumn>

    const dataSource = Object.keys(taskPriorityNameMap || [])
    .sort((a, b) => {
      return Number(b) - Number(a)
    })
    .map((priorityKey) => {
      const priorityValue = Number(priorityKey)
      const priorityName = taskPriorityNameMap[priorityKey as unknown as TaskPriority]
      const info = (taskOverview || {})[priorityValue] || { scheduled: 0, queued: 0 }
      return {
        priority: {
          name: priorityName,
          value: priorityValue,
        },
        scheduled: info.scheduled,
        queued: info.queued,
      }
    })

    const calculateCurrentCount = () => {
        if (!taskOverview) {
            return {
                scheduled: '-',
                queued: '-'
            }
        }
        return Object.values(taskOverview).reduce(
            (curr, next) => {
                curr.scheduled += next.scheduled
                curr.queued += next.queued
                return curr
            },
            {
                scheduled: 0,
                queued: 0
            } as CurrentScheduleTotalInfo
        )
    }

    const currentCount = calculateCurrentCount()

    return (
        <div className="global-view hf">
            {!props.hideRefresh && (
                <div className={'global-view-refresh-container'}>
                    <RefreshBtn
                        onClick={() => {
                            props.fetchOverView()
                        }}
                        small
                        svgOnly
                    />
                </div>
            )}

            <h4 className="global-view-title">
                {i18n.t(i18nKeys.biz_info_cluster_usage_overview)}
            </h4>
            {!props.clusterLoading && !props.clusterError && clusterOverview && (
                <>
                    <div className="meta-line">
                        <div className="label">
                            {i18n.t(i18nKeys.biz_info_cluster_usage_ratio)}
                        </div>
                        <div
                            className={`info ${
                                clusterOverview.usage_rate > 0.85 ? 'high' : ''
                            }`}
                        >
                            {(clusterOverview.usage_rate * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div className="meta-line">
                        <div className="label">
                            {i18n.t(i18nKeys.biz_info_nodes_total)}
                        </div>
                        <div className="info">{clusterOverview.total}</div>
                    </div>
                    <div className="meta-line">
                        <div className="label">
                            {i18n.t(i18nKeys.biz_info_nodes_total_used)}
                        </div>
                        <div className="info">{clusterOverview.working}</div>
                    </div>
                    <div className="meta-line">
                        <div className="label">
                            {currentCount && currentCount.queued
                                ? i18n.t(i18nKeys.biz_info_nodes_free_but_show_schedule)
                                : i18n.t(i18nKeys.biz_info_nodes_free)}
                        </div>
                        <div className="info">{clusterOverview.free}</div>
                    </div>
                    <div className="meta-line">
                        <div className="label">
                            {i18n.t(i18nKeys.biz_info_nodes_not_ok)}
                        </div>
                        <div className="info">{clusterOverview.other}</div>
                    </div>
                    {
                                            }
                </>
            )}

            {props.clusterError && (
                <div className="error-container">
                    <p className="error">
                        {i18n.t(i18nKeys.biz_info_get_cluster_error)}
                    </p>
                </div>
            )}

            {!ignoreTaskOverview && (
                <h4 className="global-view-title">
                    GPU {i18n.t(i18nKeys.biz_info_cluster_tasks)}
                </h4>
            )}

            {!ignoreTaskOverview && !props.taskError && taskOverview && (
                <>
                    <HFTable
                        className={'overview-table'}
                        style={{ overflow: 'auto' }}
                        columns={columnsOfPaths}
                        dataSource={dataSource}
                        isLoading={props.taskLoading}
                    />
                </>
            )}

            {props.taskError && (
                <div className="error-container">
                    <p className="error">
                        {i18n.t(i18nKeys.biz_info_get_tasks_error)}
                    </p>
                </div>
            )}
        </div>
    )
}
