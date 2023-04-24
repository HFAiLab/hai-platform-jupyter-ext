const getIsProduction = () => {
    try {
        // @ts-expect-error because process ignore
        const HF_FE_ENV = process.env.HF_FE_ENV
        return !(HF_FE_ENV === 'development')
    } catch (e) {
        return true
    }
}

export const isProduction = getIsProduction()
