import { i18n, i18nKeys } from '@hai-platform/i18n'
import { AppToaster } from './toast'

export function copyToClipboard(text: string): boolean {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    const result = document.execCommand('copy')
    document.body.removeChild(input)
    return result
}

export function simpleCopy(text: string, name?: string) {
    copyToClipboard(text)
        ? AppToaster.show({
              message: i18n.t(i18nKeys.biz_simple_copy_success, {
                  name: name ?? ''
              }),
              intent: 'success',
              icon: 'tick'
          })
        : AppToaster.show({
              message: i18n.t(i18nKeys.biz_simple_copy_failed, {
                  name: name ?? ''
              }),
              intent: 'warning',
              icon: 'warning-sign'
          })
}
