/* eslint-disable jsx-a11y/media-has-caption */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Text, toRem } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { Range } from 'react-range';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getFileSrcUrl } from './util';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
    PlayTimeCallback,
    useMediaLoading,
    useMediaPlay,
    useMediaPlayTimeCallback,
    useMediaSeek,
    useMediaVolume,
} from '../../../hooks/media';
import { useThrottle } from '../../../hooks/useThrottle';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import Icon from '@mdi/react';
import { mdiPause, mdiPlayOutline, mdiVolumeHigh, mdiVolumeMute } from '@mdi/js';
import { CircularProgress, IconButton, Slider } from '@mui/material';
import { AccessTime, Pause, PlayArrow } from '@mui/icons-material';

const PLAY_TIME_THROTTLE_OPS = {
    wait: 500,
    immediate: true,
};

type RenderMediaControlProps = {
    after: ReactNode;
    leftControl: ReactNode;
    rightControl: ReactNode;
    children: ReactNode;
};
export type AudioContentProps = {
    mimeType: string;
    url: string;
    info: IAudioInfo;
    encInfo?: EncryptedAttachmentInfo;
    renderMediaControl: (props: RenderMediaControlProps) => ReactNode;
};
export function AudioContent({
    mimeType,
    url,
    info,
    encInfo,
    renderMediaControl,
}: AudioContentProps) {
    const mx = useMatrixClient();

    const [srcState, loadSrc] = useAsyncCallback(
        useCallback(
            () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo, mx, true),
            [mx, url, mimeType, encInfo]
        )
    );

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [currentTime, setCurrentTime] = useState(0);
    // duration in seconds. (NOTE: info.duration is in milliseconds)
    const infoDuration = info.duration ?? 0;
    const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

    const getAudioRef = useCallback(() => audioRef.current, []);
    const { loading } = useMediaLoading(getAudioRef);
    const { playing, setPlaying } = useMediaPlay(getAudioRef);
    const { seek } = useMediaSeek(getAudioRef);
    const { volume, mute, setMute, setVolume } = useMediaVolume(getAudioRef);
    const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
        setDuration(d);
        setCurrentTime(ct);
    }, []);
    useMediaPlayTimeCallback(
        getAudioRef,
        useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPS)
    );

    const handlePlay = () => {
        if (srcState.status === AsyncStatus.Success) {
            setPlaying(!playing);
        } else if (srcState.status !== AsyncStatus.Loading) {
            loadSrc();
        }
    };

    return renderMediaControl({
        after: (
            <Slider
                size='small'
                value={currentTime}
                max={duration || 1}
                min={0}
                onChange={(evt, value) => seek(typeof value === 'number' ? value : value[0])}
            />
        ),
        leftControl: (
            <>
                <IconButton
                    onClick={handlePlay}
                    disabled={srcState.status === AsyncStatus.Loading}
                >
                    {srcState.status === AsyncStatus.Loading || loading ? (
                        <AccessTime />
                    ) : (
                        playing ? <Pause /> : <PlayArrow />
                    )}
                </IconButton>

                <Text size="T200">{`${secondsToMinutesAndSeconds(
                    currentTime
                )} / ${secondsToMinutesAndSeconds(duration)}`}</Text>
            </>
        ),
        rightControl: (
            <>
                <IconButton
                    onClick={() => setMute(!mute)}
                    aria-pressed={mute}
                >
                    <Icon size={0.8} path={mute ? mdiVolumeMute : mdiVolumeHigh} />
                </IconButton>
                <Slider
                    size='small'
                    step={0.1}
                    min={0}
                    max={1}
                    value={volume}
                    onChange={(evt, value) => setVolume(typeof value === 'number' ? value : value[0])}
                />
            </>
        ),
        children: (
            <audio controls={false} autoPlay ref={audioRef}>
                {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
            </audio>
        ),
    });
}
