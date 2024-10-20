import { ExtendButtonBase, IconButton, IconButtonTypeMap } from "@mui/material";
import { as, Box } from "folds";
import { HTMLMotionProps, motion } from "framer-motion";
import React, { forwardRef, ForwardRefExoticComponent, RefObject } from "react";

const BoxComponent = forwardRef(
    ((props, ref) => (
        //@ts-ignore
        <Box {...props} ref={ref} />
    ))
);

export const MotionBox: any = motion.create(BoxComponent);

const IconButtonComponent: ForwardRefExoticComponent<ExtendButtonBase<IconButtonTypeMap<{}, "button">>> = forwardRef(
    ((props, ref) => (
        //@ts-ignore
        <IconButton {...props} ref={ref} />
    ))
);

export const MotionIconButton = motion.create(IconButtonComponent);