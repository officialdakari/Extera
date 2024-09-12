import md5 from 'md5';
import initMatrix from '../../client/initMatrix';

function cacheFile(url: string, name: string): Promise<void> {
    const mx = initMatrix.matrixClient!;
    const { cordova, FileTransfer } = window as any;
    return new Promise<void>(async (resolve, reject) => {
        const ft = new FileTransfer();
        ft.download(
            url,
            `${cordova.file.cacheDirectory}/${name}`.replaceAll('//', '/'),
            function () {
                console.debug(`Downloaded!!!`);
                resolve();
            },
            function (error: Error) {
                console.error(error, `could not download !!! ${name}`, error);
                reject(error);
            },
            false,
            {

            }
        );
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
        const name = md5(url);
        const path = `${w.cordova.file.cacheDirectory}/${name}`.replaceAll('//', '/');

        w.resolveLocalFileSystemURL(path, (fileEntry: any) => {
            const nUrl = fileEntry.toURL();
            resolve(nUrl);
            console.log(`Loading file from cache ${nUrl} ${url}`);
        }, (err: Error) => {
            cacheFile(url, name);
            console.error(`Failed to cache file!`, url, name, err);
            resolve(url);
        });
    });
}