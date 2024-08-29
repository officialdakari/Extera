import React from 'react';
import PropTypes from 'prop-types';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import { mdiCheck } from '@mdi/js';

function NotificationSelector({
  value, onSelect,
}) {
  return (
    <div>
      <MenuHeader>Notification</MenuHeader>
      <MenuItem iconSrc={value === 'off' ? mdiCheck : null} variant={value === 'off' ? 'positive' : 'surface'} onClick={() => onSelect('off')}>Off</MenuItem>
      <MenuItem iconSrc={value === 'on' ? mdiCheck : null} variant={value === 'on' ? 'positive' : 'surface'} onClick={() => onSelect('on')}>On</MenuItem>
      <MenuItem iconSrc={value === 'noisy' ? mdiCheck : null} variant={value === 'noisy' ? 'positive' : 'surface'} onClick={() => onSelect('noisy')}>Noisy</MenuItem>
    </div>
  );
}

NotificationSelector.propTypes = {
  value: PropTypes.oneOf(['off', 'on', 'noisy']).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default NotificationSelector;
