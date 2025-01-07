import eruda from "eruda";
import { confirmDialog } from "../molecules/confirm-dialog/ConfirmDialog";
import { getText } from "../../lang";

export async function initEruda() {
    if (await confirmDialog(
        getText('eruda.warning.title'),
        getText('eruda.warning.desc'),
        'Continue anyway',
        'error'
    )) {
        eruda.init();
    }
}