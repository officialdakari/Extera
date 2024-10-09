import { AvatarFallback, AvatarImage, color } from 'folds';
import React, { ReactEventHandler, ReactNode, useState } from 'react';
import * as css from './UserAvatar.css';
import colorMXID from '../../../util/colorMXID';
import FallbackAvatar from '../../molecules/fallback-avatar/FallbackAvatar';

type UserAvatarProps = {
    userId: string;
    src?: string;
    alt?: string;
    renderFallback: () => ReactNode;
};
export function UserAvatar({ userId, src, alt, renderFallback }: UserAvatarProps) {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
        evt.currentTarget.setAttribute('data-image-loaded', 'true');
setLoading(false);
    };

    if (!src || error || loading) {
        return (
            <FallbackAvatar
                userId={userId}
                name={alt}
            />
            // <AvatarFallback
            //     style={{ backgroundColor: colorMXID(userId), color: color.Surface.Container }}
            //     className={css.UserAvatar}
            // >
            //     {renderFallback()}
            // </AvatarFallback>
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
