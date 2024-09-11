import md5 from 'md5';

function cacheFile(url: string, path: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const f = await fetch(url);
        if (!f.ok) throw new Error();
        const arrayBuffer = await f.arrayBuffer();
        const w = window as any;
        const { cordova } = w;

        // Сохраняем файл используя cordova-plugin-file
        w.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, (dir: any) => {
            dir.getFile(path, { create: true }, (file: any) => {
                file.createWriter(function (writer: any) {
                    writer.onwriteend = function () {
                        console.debug(`Downloaded!!!`);
                    };
                    writer.onerror = function (e: Error) {
                        console.error('Write failed: ' + e.toString());
                    };

                    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
                    writer.write(blob);
                    resolve();
                }, reject);
            }, reject);
        });
    });
}

export default function getCachedURL(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const w = window as any;
        if (!w.cordova || w.cordova.platformId === 'browser') {
            console.error(`not cordova, returning directly`);
            resolve(url);
            return;
        }
        const path = `${w.cordova.file.cacheDirectory}/${md5(url)}`;

        w.resolveLocalFileSystemURL(path, (fileEntry: any) => {
            const nUrl = fileEntry.toURL();
            resolve(nUrl);
            console.log(`Loading file from cache ${nUrl} ${url}`);
        }, (err: Error) => {
            cacheFile(url, path);
            console.error(`Failed to cache file!`, url, path, err);
            resolve(url);
        });
    });
}