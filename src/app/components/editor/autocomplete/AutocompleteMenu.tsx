import React, { ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { Header, Scroll, config } from 'folds';

import * as css from './AutocompleteMenu.css';
import { preventScrollWithArrowKey } from '../../../utils/keyboard';
import { Menu, Paper, useTheme } from '@mui/material';

type AutocompleteMenuProps = {
    requestClose: () => void;
    headerContent: ReactNode;
    children: ReactNode;
};
export function AutocompleteMenu({ headerContent, requestClose, children }: AutocompleteMenuProps) {
    const theme = useTheme();
    return (
        <div className={css.AutocompleteMenuBase}>
            <div className={css.AutocompleteMenuContainer}>
                <FocusTrap
                    focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: () => requestClose(),
                        returnFocusOnDeactivate: false,
                        clickOutsideDeactivates: true,
                        allowOutsideClick: true,
                        isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
                        isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
                    }}
                >
                    <Paper className={css.AutocompleteMenu}>
                        <Header className={css.AutocompleteMenuHeader} size="400">
                            {headerContent}
                        </Header>
                        <Scroll style={{ flexGrow: 1 }} onKeyDown={preventScrollWithArrowKey}>
                            <div style={{ padding: config.space.S200 }}>{children}</div>
                        </Scroll>
                    </Paper>
                </FocusTrap>
            </div>
        </div>
    );
}
