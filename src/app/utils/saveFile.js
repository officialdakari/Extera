import FileSaver from "file-saver";
import initMatrix from "../../client/initMatrix";
import { useEffect, useState } from "react";

if (window.cordova && typeof window.downloader !== 'undefined') {
    document.addEventListener('deviceready', () => {
        downloader.init({
            folder: 'Extera',
            unzip: false,
            noMedia: false
        });
    }, false);
}

const downloadStatus = {};

export function useDownloadStatus(src) {
    const [status, setStatus] = useState(downloadStatus[src]);
    useEffect(() => {
        setStatus(downloadStatus[src]);
    }, [downloadStatus]);
    return status;
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
            reader.onloadend = function () {
                const arrayBuffer = reader.result;

                // Сохраняем файл используя cordova-plugin-file
                window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, (dir) => {
                    dir.getFile(`Download/${targetName}`, { create: true }, (file) => {
                        file.createWriter(function (writer) {
                            writer.onwriteend = function () {
                                console.debug(`Downloaded!!!`);
                                setState('done');
                                alert(`Saved to Download/${targetName}`);
                            };
                            writer.onerror = function (e) {
                                console.error('Write failed: ' + e.toString());
                            };

                            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
                            writer.write(blob);
                            setState('saving');
                        }, errorHandler);
                    }, errorHandler);
                });
            };
            reader.readAsArrayBuffer(blob);
        } else if (typeof src === 'string') {
            // Оставляем существующий код для не-blob URL
            const ft = new FileTransfer();
            setState('downloading');
            ft.download(
                src,
                `/storage/emulated/0/Download/${targetName}`,
                function (entry) {
                    console.debug(`Downloaded!!!`);
                    alert(`Saved to Download/${targetName}`);
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
