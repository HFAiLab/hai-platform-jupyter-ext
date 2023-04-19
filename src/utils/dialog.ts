import { showDialog, Dialog } from '@jupyterlab/apputils'
import { Widget } from '@lumino/widgets'
import { i18n, i18nKeys } from '@hai-platform/i18n'

function _createSaveNode(value: string): HTMLElement {
    const input = document.createElement('input')
    input.value = value
    return (input as unknown) as HTMLElement
}

class _InputWidget extends Widget {
    /**
     * Make a modal node for getting input value.
     * @param value Default value.
     */
    constructor(value: string) {
        super({ node: _createSaveNode(value) })
    }

    /**
     * Gets the input value entered by the user.
     */
    getValue(): string {
        return ((this.node as unknown) as HTMLInputElement).value
    }
}

/**
 * Show a dialog then get a value from user.
 * @param title Title of the dialog.
 * @param defaultValue Default value of the input element.
 * @param btn Label of ok button, defalult 'Submit'.
 * @returns Intput value  or null.
 */
export const inputDialog = async (
    title: string,
    defaultValue: string,
    btn?: string
): Promise<string | null> => {
    const submitBtn = Dialog.okButton({
        label: btn ?? i18n.t(i18nKeys.base_Submit)
    })
    const result = await showDialog({
        title: title,
        body: new _InputWidget(defaultValue),
        buttons: [
            Dialog.cancelButton({ label: i18n.t(i18nKeys.base_Cancel) }),
            submitBtn
        ]
    })
    if (result.button.label === submitBtn.label) {
        return result.value
    } else {
        return null
    }
}
