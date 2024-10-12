import { Box, LinearProgress, LinearProgressProps, Typography } from "@mui/material";
import React from "react";

export default function LinearProgressWithLabel(props: LinearProgressProps) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`${Math.round(props.value || 0)}%`}
                </Typography>
            </Box>
        </Box>
    );
}
