import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { decryptFile } from '../../../utils/matrix';
import { MatrixClient } from 'matrix-js-sdk';

export const getFileSrcUrl = async (
    httpUrl: string,
    mimeType: string,
    encInfo?: EncryptedAttachmentInfo,
    mx?: MatrixClient,
    forceFetch?: boolean
): Promise<string> => {
    if (encInfo) {
        if (typeof httpUrl !== 'string') throw new Error('Malformed event');
        const encRes = await fetch(httpUrl, {
            method: 'GET',
            headers: mx ? {
                Authorization: `Bearer ${mx?.getAccessToken()}`
            } : undefined
        });
        const encData = await encRes.arrayBuffer();
        const decryptedBlob = await decryptFile(encData, mimeType, encInfo);
        return URL.createObjectURL(decryptedBlob);
    }
    if (forceFetch) {
        if (typeof httpUrl !== 'string') throw new Error('Malformed event');
        const res = await fetch(httpUrl, {
            method: 'GET',
            headers: mx ? {
                Authorization: `Bearer ${mx?.getAccessToken()}`
            } : undefined
        });
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }
    return httpUrl;
};

export const getSrcFile = async (src: string): Promise<Blob> => {
    const res = await fetch(src, { method: 'GET' });
    const blob = await res.blob();
    return blob;
};
