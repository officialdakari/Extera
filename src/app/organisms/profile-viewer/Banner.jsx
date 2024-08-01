import { useMatrixClient } from '../../hooks/useMatrixClient';
import './Banner.scss';
export default function Banner({ url, noBorder }) {
    const mx = useMatrixClient();
    return (
        <div className={noBorder ? 'banner-container-nb__pv' : 'banner-container__pv'}>
            <img src={mx.mxcUrlToHttp(url)} className='profile-banner' />
        </div>
    );
}