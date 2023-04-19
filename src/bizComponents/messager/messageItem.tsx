import React from 'react'
import { Icon, Button } from '@hai-ui/core/lib/esm'
import { IconName } from '@hai-ui/icons/lib/esm'
import { relTime } from '@utils/convert'
import { getNameSpace } from '@/utils'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { okDialog } from '@hai-platform/studio-pages/lib/ui-components/dialog'
import { ClusterUserMessageSchema } from '@hai-platform/shared'

export interface IMessageItem extends ClusterUserMessageSchema {
    closeHandler?: (id?: number) => void
    extraClass?: string
    key?: any
    asToast?: boolean // 是否作为 toast 出现
    closeable?: boolean // 可否关闭
}

const STYLE_MAP = {
    normal: {
        fill: 'var(--hai-ui-color-message-title-normal)',
        icon: 'info-sign'
    },
    warning: {
        fill: 'var(--hai-ui-color-message-title-warning)',
        icon: 'warning-sign'
    },
    danger: {
        fill: 'var(--hai-ui-color-message-title-danger)',
        icon: 'warning-sign'
    },
    success: {
        fill: 'var(--hai-ui-color-message-title-success)',
        icon: 'tick'
    }
}

export const MessageItem: React.FC<IMessageItem> = ({
    messageId,
    title,
    type,
    children,
    content,
    key,
    asToast,
    detailContent,
    detailText,
    closeable,
    closeHandler,
    extraClass,
    date
}) => {
    const ns = getNameSpace()

    detailText = detailText ?? i18n.t(i18nKeys.biz_message_detail)
    type = type ?? 'normal'
    const className = `${ns}-messageitem ${
        asToast ? ns + '-toast' : ''
    } ${extraClass ?? ''} ${type ?? 'normal'}`

    let detailNode
    if (!detailContent) {
        detailNode = null
    } else {
        if (
            detailContent.startsWith('http://') ||
            detailContent.startsWith('https://')
        ) {
            detailNode = (
                <a className="detail" href={detailContent} target="_blank">
                    {detailText}
                </a>
            )
        } else {
            detailNode = (
                <a
                    className="detail"
                    onClick={() => okDialog(detailContent, title ?? 'Message')}
                >
                    {detailText}
                </a>
            )
        }
    }

    const handleClose =
        closeable && closeHandler
            ? () => {
                  closeHandler(messageId)
              }
            : undefined

    return (
        <div key={key} className={className}>
            {closeable && (
                <Button
                    icon="small-cross"
                    color={STYLE_MAP[type].fill}
                    onClick={handleClose}
                    minimal={true}
                    small={true}
                />
            )}
            <div className="title">
                <Icon
                    color={STYLE_MAP[type].fill}
                    icon={STYLE_MAP[type].icon as IconName}
                />
                <span className="t">{title ?? 'Message'}</span>
            </div>
            <div className="message">
                {content}
                {children}
                {detailNode}
            </div>
            {date && <div className="date">{relTime(date)}</div>}
        </div>
    )
}
