/**
 * Modified from jupyter's extension cookiecutter
 */

import { URLExt } from '@jupyterlab/coreutils'
import { ServerConnection } from '@jupyterlab/services'

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
    endPoint = '',
    init: RequestInit = {}
): Promise<T> {
    // Make request to Jupyter API
    const settings = ServerConnection.makeSettings()
    const requestUrl = URLExt.join(
        settings.baseUrl,
        'jupyterlab_hai_platform_ext', // API Namespace
        endPoint
    )

    let response: Response

    try {
        response = await ServerConnection.makeRequest(
            requestUrl,
            init,
            settings
        )
    } catch (error) {
        // @ts-ignore
        throw new ServerConnection.NetworkError(error)
    }

    let data: string = await response.text()

    let isJson = false

    if (data.length > 0) {
        try {
            data = JSON.parse(data)
            isJson = true
        } catch (error) {
            throw new ServerConnection.ResponseError(response, data)
        }
    } else {
        throw new ServerConnection.ResponseError(
            response,
            'Error: Got a zero length response.'
        )
    }

    if (!response.ok) {
        interface ErrorMsg {
            success: number
            msg: string
        }

        const d = (data as unknown) as ErrorMsg

        throw new ServerConnection.ResponseError(
            response,
            isJson ? d.msg : data
        )
    }

    return (data as unknown) as T
}
