import { useRef, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import './Banner.scss';
import initMatrix from '../../../client/initMatrix';
export default function Banner({ url, noBorder, onUpload, emptyBanner }) {
    const mx = useMatrixClient();
    const uploadImageRef = useRef(null);
    const [uploadPromise, setUploadPromise] = useState(null);

    async function uploadImage(e) {
        const file = e.target.files.item(0);
        if (file === null) return;
        try {
            const uPromise = initMatrix.matrixClient.uploadContent(file);
            setUploadPromise(uPromise);

            const res = await uPromise;
            if (typeof res?.content_uri === 'string') onUpload(res.content_uri);
            setUploadPromise(null);
        } catch {
            setUploadPromise(null);
        }
        uploadImageRef.current.value = null;
    }

    function handleClick() {
        if (uploadPromise !== null) return;
        uploadImageRef.current?.click();
    };

    function cancelUpload() {
        initMatrix.matrixClient.cancelUpload(uploadPromise);
        setUploadPromise(null);
        uploadImageRef.current.value = null;
    }

    return (
        <div onClick={handleClick} className={noBorder ? 'banner-container-nb' : 'banner-container'}>
            {
                !emptyBanner ?
                    <img src={mx.mxcUrlToHttp(url)} className='profile-banner' /> :
                    <div style={{ height: '150px', backgroundColor: emptyBanner }} />
            }
            <input type='file' accept='image/*' onChange={uploadImage} ref={uploadImageRef} style={{ display: 'none' }} />
        </div>
    );
}