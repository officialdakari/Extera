/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { Suspense, lazy } from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Scroll, Text, as } from 'folds';
import { ErrorBoundary } from 'react-error-boundary';
import * as css from './TextViewer.css';
import { copyToClipboard } from '../../utils/dom';
import { getText } from '../../../lang';
import Icon from '@mdi/react';
import { mdiArrowLeft } from '@mdi/js';
import UserSelect from '../../atoms/user-select/UserSelect';
import { AppBar, DialogContent, IconButton, Toolbar, Typography } from '@mui/material';
import { Close, CopyAll } from '@mui/icons-material';

const ReactPrism = lazy(() => import('../../plugins/react-prism/ReactPrism'));

export type TextViewerProps = {
    name: string;
    text: string;
    langName: string;
    requestClose: () => void;
};

export const TextViewer = as<'div', TextViewerProps>(
    ({ className, name, text, langName, requestClose, ...props }, ref) => {
        const handleCopy = () => {
            copyToClipboard(text);
        };

        return (
            <>
                <AppBar position='static'>
                    <Toolbar>
                        <Typography
                            component='div'
                            variant='h6'
                            flexGrow={1}
                        >
                            {getText('btn.source_code')}
                        </Typography>
                        <IconButton onClick={handleCopy}>
                            <CopyAll />
                        </IconButton>
                        <IconButton onClick={requestClose}>
                            <Close />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    <Text as="pre" className={classNames(css.TextViewerPre, `language-${langName}`)}>
                        <ErrorBoundary fallback={<code>{text}</code>}>
                            <Suspense fallback={<code>{text}</code>}>
                                <UserSelect>
                                    <ReactPrism>{(codeRef) => <code ref={codeRef}>{text}</code>}</ReactPrism>
                                </UserSelect>
                            </Suspense>
                        </ErrorBoundary>
                    </Text>
                </DialogContent>
            </>
        );
    }
);
