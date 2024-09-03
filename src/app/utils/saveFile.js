import FileSaver from "file-saver";
import { v4 } from "uuid";

if (window.cordova) {
    downloader.init({
        folder: 'Extera',
        unzip: false,
        noMedia: false
    });
}

export async function saveFile(src, name) {
    if (!window.cordova || cordova.platformId === 'browser') {
        return FileSaver.saveAs(src, name);
    }
    console.log(`Saving file ${src} ${name}`);
    if (typeof src === 'string') {
        downloader.get(src, null, name);
    } else {
        alert(`File is something other thing; cant download.`);
    }
}