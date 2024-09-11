import './Banner.scss';
export default function Banner({ url, noBorder }) {
    return (
        <div className={noBorder ? 'banner-container-nb__pv' : 'banner-container__pv'}>
            <img src={url} className='profile-banner' />
        </div>
    );
}