import React, { ComponentProps } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';

import * as css from './RoomInputPlaceholder.css';

type RoomInputPlaceholderProps = {
    newDesign?: boolean;
};
export const RoomInputPlaceholder = as<'div', ComponentProps<typeof Box> & RoomInputPlaceholderProps>(
    ({ className, newDesign, ...props }, ref) => (
        <Box className={classNames(newDesign ? css.RoomInputPlaceholderND : css.RoomInputPlaceholder, className)} {...props} ref={ref} />
    )
);