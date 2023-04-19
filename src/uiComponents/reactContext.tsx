import React from 'react'
import { Context } from '@/contextManager'

export const ServiceContext = React.createContext<{
    ctx: Context
    forceUpdate?: () => void
    // @ts-ignore
}>(null)
