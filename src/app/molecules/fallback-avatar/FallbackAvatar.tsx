import { AvatarFallback, color } from "folds";
import React from "react";

import * as css from './FallbackAvatar.css';
import colorMXID, { colorMXIDBrighter } from "../../../util/colorMXID";
import { nameInitials } from "../../utils/common";
import { getMxIdLocalPart } from "../../utils/matrix";

type FallbackAvatarProps = {
    userId: string;
    name?: string;
};

export default function FallbackAvatar({ userId, name }: FallbackAvatarProps) {
    return (
        <AvatarFallback
            style={{
                background: `linear-gradient(138deg, ${colorMXID(userId)} 0%, ${colorMXIDBrighter(userId)} 100%)`,
                color: color.Surface.Container
            }}
            className={css.UserAvatar}
        >
            {nameInitials(name ?? getMxIdLocalPart(userId))}
        </AvatarFallback>
    );
}

type FallbackRoomAvatarProps = {
    roomId: string;
    name?: string;
};

export function FallbackRoomAvatar({ roomId, name }: FallbackRoomAvatarProps) {
    return (
        <AvatarFallback
            style={{
                background: `linear-gradient(138deg, ${colorMXID(roomId)} 0%, ${colorMXIDBrighter(roomId)} 100%)`,
                color: color.Surface.Container
            }}
            className={css.UserAvatar}
        >
            <b>
                {nameInitials(name ?? roomId)}
            </b>
        </AvatarFallback>
    );
}