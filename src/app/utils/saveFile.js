import FileSaver from "file-saver";
import initMatrix from "../../client/initMatrix";
import { useEffect, useState } from "react";
import { roomIdToHash } from "./notifications";
import { getText } from "../../lang";

const downloadStatus = {};

export function useDownloadStatus(src) {
    const [status, setStatus] = useState(downloadStatus[src]);
    useEffect(() => {
        setStatus(downloadStatus[src]);
    }, [downloadStatus]);
    return status;
}

function onDownloaded(fileName) {
    cordova.plugins.notification.local.hasPermission(granted => {
        if (granted) {
            cordova.plugins.notification.local.schedule({
                id: roomIdToHash(fileName),
                title: fileName,
                text: getText('downloaded')
            });
        }
    });
}

function getExteraDirectory() {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(`${cordova.file.externalRootDirectory}/Download`, (dirEntry) => {
            dirEntry.getDirectory('Extera', { create: true }, resolve);
        });
    });
}

export async function saveFile(src, name) {
    const mx = initMatrix.matrixClient;
    console.log(`Saving file ${src} ${name}`);
    const setState = (state) => {
        downloadStatus[src] = state;
    };
    if (!window.cordova || cordova.platformId === 'browser') {
        const token = mx.getAccessToken();
        if (!src.includes(token)) {
            src += `${src.includes('?') ? '&' : '?'}access_token=${token}`;
        }
        FileSaver.saveAs(src, name);
        return;
    }

    try {
        const spl = name.split('.');
        const targetName = [
            ...spl.slice(0, spl.length - 1),
            '-', Date.now().toString(),
            '.', spl[spl.length - 1]
        ].join('');
        // Проверяем, является ли src blob URL
        if (src.startsWith('blob:')) {
            // Получаем blob из URL
            setState('downloading');
            const response = await fetch(src);
            const blob = await response.blob();

            // Создаем FileReader для чтения blob как ArrayBuffer
            const reader = new FileReader();
            reader.onloadend = async () => {
                const arrayBuffer = reader.result;
                const dir = await getExteraDirectory();
                dir.getFile(targetName, { create: true }, (file) => {
                    file.createWriter(function (writer) {
                        writer.onwriteend = function () {
                            console.debug(`Downloaded!!!`);
                            setState('done');
                            onDownloaded(targetName);
                        };
                        writer.onerror = function (e) {
                            console.error('Write failed: ' + e.toString());
                        };

                        const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
                        writer.write(blob);
                        setState('saving');
                    }, errorHandler);
                }, errorHandler);
            };
            reader.readAsArrayBuffer(blob);
        } else if (typeof src === 'string') {
            // Оставляем существующий код для не-blob URL
            const ft = new FileTransfer();
            await getExteraDirectory();
            setState('downloading');
            ft.download(
                src,
                `/storage/emulated/0/Download/Extera/${targetName}`,
                function (entry) {
                    console.debug(`Downloaded!!!`);
                    onDownloaded(targetName);
                    setState('done');
                },
                function (error) {
                    console.error(error, `could not download !!! ${targetName}`);
                    setState('error');
                },
                false,
                {
                    headers: {
                        'Authorization': mx ? `Bearer ${mx.getAccessToken()}` : undefined
                    }
                }
            );
        } else {
            alert(`File is something other thing; cant download.`);
        }
    } catch (error) {
        console.error('Error saving file:', error);
        alert('Error saving file. Please try again.');
    }
}

function errorHandler(error) {
    console.error('Error: ', error);
}
