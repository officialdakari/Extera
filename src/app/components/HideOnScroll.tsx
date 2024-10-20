import React, { PropsWithChildren } from 'react';
import { Slide, useScrollTrigger } from "@mui/material";

function HideOnScroll({ children, target }: any) {
    const trigger = useScrollTrigger({
        target: target ?? undefined
    });

    return (
        <Slide appear={false} direction="down" in={!trigger}>
            {children ?? <div />}
        </Slide>
    );
}

export default HideOnScroll;