import { useState, useRef, useCallback } from 'react';

type VoiceRecorder = {
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    cancelRecording: () => void;
    blob: Blob | null;
    duration: number;
    resetBlob: () => void;
    getDuration: () => number;
    getBlob: () => Blob | null;
    startTime: number;
    cancelled: boolean;
};

export function useVoiceRecorder(): VoiceRecorder {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [cancelled, setCancelled] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const startTime = useRef<number>(0);

    const startRecording = useCallback(() => {
        setCancelled(false);
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const recorder = new MediaRecorder(stream);
                mediaRecorder.current = recorder;

                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                    if (!cancelled) {
                        setRecordedBlob(blob);
                        setDuration(Date.now() - startTime.current);
                    }
                    stream.getTracks().forEach(track => track.stop());
                };

                recorder.start();
                startTime.current = Date.now();
                setIsRecording(true);
            })
            .catch(err => console.error('Error accessing microphone:', err));
    }, [cancelled]);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        setCancelled(true);
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    const getBlob = useCallback(() => recordedBlob, [recordedBlob]);

    const getDuration = useCallback(() => duration, [duration]);

    const resetBlob = useCallback(() => {
        setRecordedBlob(null);
    }, [setRecordedBlob]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        cancelRecording,
        blob: recordedBlob,
        duration,
        getDuration,
        getBlob,
        resetBlob,
        startTime: startTime.current,
        cancelled
    };
}
