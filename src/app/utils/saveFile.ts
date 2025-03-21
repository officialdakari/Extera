/* eslint-disable no-param-reassign */
import FileSaver from "file-saver";
import initMatrix from "../../client/initMatrix";
import { roomIdToHash } from "./notifications";
import { getText } from "../../lang";

function onDownloaded(fileName: string) {
	const cordova: any = 'cordova' in window ? window.cordova : null;
	if (!cordova) return;
	cordova.plugins.notification.local.hasPermission((granted: boolean) => {
		if (granted) {
			cordova.plugins.notification.local.schedule({
				id: roomIdToHash(fileName),
				title: fileName,
				text: getText('downloaded')
			});
		}
	});
}

function getExteraDirectory(): Promise<any> | null {
	const resolveLocalFileSystemURL: any = 'resolveLocalFileSystemURL' in window ? window.resolveLocalFileSystemURL : null;
	const cordova: any = 'cordova' in window ? window.cordova : null;
	if (!resolveLocalFileSystemURL || !cordova) return null;
	return new Promise((resolve) => {
		resolveLocalFileSystemURL(`${cordova.file.externalRootDirectory}/Download`, (dirEntry: any) => {
			dirEntry.getDirectory('Extera', { create: true }, resolve);
		});
	});
}

function errorHandler(error: any) {
	console.error('Error: ', error);
}

export async function saveFile(url: string, name: string) {
	let src = `${url}`;
	const mx = initMatrix.matrixClient;
	const resolveLocalFileSystemURL: any = 'resolveLocalFileSystemURL' in window ? window.resolveLocalFileSystemURL : null;
	const cordova: any = 'cordova' in window ? window.cordova : null;
	if (!mx) return;
	console.log(`Saving file ${src} ${name}`);
	if (!resolveLocalFileSystemURL || !cordova || cordova.platformId === 'browser') {
		const token = mx.getAccessToken()!;
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
			const response = await fetch(src);
			const blob = await response.blob();

			// Создаем FileReader для чтения blob как ArrayBuffer
			const reader = new FileReader();
			reader.onloadend = async () => {
				const arrayBuffer: ArrayBuffer = reader.result as ArrayBuffer;
				const dir = await getExteraDirectory();
				dir.getFile(targetName, { create: true }, (file: any) => {
					file.createWriter((writer: any) => {
						writer.onwriteend = function () {
							console.debug(`Downloaded!!!`);
							onDownloaded(targetName);
						};
						writer.onerror = (e: any) => {
							console.error(`Write failed: ${e.toString()}`);
						};

						const dlblob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
						writer.write(dlblob);
					}, errorHandler);
				}, errorHandler);
			};
			reader.readAsArrayBuffer(blob);
		} else if (typeof src === 'string') {
			const FileTransfer: any = 'FileTransfer' in window ? window.FileTransfer : null;
			if (!FileTransfer) return;
			// Оставляем существующий код для не-blob URL
			const ft = new FileTransfer();
			await getExteraDirectory();
			ft.download(
				src,
				`/storage/emulated/0/Download/Extera/${targetName}`,
				() => {
					console.debug(`Downloaded!!!`);
					onDownloaded(targetName);
				},
				(error: any) => {
					console.error(error, `could not download !!! ${targetName}`);
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
