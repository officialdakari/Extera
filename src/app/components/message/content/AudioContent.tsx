/* eslint-disable jsx-a11y/media-has-caption */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Badge, Chip, IconButton, ProgressBar, Spinner, Text, toRem } from 'folds';
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
            () => getFileSrcUrl(mx.mxcUrlToHttp(url, undefined, undefined, undefined, false, true, true) ?? '', mimeType, encInfo, mx),
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
            <Range
                step={1}
                min={0}
                max={duration || 1}
                values={[currentTime]}
                onChange={(values) => seek(values[0])}
                renderTrack={(params) => (
                    <div {...params.props}>
                        {params.children}
                        <ProgressBar
                            as="div"
                            variant="Secondary"
                            size="300"
                            min={0}
                            max={duration}
                            value={currentTime}
                            radii="300"
                        />
                    </div>
                )}
                renderThumb={(params) => (
                    <Badge
                        size="300"
                        variant="Secondary"
                        fill="Solid"
                        radii="Pill"
                        outlined
                        {...params.props}
                        style={{
                            ...params.props.style,
                            zIndex: 0,
                        }}
                    />
                )}
            />
        ),
        leftControl: (
            <>
                <Chip
                    onClick={handlePlay}
                    variant="Secondary"
                    radii="300"
                    disabled={srcState.status === AsyncStatus.Loading}
                    before={
                        srcState.status === AsyncStatus.Loading || loading ? (
                            <Spinner variant="Secondary" size="50" />
                        ) : (
                            <Icon size={0.8} path={playing ? mdiPause : mdiPlayOutline} />
                        )
                    }
                >
                    <Text size="B300">{playing ? 'Pause' : 'Play'}</Text>
                </Chip>

                <Text size="T200">{`${secondsToMinutesAndSeconds(
                    currentTime
                )} / ${secondsToMinutesAndSeconds(duration)}`}</Text>
            </>
        ),
        rightControl: (
            <>
                <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="Pill"
                    onClick={() => setMute(!mute)}
                    aria-pressed={mute}
                >
                    <Icon size={0.8} path={mute ? mdiVolumeMute : mdiVolumeHigh} />
                </IconButton>
                <Range
                    step={0.1}
                    min={0}
                    max={1}
                    values={[volume]}
                    onChange={(values) => setVolume(values[0])}
                    renderTrack={(params) => (
                        <div {...params.props}>
                            {params.children}
                            <ProgressBar
                                style={{ width: toRem(48) }}
                                variant="Secondary"
                                size="300"
                                min={0}
                                max={1}
                                value={volume}
                                radii="300"
                            />
                        </div>
                    )}
                    renderThumb={(params) => (
                        <Badge
                            size="300"
                            variant="Secondary"
                            fill="Solid"
                            radii="Pill"
                            outlined
                            {...params.props}
                            style={{
                                ...params.props.style,
                                zIndex: 0,
                            }}
                        />
                    )}
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
