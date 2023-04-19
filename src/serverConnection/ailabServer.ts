import type { AilabServerClient, AilabServerResponseData } from '@hai-platform/client-ailab-server'
import { createAilabServerClient } from '@hai-platform/client-ailab-server'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import qs from 'qs'
import { getToken } from '../utils'
import { AppToaster } from '@/utils/toast'
import {  DebugAilabServerPathWhiteList, getBFFUrl, getMarsServerHost, getMarsServerURL, hasCustomMarsServer } from '../consts'

// 来自 axios 源代码，axios 没暴露出来
function combineURLs(baseURL: string, relativeURL: string) {
    return relativeURL ? `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}` : baseURL
  }

export const createRequest = (defaultConfig?: AxiosRequestConfig) => {
  const axiosInstance = axios.create({
    method: 'POST',
    paramsSerializer: (params: any) => qs.stringify(params, { arrayFormat: 'repeat' }),
    ...defaultConfig,
  })
  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    if (!config.headers) {
        config.headers = {}
    }

    if (hasCustomMarsServer()) {
        if (!DebugAilabServerPathWhiteList.includes(config.url || '')) {
          throw new Error(`not allowed: ${config.url}`)
        }
        config.headers['x-custom-host'] = getMarsServerHost()
        config.headers['x-custom-mars-server'] = getMarsServerURL()
      }

    config.url = combineURLs(getBFFUrl(), config.url || '')

    // hint: 实际请求的时候加 token，防止 token 不够新
    config.headers.token = `${getToken()}`

    const response = await axiosInstance.request<AilabServerResponseData<T>>(config)

    if (response.status !== 200) {
      const { pathname } = new URL(config.url || '')
      AppToaster.show({
        message: `server(bff) return error, path: ${pathname}, status: ${response.status}`,
        intent: 'warning',
        icon: 'warning-sign',
      })
      throw new Error(`http response error: [${response.status}]${response.data}`)
    }

    const { data } = response

    if (!data.success) {
      AppToaster.show({
        message: `server(bff) return error, path: ${config.url}, msg: ${data.msg || ''}`,
        intent: 'warning',
        icon: 'warning-sign',
      })
      throw new Error(data.msg)
    }
    return data.data
  }
  return request
}

export const GlobalAilabServerClient: AilabServerClient = createAilabServerClient({
  httpRequest: createRequest(),
})
