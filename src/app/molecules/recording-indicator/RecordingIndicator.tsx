import React, { useEffect, useMemo, useState } from "react";
import { motion } from 'framer-motion';
import { Typography } from "@mui/material";

type RecordingIndicatorProps = {
    startTime: number;
};
export default function RecordingIndicator({ startTime }: RecordingIndicatorProps) {
    const [duration, setDuration] = useState(0);
    const minutes = useMemo(() => Math.floor(duration / 1000 / 60), [duration]);
    const seconds = useMemo(() => {
        const s = `0${Math.floor(duration / 1000 % 60)}`;
        return s.slice(-2);
    }, [duration]);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    useEffect(() => {
        const i = setInterval(() => {
            setDuration(Date.now() - startTime);
        }, 1000);
        return () => {
            clearInterval(i);
        };
    }, [startTime]);
    return (
        <div style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                    width: '16px',
                    height: '16px',
                    background: 'red',
                    borderRadius: '50%'
                }}
            />
            <Typography variant='inherit'>
                {minutes}:{seconds}
            </Typography>
        </div>
    );
}