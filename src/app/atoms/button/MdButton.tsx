import React from 'react';

import { createComponent } from '@lit/react';
import { MdFilledButton as MdFilledButtonWebComponent } from '@material/web/button/filled-button';

export const MdButton = createComponent({
	tagName: 'md-filled-button',
	elementClass: MdFilledButtonWebComponent,
	react: React,
});