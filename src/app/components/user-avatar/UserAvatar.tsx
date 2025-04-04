import { AvatarFallback, AvatarImage, color } from 'folds';
import React, { ReactEventHandler, ReactNode, useState } from 'react';
import * as css from './UserAvatar.css';
import colorMXID from '../../../util/colorMXID';
import FallbackAvatar from '../../molecules/fallback-avatar/FallbackAvatar';

type UserAvatarProps = {
    userId: string;
    src?: string;
    alt?: string;
    renderFallback?: () => ReactNode;
};
export function UserAvatar({ userId, src, alt, renderFallback }: UserAvatarProps) {
    const [error, setError] = useState(false);

    const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
        evt.currentTarget.setAttribute('data-image-loaded', 'true');
    };

    if (!src || error) {
        return (
            <FallbackAvatar
                userId={userId}
                name={alt}
            />
        );
    }

    return (
        <AvatarImage
            className={css.UserAvatar}
            src={src}
            alt={alt}
            onError={() => setError(true)}
            onLoad={handleLoad}
            draggable={false}
        />
    );
}
