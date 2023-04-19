import type { ApiServerClient, ApiServerResponseData } from '@hai-platform/client-api-server'
import {
  convertHttpResponse,
  createApiServerClient,
} from '@hai-platform/client-api-server'
import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import qs from 'qs'
import { AppToaster } from '@/utils/toast'
import {  getToken } from '../utils'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { getMarsServerHost, getMarsServerURL, getProxyUrl } from '../consts'

// 来自 axios 源代码，axios 没暴露出来
function combineURLs(baseURL: string, relativeURL: string) {
  return relativeURL ? `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}` : baseURL
}

const ToastIgnorePaths = ['query/optimized/get_task', 'query/task']

export const createRequest = (defaultConfig?: AxiosRequestConfig) => {
  const axiosInstance = axios.create({
    method: 'POST',
    paramsSerializer: (params: any) => qs.stringify(params, { arrayFormat: 'repeat' }),
    // https://github.com/axios/axios/issues/4531
    proxy: false,
    ...defaultConfig,
  })
  const request = async <T>(config: AxiosRequestConfig, name: string): Promise<T> => {
    const url = combineURLs(getMarsServerURL(), config.url!)
    const endPoint = new URL(url).pathname

    if (!config.params) {
      config.params = { token: getToken() }
    }

    if (config.params && !config.params.token) {
      config.params.token = getToken()
    }

    // proxy 后端请求时实际使用的 config
    const realConfig = {
      method: 'POST',
      proxy: false,
      ...config,
      headers: {
        'Content-Type': 'application/json',
        'token': `${getToken()}`,
        'x-custom-host': getMarsServerHost(),
        ...(config.headers || {}),
      },
    }

    const reqURL = `${getProxyUrl()}?endPoint=${endPoint}`
    const reqBody = {
      url,
      config: realConfig,
    }

    const newConfig: AxiosRequestConfig = {
      method: 'POST',
      data: reqBody,
      url: reqURL,
      headers: {
        'Content-Type': 'application/json',
        'token': `${getToken()}`,
      },
    }

    let data: ApiServerResponseData<T>
    try {
      data = convertHttpResponse<ApiServerResponseData<T>>(
        config,
        (await axiosInstance.request(newConfig)).data,
        name,
      )
    } catch (e) {
      AppToaster.show({
        message: i18n.t(i18nKeys.biz_cluster_internal_server_error, {
          url: config.url,
        }),
        intent: 'danger',
        icon: 'error',
      })
      throw e
    }

    if (data.success !== 1) {
        // FIXME: 这样灵活性欠佳，这种逻辑最好暴露给调用者
        if (!ToastIgnorePaths.includes(config.url || '')) {
            AppToaster.show({
                message: `${i18n.t(i18nKeys.biz_cluster_internal_server_error, {
                url: endPoint,
                })} msg: ${data.msg}`,
                intent: 'danger',
                icon: 'error',
            })
        }

        throw new Error(data.msg)
    }
    return data.result
  }

  return request
}

export const GlobalApiServerClient: ApiServerClient = createApiServerClient({
  httpRequest: createRequest(),
})
