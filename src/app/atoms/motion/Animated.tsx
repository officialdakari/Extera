import { as, Box } from "folds";
import { HTMLMotionProps, motion } from "framer-motion";
import React, { forwardRef, RefObject } from "react";

const BoxComponent = forwardRef(
    ((props, ref) => (
        //@ts-ignore
        <Box {...props} ref={ref} />
    ))
);

export const MotionBox: any = motion.create(BoxComponent);