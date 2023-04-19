import { requestAPI } from './_request'
import { IChainObj } from '@hai-platform/studio-pages/lib/index'
import { getToken } from '../utils'
import dayjs from 'dayjs'
import { JupyterCountly } from '@/utils/countly/countly'
import {
    PerfQueryType,
    TaskTsObj
} from '@hai-platform/studio-pages/lib/entries/perf/widgets/ChartBlock'
import { ExtendedTask, ClusterUnit } from '@hai-platform/shared'
import { CreateExperimentParams, IHaiEnvList } from '@hai-platform/studio-pages/lib/entries/experiment2/schema'
import type { HaiConfig } from '@hai-platform/shared'

interface BasicConnResponse {
    success: 1 | 0
    msg?: string
}

/**
 * Fetch from server
 */
async function _req<T>(p: {
    endPoint: string
    params: any
    method?: 'GET' | 'POST'
}): Promise<T> {
    const { params } = p
    let { endPoint, method } = p
    method = method ?? 'POST'
    const action = params.action ?? null
    if (action) {
        endPoint = endPoint + '?' + 'action=' + String(action)
    }

    try {
        let res = await requestAPI<T>(endPoint, {
            method,
            body: JSON.stringify(params),
            headers: {
                'content-type': 'application/json',
                token: getToken() //TODO
            }
        })
        return res
    } catch (e) {
        JupyterCountly.getInstance()!.logError(e as any)
        throw e
    }
}

/**
 * Type of a filter setting
 */
export type IFilterItem = {
    key: keyof IChainObj
    method: 'contains' | 'in' | 'gte' | 'lte' | 'equal'
    pattern: Array<number> | Array<string> | string | number
}

/**
 * Struct of a respose from server
 */
interface ConnResponse<T> {
    success: 1 | 0
    msg?: string
    output_data?: T
}

export namespace conn {
    /**
     * Create experiment.
     * @returns ChainObj if success
     */
    export async function createExperiment(
        p: CreateExperimentParams
    ): Promise<ExtendedTask> {
        const res = await _req<ConnResponse<ExtendedTask>>({
            endPoint: 'experiment',
            params: {
                action: 'create_experiment',
                ...p
            }
        })
        return res.output_data!
    }

    export interface ITimelineResponseObj {
        begin_at_list: Array<string>
        chain_id: string
        nb_name: string
        chain_status: IChainObj['chain_status']
        created_at: string
        end_at_list: Array<string>
        group: string
        nodes: number
        priority: number
        whole_life_state_list: Array<string>
    }

    /**
     * Get data for timeline.
     */
    export async function getTimelineData(): Promise<
        [number, Array<ITimelineResponseObj>]
    > {
        const res = await _req<
            ConnResponse<[number, Array<ITimelineResponseObj>]>
        >({
            endPoint: 'experiment',
            params: {
                action: 'get_experiments',
                page: 1,
                page_size: 50,
                filters: [
                    {
                        key: 'created_at',
                        method: 'gte',
                        pattern: dayjs()
                            .subtract(7, 'day')
                            .format('YYYY-MM-DD HH:mm:ss')
                    }
                ]
            }
        })
        return res.output_data!
    }

    /**
     * Stop experiment.
     * @param p chain_id
     * @returns
     */
    export async function stopExperiment(p: {
        chain_id: string
    }): Promise<void> {
        await _req<ConnResponse<undefined>>({
            endPoint: 'experiment',
            params: {
                action: 'stop_experiment',
                ...p
            }
        })
        return
    }

    export async function starExperiment(p: {
        chain_id: string
        star: boolean
    }): Promise<BasicConnResponse> {
        let res = await _req<ConnResponse<string>>({
            endPoint: 'experiment',
            params: {
                action: p.star ? 'star_experiment' : 'unstar_experiment',
                ...p
            }
        })
        // TODO: 这里目前的实现没有办法真正透传出所有错误，后面需要改一下实现
        return {
            success: 1,
            msg: res.output_data
        }
    }

    /**
     * Suspend experiment.
     * @param p chain_id
     * @returns
     */
    export async function suspendExperiment(p: {
        chain_id: string
    }): Promise<void> {
        await _req<ConnResponse<undefined>>({
            endPoint: 'experiment',
            params: {
                action: 'suspend_experiment',
                ...p
            }
        })
        return
    }

    /**
     * Run validate for a chain.
     * @param p chain_id
     * @returns
     */
    export async function runValidation(p: {
        id: number
        ranks: number[]
    }): Promise<string> {
        const res = await _req<ConnResponse<string>>({
            endPoint: 'experiment',
            params: {
                action: 'run_validate',
                ...p
            }
        })
        return res.output_data!
    }

    export interface IClusterInfoResponse {
        cluster_df: Array<ClusterUnit>
        containers: Array<string>
    }

    /**
     * Get cluster info. Show group usage and environments.
     */
    export async function getClusterInfo(): Promise<IClusterInfoResponse> {
        const res = await _req<ConnResponse<IClusterInfoResponse>>({
            endPoint: 'cluster',
            params: {
                action: 'get_cluster_info'
            }
        })
        return res.output_data!
    }

    /**
     * 从 handler 的接口，调用 haienv list 获取 env 列表 json
     */


    export async function getHaiEnvList(): Promise<IHaiEnvList> {
        const res = await _req<ConnResponse<IHaiEnvList>>({
            endPoint: 'user',
            params: {
                action: 'get_haienv_list'
            }
        })
        return res.output_data!
    }

    export interface IGlobalTaskOverview {
        [key: string]: TaskOverview
    }

    export interface TaskOverview {
        working: number
        queued: number
    }

    /**
     * Set user quota for cluster group
     */
    export async function setUserGpuQuota(p: {
        group_label: string
        priority_label: string
        quota: number
    }): Promise<{ [groupPriorityName: string]: number }> {
        const res = await _req<
            ConnResponse<{ [groupPriorityName: string]: number }>
        >({
            endPoint: 'user',
            params: {
                action: 'set_user_gpu_quota',
                ...p
            }
        })
        return res.output_data!
    }

    export interface IStorageItem {
        host_path?: string
        mount_path: string
        mount_type: 'Directory' | 'File' | ''
        read_only: boolean
        quota?: { limit_bytes: null | number; used_bytes: null | number }
        quotaShow?: string
    }

    /**
     * Get personal storage info.
     */
    export async function getStorageInfo(): Promise<Array<IStorageItem>> {
        const res = await _req<ConnResponse<Array<IStorageItem>>>({
            endPoint: 'user',
            params: {
                action: 'get_storage'
            }
        })
        return res.output_data!
    }

    /**
     * Convert a .ipynb file to .py
     */
    export async function convertIpynb(p: { path: string }): Promise<string> {
        const res = await _req<ConnResponse<string>>({
            endPoint: 'ipynb_convert',
            params: {
                action: 'convert',
                ...p
            }
        })
        return res.output_data!
    }

    /**
     * Clear output of a .ipynb file
     */
    export async function clearIpynbOutput(p: {
        path: string
    }): Promise<string> {
        const res = await _req<ConnResponse<string>>({
            endPoint: 'ipynb_convert',
            params: {
                action: 'clear',
                ...p
            }
        })
        return res.output_data!
    }

    /**
     * Check user's role
     * @returns is current user is internal
     */
    export async function checkInternal(): Promise<boolean> {
        const res = await _req<
            ConnResponse<{ user_role: 'internal' | string }>
        >({
            endPoint: 'user',
            params: {
                action: 'get_user_role'
            }
        })
        return res.output_data!.user_role == 'internal'
    }

    /**
     * Get server name. If not have the permission, will got a error response
     * @returns
     */
    export async function getServerName(): Promise<string> {
        const res = await _req<
            ConnResponse<{
                msg: string
                server_name: string
            }>
        >({
            endPoint: 'jupyter',
            params: {
                action: 'get_server_name'
            }
        })
        return res.output_data!.server_name
    }

    /**
     * Get ssh info.
     */
    export async function getSSHInfo(): Promise<{
        ip: string
        port: number
    }> {
        const res = await _req<
            ConnResponse<{
                ip: string
                port: number
            }>
        >({
            endPoint: 'jupyter',
            params: {
                action: 'get_ssh_info'
            }
        })
        return res.output_data!
    }

    /**
     *  Memory Usage
     */
    export interface IMemoryMetrics {
        memory_limit: number
        memory_usage: number
        memory_swap_enable: boolean
        memory_swap_usage: number
        memory_cache_usage?: number
        memory_rss_usage?: number
    }
    export async function getMemoryMetrics(): Promise<IMemoryMetrics> {
        const res = await _req<ConnResponse<IMemoryMetrics>>({
            endPoint: 'jupyter',
            params: {
                action: 'get_memory_metrics'
            }
        })
        return res.output_data!
    }

    /**
     *  Get Performance Series
     */

    export async function getPerformanceSeries(p: {
        chain_id: string
        typ: PerfQueryType
        rank: number
        data_interval: '5min' | '1min'
    }): Promise<Array<TaskTsObj>> {
        const res = await _req<ConnResponse<Array<TaskTsObj>>>({
            endPoint: 'experiment',
            params: {
                action: 'get_chain_perf_series',
                ...p
            }
        })
        return res.output_data!
    }

    export async function autoClearWorkSpaces(params: {
        active_workspaces: string[]
    }): Promise<void> {
        await _req<ConnResponse<void>>({
            endPoint: 'jupyter_no_hf_auth',
            params: {
                action: 'auto_clear_workspaces',
                ...params
            }
        })
    }

    export async function searchInGlobal(params: {
        chain_id: string
        content: string
    }): Promise<number[]> {
        let res = await _req<ConnResponse<number[]>>({
            endPoint: 'experiment',
            params: {
                action: 'search_in_global',
                ...params
            }
        })
        return res.output_data!
    }

    export interface IWatchDogInfo {
        running_seconds: number // 运行时间
        renew_quota: number // 续期 quota
        rest_renew_quota: number // 剩余续期 quota
        renew_watchdog_time: number // 单次续期的时间
        current_watchdog_time: number // 当前总时间，减去运行时间是剩余时间
        MARSV2_SPOT_JUPYTER: string
    }

    export async function getWatchDogInfo(): Promise<IWatchDogInfo> {
        let res = await _req<ConnResponse<IWatchDogInfo>>({
            endPoint: 'jupyter',
            params: {
                action: 'get_watchdog_info'
            }
        })
        return res.output_data!
    }

    export interface IRenewWatchDogTimeResp {
        msg: string
    }

    export async function renewWatchDogTime(): Promise<IRenewWatchDogTimeResp> {
        let res = await _req<ConnResponse<IRenewWatchDogTimeResp>>({
            endPoint: 'jupyter',
            params: {
                action: 'renew_watchdog_time'
            }
        })
        return res.output_data!
    }

    export async function getHAIConfig(): Promise<HaiConfig> {
        let res = await _req<ConnResponse<HaiConfig>>({
            endPoint: 'jupyter_no_hf_auth',
            params: {
                action: 'get_cluster_config'
            }
        })
        return res.output_data!
    }
}
