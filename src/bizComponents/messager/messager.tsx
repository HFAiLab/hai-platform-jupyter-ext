import React from 'react'
import { Toaster, ToasterPosition } from '@hai-ui/core/lib/esm'
import { IMessageItem, MessageItem } from './messageItem'
import { getNameSpace } from '@/utils'
import { ClusterUserMessageSchema } from '@hai-platform/shared'

interface IMessager {
    messages: Array<ClusterUserMessageSchema>
    position: ToasterPosition
    closeHandler: IMessageItem['closeHandler']
    extraClass?: string
    ItemExtraClass?: string
}

export const Messager: React.FC<IMessager> = ({
    messages,
    position,
    closeHandler,
    ItemExtraClass,
    extraClass
}) => {
    return (
        <Toaster
            className={`${getNameSpace()}-messager ${extraClass}`}
            position={position}
        >
            {messages.map(m => (
                <MessageItem
                    key={m.messageId}
                    {...m}
                    closeable={true}
                    closeHandler={closeHandler}
                    extraClass={ItemExtraClass}
                    asToast
                ></MessageItem>
            ))}
        </Toaster>
    )
}
