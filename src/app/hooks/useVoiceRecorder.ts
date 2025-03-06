import { useState, useRef, useCallback } from 'react';

type VoiceRecorder = {
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    blob: Blob | null;
    duration: number;
    resetBlob: () => void;
    getDuration: () => number;
};

export function useVoiceRecorder(): VoiceRecorder {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const startTime = useRef<number>(0);

    const startRecording = useCallback(() => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const recorder = new MediaRecorder(stream);
                mediaRecorder.current = recorder;

                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => chunks.push(e.data);

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                    setRecordedBlob(blob);
                    setDuration(Date.now() - startTime.current);
                    stream.getTracks().forEach(track => track.stop());
                };

                recorder.start();
                startTime.current = Date.now();
                setIsRecording(true);
            })
            .catch(err => console.error('Error accessing microphone:', err));
    }, []);

    const stopRecording = useCallback(() => {
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
        blob: recordedBlob,
        duration,
        getDuration,
        getBlob,
        resetBlob
    };
}
