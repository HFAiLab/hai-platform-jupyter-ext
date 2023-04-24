/**
 * 从服务端获取最新的消息推送
 */
import { GlobalAilabServerClient } from '@/serverConnection/ailabServer'
import { AilabServerApiName } from '@hai-platform/client-ailab-server'
import { CONSTS, MESSAGE_MANAGER } from '@/consts'
import HFLogger from '@/utils/log'
import { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { Signal } from '@lumino/signaling'
import { Context } from './manager'
import { ClusterUserMessageSchema } from '@hai-platform/shared'

export class MessageManager {
    constructor(ctx: Context) {
        this._messages = []
        this.messageUpdated = new Signal(this)
        this.fetchMessage = this.fetchMessage.bind(this)
        this._timeInterval = setInterval(
            this.fetchMessage,
            MESSAGE_MANAGER.refreshInterval
        )
        document.addEventListener(
            'visibilitychange',
            this.docVisibilityChangeCallback
        )
    }

    destroy() {
        document.removeEventListener(
            'visibilitychange',
            this.docVisibilityChangeCallback
        )
    }

    get _closedId(): Array<number> {
        return JSON.parse(
            window.localStorage.getItem(CONSTS.CLOSED_MESSAGE) ?? '[]'
        )
    }

    get popupMessages() {
        const closedId = this._closedId
        return this._messages.filter(
            i => i.messageId && !closedId.includes(i.messageId)
        )
    }

    get importantMessages() {
        return this._messages.filter(i => i.important)
    }

    get allMessages() {
        return this._messages
    }

    setClosed(id: number) {
        let oldValue = this._closedId
        const currentIds = this._messages.map(i => i.messageId)
        if (this._messages.length) {
            oldValue = oldValue.filter(v => currentIds.includes(v))
        }

        oldValue.push(id)
        window.localStorage.setItem(
            CONSTS.CLOSED_MESSAGE,
            JSON.stringify(Array.from(new Set(oldValue)))
        )
        this.messageUpdated.emit()
    }

    docVisibilityChangeCallback = () => {
        if (document.visibilityState !== 'visible') {
            return
        }
        if (
            this.lastRequestTime &&
            Date.now() - this.lastRequestTime < MESSAGE_MANAGER.refreshInterval
        ) {
            return
        }
        this.fetchMessage()
    }

    fetchMessage() {
        if (document.visibilityState !== 'visible') {
            return
        }

        GlobalAilabServerClient.request(AilabServerApiName.CLUSTER_MESSAGE)
            .then(res => {
                this._messages = res.messages
                this.lastRequestTime = Date.now()
                this.messageUpdated.emit()
            })
            .catch(() => {
                HFLogger.log(
                    '[HF-MESSENGER]Fetch message failed.',
                    HF_LOGGER_LEVEL.ERROR
                )
            })
    }

    lastRequestTime: number | null = null
    _messages: Array<ClusterUserMessageSchema>
    _timeInterval: number
    messageUpdated: Signal<this, void>
}
