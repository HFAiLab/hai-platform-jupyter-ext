import React, { useContext, useEffect } from 'react'
import { dateStr, getNameSpace, inputDialog } from '../../utils'
import { ServiceContext } from '../../uiComponents/reactContext'
import { InlineIcon, PriorityIcon } from '../../uiComponents'
import { InWrapper } from '../../uiComponents/common'
import { useState } from 'react'
import { RefreshBtn } from '@/uiComponents/refresh'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { CountlyEventKey, JupyterCountly } from '@/utils/countly/countly'
import { HFTable } from '@/uiComponents/HFTable'
import { ArtColumn } from 'ali-react-table'
import { Tooltip2 } from '@hai-ui/popover2'
import {
    TASK_PRIORITY_NAMES_STANDARD,
    TaskPriorityNameStandard
} from '@hai-platform/shared'

type T_PriorityQuota = {
    total: number
    used: number
    limit?: number
}

type T_Quota = {
    [key in TaskPriorityNameStandard]?: T_PriorityQuota
}

interface IPriorityItem {
    priority: TaskPriorityNameStandard
    used: number | string
    total: number | string
    limit: number | string
}

const GroupDetail = (props: {
    p: T_Quota
    name: string
    setter: (group: string, priority: string, quota: number) => void
}): JSX.Element => {
    const srvc = useContext(ServiceContext)
    const columnsOfPaths = [
        {
            code: 'priority',
            name: i18n.t(i18nKeys.biz_priority),
            align: 'left',
            render: p => {
                return (
                    <>
                        <PriorityIcon priority={p} />
                        {p}
                    </>
                )
            }
        },
        {
            code: 'used',
            name: i18n.t(i18nKeys.biz_quota_used),
            width: 50,
            align: 'center'
        },
        {
            code: 'total',
            name: `${i18n.t(i18nKeys.biz_quota_tot_lim)}`,
            width: 60,
            align: 'center',
            render: (total, row) => {
                return (
                    <Tooltip2
                        content={i18n.t(i18nKeys.biz_quota_limit_tooltip)}
                    >{`${row.total} / ${row.limit}`}</Tooltip2>
                )
            }
        }
    ] as Array<ArtColumn>

    if (srvc.ctx._user.in) {
        columnsOfPaths.push({
            code: 'edit',
            name: '',
            align: 'left',
            width: 20,
            render: (p, record: IPriorityItem) => {
                return (
                    <InWrapper addInClass style={{ display: 'inline-block' }}>
                        <span className="edit">
                            <a
                                onClick={() => {
                                    const priority = record.priority
                                    const group = props.name
                                    const v = String(
                                        props.p[record.priority]?.total ?? 1
                                    )
                                    inputDialog(
                                        `Set new quota for ${group}-${priority}`,
                                        v
                                    )
                                        .then(value => {
                                            if (value) {
                                                props.setter(
                                                    group,
                                                    priority,
                                                    parseInt(value)
                                                )
                                            }
                                        })
                                        .catch(e => {
                                            srvc.ctx._errorHandler.handleError(
                                                `Error: Set user quota error.\n${e}`
                                            )
                                        })
                                }}
                            >
                                <InlineIcon name="edit" tooltip="Edit" />
                            </a>
                        </span>
                    </InWrapper>
                )
            }
        })
    }

    const dataSource = TASK_PRIORITY_NAMES_STANDARD.filter(p => {
        return p !== 'AUTO'
    }).map(p => {
        const data = {} as IPriorityItem
        data['priority'] = p
        data['used'] = props.p[p]?.used ?? 'N/A'
        data['total'] = props.p[p]?.total ?? 'N/A'
        data['limit'] = props.p[p]?.limit ?? '-'
        return data
    })

    return (
        <div className="group-detail">
            <HFTable
                className="quota-table"
                style={{ overflow: 'auto' }}
                columns={columnsOfPaths}
                dataSource={dataSource}
            />
        </div>
    )
}

export const Quota = (): JSX.Element => {
    const srvc = useContext(ServiceContext)
    const user = srvc.ctx._user
    function setPriority(group: string, priority: string, quota: number) {
        user.setQuota(group, priority, quota).then(() => {
            updateMap(true)
            setTimeout(() => {
                updateMap(true)
            }, 2000)
        })
    }

    function updateMap(force?: boolean) {
        JupyterCountly.safeReport(CountlyEventKey.InfoPanelQuotaReq)
        srvc.ctx._user.fetchQuotaInfo(force).then(() => {
            srvc.forceUpdate!()
        })
    }

    const firstKey = Object.keys(user.quotaMap)[0]
    const [activeKey, setActiveKey] = useState(firstKey)

    if (firstKey && !activeKey) {
        setActiveKey(firstKey)
    }

    useEffect(() => {
        updateMap()
    }, [])

    if (!window._hf_user_if_in) {
        return (
            <div className="dynamic-quota">
                {i18n.t(i18nKeys.biz_dynamic_quota_tip)}
            </div>
        )
    }

    return (
        <div className="quota-card">
            <div className={'quota-refresh-container'}>
                <RefreshBtn
                    onClick={() => {
                        updateMap()
                    }}
                    small
                    svgOnly
                />
            </div>
            <div
                className={`${getNameSpace()}-html-select .modifier ${getNameSpace()}-fill hf-select-container`}
            >
                <select
                    onChange={item => {
                        setActiveKey(item.target.value)
                    }}
                >
                    {Object.keys(user.quotaMap).map(key => (
                        <option value={key} selected={activeKey === key}>
                            {key}
                        </option>
                    ))}
                </select>
                <span
                    className={`${getNameSpace()}-icon ${getNameSpace()}-icon-double-caret-vertical`}
                ></span>
            </div>

            {activeKey && (
                <GroupDetail
                    p={user.quotaMap[activeKey]}
                    name={activeKey}
                    setter={setPriority}
                />
            )}
            <div className="btn-wrapper">
                <span className="updated-at">
                    {i18n.t(i18nKeys.biz_exp_status_updated)} :{' '}
                    {dateStr(user.fetchQuotaAt, true)}
                </span>
            </div>
        </div>
    )
}
