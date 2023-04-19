import React, { useContext, useEffect, useMemo, useState } from 'react'

import { ServiceContext } from '../../uiComponents/reactContext'

import { ReactWidget } from '@jupyterlab/apputils'

import { Context } from '@/contextManager'

import { uikit } from '../../uiComponents'

import { BaseTable, ArtColumn } from 'ali-react-table'

import styled from 'styled-components'

import { conn } from '../../serverConnection'

import sortBy from 'lodash/sortBy'
import { RefreshBtn } from '@/uiComponents/refresh'
import { Tooltip2 } from '@hai-ui/popover2/lib/esm'
import { InputGroup } from '@hai-ui/core/lib/esm'
import { i18n, i18nKeys } from '@hai-platform/i18n'

const columnsOfPaths = [
    { code: 'mount_path', name: 'Path' },
    {
        code: 'read_only',
        name: 'ReadOnly',
        width: 80,
        align: 'center',
        getValue: row => (row.read_only ? 'Yes' : '')
    },
    { code: 'mount_type', name: 'Type', width: 115, align: 'center' },
    {
        code: 'quotaShow',
        name: 'Quota (Used / Total)',
        width: 140,
        align: 'center'
    }
] as Array<ArtColumn>

const StyledTable = styled(BaseTable)`
     {
        --color: var(--hf-ui-font-color1);
        --bgcolor: (--hf-layout-light);

        --row-height: 34px;
        --hover-bgcolor: var(--hf-ui-highlight-bg, #f5f5f5);
        --highlight-bgcolor: var(--jp-layout-color1);
        --header-row-height: 30px;
        --header-color: var(--hf-ui-font-color0);
        --header-bgcolor: var(--jp-layout-color2);
        --header-hover-bgcolor: #ddd;
        --header-highlight-bgcolor: #e4e8ed;
        --cell-padding: 4px 12px;
        --font-size: 12px;
        --line-height: 1.28571;
        --lock-shadow: rgba(152, 152, 152, 0.5) 0 0 6px 2px;
        --border-color: var(--hf-table-border-color);

        --header-cell-border-horizontal: none;
        --header-cell-border: none;
    }
`

const formatBytes = (bytes: number | null, decimals = 2) => {
    if (!bytes) {
        return '-'
    }

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const AvailablePath = (): JSX.Element => {
    const srvc = useContext(ServiceContext)
    // const isInternal = srvc.ctx._user.in
    const [filter, setFilter] = useState('')
    const [dataSource, setDataSource] = useState<conn.IStorageItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchData = () => {
        setIsLoading(true)
        conn.getStorageInfo()
            .then(ret => {
                const dataSource = sortBy(ret, 'mount_path')
                dataSource.forEach((item, _index) => {
                    item.quotaShow = '- / -'
                    if (!item.quota) {
                        return
                    }
                    item.quotaShow = `${formatBytes(
                        item.quota.used_bytes
                    )} / ${formatBytes(item.quota.limit_bytes)}`
                })
                setDataSource(dataSource)
                setIsLoading(false)
            })
            .catch(err => {
                setIsLoading(false)
                srvc.ctx._errorHandler.handleFetchError(err, 'storage info')
            })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const pathList = useMemo(() => {
        if (!dataSource) {
            return []
        }
        if (!filter) {
            return dataSource
        }
        const kw = filter.toLowerCase()
        // @ts-ignore
        return dataSource.filter(item =>
            item.mount_path.toLowerCase().includes(kw)
        )
    }, [filter, dataSource])

    return (
        <div className="ap-widget">
            <uikit.WindowTitle
                title={i18n.t(i18nKeys.biz_avail_path_title_h)}
                desc={i18n.t(i18nKeys.biz_avail_path_title_desc)}
            />
            <div
                className="inlineForm"
                style={{
                    marginTop: 10,
                    marginBottom: 10,
                    position: 'relative',
                    width: '240px',
                    display: 'flex'
                }}
            >
                <InputGroup
                    asyncControl={true}
                    leftIcon="filter"
                    small
                    onChange={t => {
                        setFilter(t.target.value)
                    }}
                    placeholder={i18n.t(i18nKeys.biz_avail_path_tip_filter)}
                    value={filter}
                />

                <div style={{ marginLeft: '10px' }}>
                    <Tooltip2 placement="top" content="Refresh the table">
                        <RefreshBtn
                            svgOnly
                            small
                            onClick={fetchData}
                        ></RefreshBtn>
                    </Tooltip2>
                </div>
            </div>
            <StyledTable
                style={{ overflow: 'auto', maxHeight: 'calc(100% - 94px)' }}
                columns={columnsOfPaths}
                dataSource={pathList}
                components={{
                    EmptyContent: () => (
                        <div>
                            {i18n.t(i18nKeys.biz_avail_path_title_no_data)}
                        </div>
                    )
                }}
                isLoading={isLoading}
            />
        </div>
    )
}

export class AvailablePathWidget extends ReactWidget {
    constructor(ctx: Context) {
        super()
        this._ctx = ctx
        this.addClass('hf')
        this.addClass('APWindow')
    }
    render() {
        return (
            <ServiceContext.Provider
                value={{ ctx: this._ctx, forceUpdate: this.update.bind(this) }}
            >
                <AvailablePath />
            </ServiceContext.Provider>
        )
    }
    _ctx: Context
}
