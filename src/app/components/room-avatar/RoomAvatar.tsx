import { JoinRule } from 'matrix-js-sdk';
import { AvatarFallback, AvatarImage, color } from 'folds';
import React, { ComponentProps, ReactEventHandler, ReactNode, forwardRef, useState } from 'react';
import * as css from './RoomAvatar.css';
import { joinRuleToIconSrc } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import Icon from '@mdi/react';
import { mdiPound } from '@mdi/js';

type RoomAvatarProps = {
    roomId: string;
    src?: string;
    alt?: string;
    renderFallback: () => ReactNode;
};
export function RoomAvatar({ roomId, src, alt, renderFallback }: RoomAvatarProps) {
    const [error, setError] = useState(false);

    const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
        evt.currentTarget.setAttribute('data-image-loaded', 'true');
    };

    if (!src || error) {
        return (
            <AvatarFallback
                style={{ backgroundColor: colorMXID(roomId ?? ''), color: color.Surface.Container }}
                className={css.RoomAvatar}
            >
                {renderFallback()}
            </AvatarFallback>
        );
    }

    return (
        <AvatarImage
            className={css.RoomAvatar}
            src={src}
            alt={alt}
            onError={() => setError(true)}
            onLoad={handleLoad}
            draggable={false}
        />
    );
}

export const RoomIcon = forwardRef<
    HTMLSpanElement,
    Omit<ComponentProps<typeof Icon>, 'path'> & {
        joinRule: JoinRule;
        space?: boolean;
    }
>(({ joinRule, space, ...props }, ref) => (
    <span ref={ref}>
        <Icon
            path={joinRuleToIconSrc(joinRule, space || false) ?? mdiPound}
            size={0.8}
            {...props}
        />
    </span>
));
