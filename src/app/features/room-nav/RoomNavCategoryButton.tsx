import React, { RefObject } from 'react';
import classNames from 'classnames';
import * as css from './styles.css';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';
import { Chip, ChipProps } from '@mui/material';
import { as } from 'folds';

export const RoomNavCategoryButton = ({ className, closed, children, ...props }: ChipProps & { closed?: boolean }) => (
    <Chip
        sx={{ justifyContent: 'start', background: 'transparent' }}
        className={classNames(css.CategoryButton, className)}
        icon={
            <Icon
                className={css.CategoryButtonIcon}
                size={1}
                path={closed ? mdiChevronRight : mdiChevronDown}
            />
        }
        label={children}
        {...props}
    />
);