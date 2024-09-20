import React, { ReactNode, useState } from 'react';
import { getText } from '../../../lang';

import * as css from './HiddenContent.css';
import { Box, Button } from 'folds';

type HiddenContentProps = {
    reason?: string;
    children: ReactNode | ReactNode[];
};
export default function HiddenContent({ reason, children }: HiddenContentProps) {
    const [show, setShow] = useState(false);
    return reason && !show
        ? (
            <div>
                <div className={css.HiddenContentDiv}>{children}</div>
                <Box className={css.AbsoluteContainer} grow='Yes' alignItems="Center" justifyContent="Center">
                    <Button
                        variant='Primary'
                        fill='Soft'
                        outlined
                        size='300'
                        radii='300'
                        className={css.RevealBtn}
                        onClick={() => setShow(true)}
                    >
                        {getText('hidden_content', getText(reason))}
                    </Button>
                </Box>
            </div>
        )
        : children;
}