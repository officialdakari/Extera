import React from 'react';
import { as, Chip, Text } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';

export const RoomNavCategoryButton = as<'button', { closed?: boolean }>(
  ({ className, closed, children, ...props }, ref) => (
    <Chip
      className={classNames(css.CategoryButton, className)}
      variant="Background"
      radii="Pill"
      before={
        <Icon
          className={css.CategoryButtonIcon}
          size={1}
          path={closed ? mdiChevronRight : mdiChevronDown}
        />
      }
      {...props}
      ref={ref}
    >
      <Text size="O400" priority="400" truncate>
        {children}
      </Text>
    </Chip>
  )
);
