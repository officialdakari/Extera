import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './Attachment.css';
import { useTheme } from '@mui/material';

export const Attachment = as<'div'>(
    ({ className, ...props }, ref) => {
        const theme = useTheme();
        return (
            <Box
                display="InlineFlex"
                direction="Column"
                className={classNames(css.Attachment, className)}
                style={{ backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}
                {...props}
                ref={ref}
            />
        );
    }
);

export const AttachmentHeader = as<'div'>(({ className, ...props }, ref) => (
    <Box
        shrink="No"
        gap="200"
        className={classNames(css.AttachmentHeader, className)}
        {...props}
        ref={ref}
    />
));

export const AttachmentBox = as<'div'>(({ className, ...props }, ref) => (
    <Box
        direction="Column"
        className={classNames(css.AttachmentBox, className)}
        {...props}
        ref={ref}
    />
));

export const AttachmentContent = as<'div'>(({ className, ...props }, ref) => (
    <Box
        direction="Column"
        className={classNames(css.AttachmentContent, className)}
        {...props}
        ref={ref}
    />
));
