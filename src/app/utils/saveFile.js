import FileSaver from "file-saver";
import { v4 } from "uuid";

export async function saveFile(src, name) {
    if (!window.cordova || cordova.platformId === 'browser') {
        return FileSaver.saveAs(src, name);
    }
    if (typeof src === 'string' && src.startsWith('http')) {
        window.open(src, '_system');
    } else {
        alert(`File is something other thing; cant download.`);
    }
}