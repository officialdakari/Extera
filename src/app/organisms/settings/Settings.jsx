import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './Settings.scss';

import '../profile-viewer/Banner.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import navigation from '../../../client/state/navigation';
import {
    toggleSystemTheme,
    toggleNotifications, toggleNotificationSounds,
} from '../../../client/action/settings';
import { usePermission } from '../../hooks/usePermission';

import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import SettingTile from '../../molecules/setting-tile/SettingTile';
import ImportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ImportE2ERoomKeys';
import ExportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ExportE2ERoomKeys';
import { ImagePackUser, ImagePackGlobal } from '../../molecules/image-pack/ImagePack';
import GlobalNotification from '../../molecules/global-notification/GlobalNotification';
import KeywordNotification from '../../molecules/global-notification/KeywordNotification';
import IgnoreUserList, { IgnorePolicyList } from '../../molecules/global-notification/IgnoreUserList';

import ProfileEditor from '../profile-editor/ProfileEditor';
import CrossSigning from './CrossSigning';
import KeyBackup from './KeyBackup';
import DeviceManage from './DeviceManage';

import { Switch, Button, ToggleButtonGroup, ToggleButton, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Dialog, AppBar, IconButton, Tab, Tabs, useTheme } from '@mui/material';

import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { isMacOS } from '../../utils/user-agent';
import { KeySymbol } from '../../utils/key-symbol';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Box, config, Header } from 'folds';
import Banner from '../profile-editor/Banner';
import { getText } from '../../../lang';
import { useBackButton } from '../../hooks/useBackButton';
import { disablePush, enablePush } from '../../../push';
import { mdiArrowLeft, mdiBell, mdiClose, mdiCog, mdiEmoticon, mdiEye, mdiInformationSlabCircle, mdiInformationSlabCircleOutline, mdiLock, mdiStar } from '@mdi/js';
import { authRequest } from './AuthRequest';
import Icon from '@mdi/react';
import FocusTrap from 'focus-trap-react';
import getCachedURL from '../../utils/cache';
import wallpaperDB from '../../utils/wallpaper';
import { useAccountData } from '../../hooks/useAccountData';
import ProminientToolbar from '../../components/prominient-toolbar/ProminientToolbar';
import { Close, HideImage, Image, Logout } from '@mui/icons-material';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { AnimatePresence } from 'framer-motion';
import { AnimatedLayout } from '../../components/page';

function AppearanceSection() {
    const [, updateState] = useState({});

    const mx = useMatrixClient();

    const [enterForNewline, setEnterForNewline] = useSetting(settingsAtom, 'enterForNewline');
    const [messageLayout, setMessageLayout] = useSetting(settingsAtom, 'messageLayout');
    const [messageSpacing, setMessageSpacing] = useSetting(settingsAtom, 'messageSpacing');
    const [twitterEmoji, setTwitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');
    const [isMarkdown, setIsMarkdown] = useSetting(settingsAtom, 'isMarkdown');
    const [hideMembershipEvents, setHideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
    const [hideNickAvatarEvents, setHideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');
    const [mediaAutoLoad, setMediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
    const [urlPreview, setUrlPreview] = useSetting(settingsAtom, 'urlPreview');
    const [encUrlPreview, setEncUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
    const [showHiddenEvents, setShowHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
    const [wallpaperURL, setWallpaperURL] = useState();
    const [newDesignInput, setNewDesignInput] = useSetting(settingsAtom, 'newDesignInput');
    const [voiceMessages, setVoiceMessages] = useSetting(settingsAtom, 'voiceMessages');
    const spacings = ['0', '100', '200', '300', '400', '500'];

    const wallpaperInputRef = useRef(null);

    const handleDeleteWallpaper = async () => {
        if (
            await confirmDialog(
                getText('settings.remove_wallpaper.title'),
                getText('settings.remove_wallpaper.desc'),
                getText('btn.remove_wallpaper'),
                'danger'
            )
        ) {
            wallpaperDB.removeWallpaper();
        }
    };

    /**
     * @type {React.ChangeEventHandler<HTMLInputElement>}
     * @returns 
     */
    async function uploadImage(e) {
        const file = e.target.files.item(0);
        if (file === null) return;
        try {
            wallpaperDB.setWallpaper(file);
        } catch (err) {
            console.error(err);
            alert('Failed to set wallpaper');
        }
        wallpaperInputRef.current.value = null;
    }

    const handleSetWallpaper = async () => {
        wallpaperInputRef.current?.click();
    };

    useEffect(() => {
        wallpaperDB.getWallpaper().then(setWallpaperURL);
    }, [wallpaperDB]);

    return (
        <div className="settings-appearance">
            <div className="settings-appearance__card">
                <MenuHeader>{getText('settings.theme.header')}</MenuHeader>
                <SettingTile
                    title={getText('settings.system_theme.title')}
                    options={(
                        <Switch
                            checked={settings.useSystemTheme}
                            onClick={() => { toggleSystemTheme(); updateState({}); }}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.system_theme.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.dark_theme.title')}
                    options={(
                        <Switch
                            checked={settings.getThemeIndex() === 2}
                            onClick={() => { settings.setTheme(settings.getThemeIndex() === 2 ? 0 : 2); updateState({}); }}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.dark_theme.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.twemoji.title')}
                    options={(
                        <Switch
                            checked={twitterEmoji}
                            onClick={() => setTwitterEmoji(!twitterEmoji)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.twemoji.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.wallpaper.title')}
                    options={(
                        <>
                            <Button
                                variant='contained'
                                onClick={handleSetWallpaper}
                            >{getText(wallpaperURL ? 'btn.settings.wallpaper.change' : 'btn.settings.wallpaper.add')}</Button>
                            {wallpaperURL && <>&nbsp;<Button
                                variant='outlined'
                                color='error'
                                onClick={handleDeleteWallpaper}
                            >{getText('btn.settings.wallpaper.delete')}</Button></>}
                            <input accept='image/*' onChange={uploadImage} type='file' ref={wallpaperInputRef} style={{ display: 'none' }} />
                        </>
                    )}
                    content={<Text variant="b3">{getText('settings.wallpaper.desc')}</Text>}
                />
            </div>
            <div className="settings-appearance__card">
                <MenuHeader>{getText('settings.messages.header')}</MenuHeader>
                <SettingTile
                    title={getText('settings.msg_layout.title')}
                    content={
                        <ToggleButtonGroup
                            exclusive
                            value={messageLayout}
                            onChange={(evt, value) => setMessageLayout(value)}
                        >
                            <ToggleButton value={0}>
                                {getText('settings.msg_layout.modern')}
                            </ToggleButton>
                            <ToggleButton value={1}>
                                {getText('settings.msg_layout.compact')}
                            </ToggleButton>
                            <ToggleButton value={2}>
                                {getText('settings.msg_layout.bubble')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    }
                />
                <SettingTile
                    title={getText('settings.msg_spacing.title')}
                    content={
                        <ToggleButtonGroup
                            exclusive
                            value={spacings.findIndex((s) => s === messageSpacing)}
                            onChange={(evt, value) => setMessageSpacing(spacings[value])}
                        >
                            <ToggleButton value={0}>No</ToggleButton>
                            <ToggleButton value={1}>XXS</ToggleButton>
                            <ToggleButton value={2}>XS</ToggleButton>
                            <ToggleButton value={3}>S</ToggleButton>
                            <ToggleButton value={4}>M</ToggleButton>
                            <ToggleButton value={5}>L</ToggleButton>
                        </ToggleButtonGroup>
                    }
                />
                <SettingTile
                    title={getText('settings.enter_newline.title')}
                    options={(
                        <Switch
                            checked={enterForNewline}
                            onClick={() => setEnterForNewline(!enterForNewline)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.enter_newline.desc', isMacOS() ? KeySymbol.Command : 'Ctrl')}</Text>}
                />
                <SettingTile
                    title={getText('settings.voice_messages.title')}
                    options={(
                        <Switch
                            checked={voiceMessages}
                            onClick={() => setVoiceMessages(!voiceMessages)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.voice_messages.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.new_design_input.title')}
                    options={(
                        <Switch
                            checked={newDesignInput}
                            onClick={() => setNewDesignInput(!newDesignInput)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.new_design_input.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.md_formatting.title')}
                    options={(
                        <Switch
                            checked={isMarkdown}
                            onClick={() => setIsMarkdown(!isMarkdown)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.md_formatting.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hide_membership.title')}
                    options={(
                        <Switch
                            checked={hideMembershipEvents}
                            onClick={() => setHideMembershipEvents(!hideMembershipEvents)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_membership.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hide_profile.title')}
                    options={(
                        <Switch
                            checked={hideNickAvatarEvents}
                            onClick={() => setHideNickAvatarEvents(!hideNickAvatarEvents)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_profile.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.no_media_autoload.title')}
                    options={(
                        <Switch
                            checked={!mediaAutoLoad}
                            onClick={() => setMediaAutoLoad(!mediaAutoLoad)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.no_media_autoload.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.url_preview.title')}
                    options={(
                        <Switch
                            checked={urlPreview}
                            onClick={() => setUrlPreview(!urlPreview)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.url_preview.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.url_preview_enc.title')}
                    options={(
                        <Switch
                            checked={encUrlPreview}
                            onClick={() => setEncUrlPreview(!encUrlPreview)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.url_preview_enc.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hidden_events.title')}
                    options={(
                        <Switch
                            checked={showHiddenEvents}
                            onClick={() => setShowHiddenEvents(!showHiddenEvents)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hidden_events.desc')}</Text>}
                />
            </div>
        </div>
    );
}

function PresenceSection() {
    const mx = useMatrixClient();
    const [status, setStatus] = useSetting(settingsAtom, 'extera_status');
    const statusMsg = mx.getUser(mx.getUserId()).presenceStatusMsg || '';
    const statusMsgRef = useRef();
    const [ghostMode, setGhostMode] = useSetting(settingsAtom, 'extera_ghostMode');
    const statuses = [
        'online', 'offline', 'unavailable'
    ];

    const updateStatusMessage = (evt) => {
        evt.preventDefault();
        const { statusInput } = evt.currentTarget.elements;
        const value = statusInput.value.trim();
        if (value === '') return;
        mx.setPresence({
            presence: statuses[status],
            status_msg: value
        });
    };

    return <div className="settings-presence settings-presence__card">
        <MenuHeader>{getText('settings.status.title')}</MenuHeader>
        <SettingTile
            title={getText('settings.presence.title')}
            content={(
                <ToggleButtonGroup
                    exclusive
                    value={status}
                    onChange={(evt, index) => {
                        mx.setSyncPresence(statuses[index]);
                        mx.setPresence({
                            presence: statuses[index],
                            status_msg: index != 1 ? statusMsgRef.current?.value?.trim() : undefined
                        }).then(() => {
                            console.log('Presence updated');
                        }).catch(err => {
                            console.error('Could not update presence: ', err);
                        });
                        setStatus(index);
                    }}
                >
                    <ToggleButton
                        value={0}
                    >
                        {getText('settings.status.online')}
                    </ToggleButton>
                    <ToggleButton
                        value={1}
                    >
                        {getText('settings.status.offline')}
                    </ToggleButton>
                    <ToggleButton
                        value={2}
                    >
                        {getText('settings.status.unavailable')}
                    </ToggleButton>
                </ToggleButtonGroup>
            )}
        />
        <SettingTile
            title={getText('settings.ghost.title')}
            options={(
                <Switch
                    checked={ghostMode}
                    onClick={() => setGhostMode(!ghostMode)}
                />
            )}
            content={<Text variant="b3">{getText('settings.ghost.desc')}</Text>}
        />
        <SettingTile
            title={getText('settings.status_message.title')}
            content={(
                <div className='settings-presence__status'>
                    <Text variant="b3">{getText('settings.status_message.text')}</Text>
                    <form onSubmit={updateStatusMessage}>
                        <TextField inputRef={statusMsgRef} size='small' autoComplete='off' variant='filled' label={getText('settings.status_message.title')} required name="statusInput" defaultValue={statusMsg} />
                        <Button variant="contained" size='small' type="submit">{getText('btn.status_message.set')}</Button>
                    </form>
                </div>
            )}
        />
    </div>;
}

function ExteraSection() {
    const mx = useMatrixClient();
    const [hideTgAds, setHideTgAds] = useSetting(settingsAtom, 'extera_hideTgAds');
    const [enableCaptions, setEnableCaptions] = useSetting(settingsAtom, 'extera_enableCaptions');
    const [renameTgBot, setRenameTgBot] = useSetting(settingsAtom, 'extera_renameTgBot');
    const [smoothScroll, setSmoothScroll] = useSetting(settingsAtom, 'extera_smoothScroll');
    const [ignorePolicies, setIgnorePolicies] = useSetting(settingsAtom, 'ignorePolicies');
    const [replyFallbacks, setReplyFallbacks] = useSetting(settingsAtom, 'replyFallbacks');

    return (
        <div className="settings-extera">
            <div className="settings-extera__card">
                <MenuHeader>{getText('settings.extera.header')}</MenuHeader>
                <SettingTile
                    title={getText('settings.hide_ads.title')}
                    options={(
                        <Switch
                            checked={hideTgAds}
                            onClick={() => setHideTgAds(!hideTgAds)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_ads.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.captions.title')}
                    options={(
                        <Switch
                            checked={enableCaptions}
                            onClick={() => setEnableCaptions(!enableCaptions)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.captions.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.smooth_scroll.title')}
                    options={(
                        <Switch
                            checked={smoothScroll}
                            onClick={() => setSmoothScroll(!smoothScroll)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.smooth_scroll.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.msc3382.title')}
                    options={(
                        <Switch disabled />
                    )}
                    content={<Text variant="b3">{getText('settings.msc3382.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.ignore_policies.title')}
                    options={(
                        <Switch disabled />
                    )}
                    content={<Text variant="b3">{getText('settings.ignore_policies.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.rename_tg_bot.title')}
                    options={(
                        <Switch
                            checked={renameTgBot}
                            onClick={() => setRenameTgBot(!renameTgBot)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.rename_tg_bot.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.reply_fallbacks.title')}
                    options={(
                        <Switch
                            checked={replyFallbacks}
                            onClick={() => setReplyFallbacks(!replyFallbacks)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.reply_fallbacks.desc')}</Text>}
                />
            </div>
        </div>
    );
}

function NotificationsSection() {
    const [permission, setPermission] = usePermission('notifications', window.Notification?.permission);
    const [pushes, setPushes] = useSetting(settingsAtom, 'pushesEnabled');

    const [, updateState] = useState({});

    const requestPermissions = () => {
        if (typeof window.Notification !== 'undefined') window.Notification?.requestPermission().then(setPermission);
        else if (window.cordova?.plugins?.notification?.local) {
            cordova.plugins.notification.local.requestPermission((granted) => {
                setPermission(granted);
            });
        }
    };

    const renderOptions = () => {
        if (window.Notification === undefined && !window.cordova?.plugins?.notification?.local) {
            return <Text className="settings-notifications__not-supported">{getText('settings.notifications.unsupported')}</Text>;
        }

        window.cordova?.plugins?.notification?.local?.hasPermission(setPermission);

        if (permission) {
            return (
                <Switch
                    checked={settings._showNotifications}
                    onClick={() => {
                        toggleNotifications();
                        setPermission(window.Notification?.permission);
                        updateState({});
                    }}
                />
            );
        }

        return (
            <Button
                variant="contained"
                onClick={requestPermissions}
            >
                {getText('btn.notifications.request_permission')}
            </Button>
        );
    };

    const togglePushes = () => {
        if (!pushes) {
            enablePush();
            console.log('enabled push');
            setPushes(true);
        } else {
            disablePush();
            console.log('disabled push');
            setPushes(false);
        }
    };

    return (
        <>
            <div className="settings-notifications">
                <MenuHeader>{getText('settings.notifications.header')}</MenuHeader>
                <SettingTile
                    title={getText('settings.desktop_notifications.title')}
                    options={renderOptions()}
                    content={<Text variant="b3">{getText('settings.desktop_notifications.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.notification_sound.title')}
                    options={(
                        <Switch
                            checked={settings.isNotificationSounds}
                            onClick={() => { toggleNotificationSounds(); updateState({}); }}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.notification_sound.desc')}</Text>}
                />
                <SettingTile
                    title='Push Notifications'
                    options={(
                        <Switch
                            checked={pushes}
                            onClick={() => { togglePushes(); }}
                        />
                    )}
                />
            </div>
            <GlobalNotification />
            <KeywordNotification />
            <IgnoreUserList />
            <IgnorePolicyList />
        </>
    );
}

function EmojiSection() {
    return (
        <>
            <div className="settings-emoji__card"><ImagePackUser /></div>
            <div className="settings-emoji__card"><ImagePackGlobal /></div>
        </>
    );
}

function SecuritySection() {
    const mx = useMatrixClient();
    const [open, setOpen] = useState(false);
    const [disableBtn, setDisableBtn] = useState(false);

    const changePassword = useCallback(async (evt) => {
        evt.preventDefault();
        setOpen(false);
        setDisableBtn(true);
        await authRequest(getText('change_password.old'), async (auth) => {
            await mx.setPassword(auth, evt.target.passwordInput.value, false);
            setDisableBtn(false);
        });
    }, [mx]);

    const handleClose = () => {
        setOpen(false);
    };

    const openChangePassword = () => {
        setOpen(true);
        setDisableBtn(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: changePassword,
                }}
            >
                <DialogTitle>
                    {getText('change_password.header')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        required
                        margin='dense'
                        name='passwordInput'
                        label={getText('change_password.title')}
                        fullWidth
                        type='password'
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color='primary'>{getText('btn.cancel')}</Button>
                    <Button type='submit' color='error'>{getText('change_password.btn')}</Button>
                </DialogActions>
            </Dialog>
            <div className="settings-security">
                <div className="settings-security__card">
                    <MenuHeader>{getText('settings.cross_signing.header')}</MenuHeader>
                    <CrossSigning />
                    <KeyBackup />
                </div>
                <div className="settings-security__card">
                    <MenuHeader>{getText('settings.change_password.header')}</MenuHeader>
                    <SettingTile
                        title={getText('settings.change_password.title')}
                        options={(
                            <Button onClick={openChangePassword} variant='contained' color='error'>{getText('change_password.btn')}</Button>
                        )}
                    />
                </div>
                <DeviceManage />
                <div className="settings-security__card">
                    <MenuHeader>{getText('settings.encryption_keys.header')}</MenuHeader>
                    <SettingTile
                        title={getText('settings.export.title')}
                        content={(
                            <>
                                <Text variant="b3">{getText('settings.export.desc')}</Text>
                                <ExportE2ERoomKeys />
                            </>
                        )}
                    />
                    <SettingTile
                        title={getText('settings.import.title')}
                        content={(
                            <>
                                <Text variant="b3">{getText('settings.import.desc')}</Text>
                                <ImportE2ERoomKeys />
                            </>
                        )}
                    />
                </div>
            </div>
        </>
    );
}

function AboutSection() {
    return (
        <div className="settings-about">
            <div className="settings-about__card">
                <MenuHeader>Application</MenuHeader>
                <div className="settings-about__branding">
                    <img width="60" height="60" src={CinnySVG} alt="Client logo" />
                    <div>
                        <Text variant="h2" weight="medium">
                            {cons.name}
                            <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>{`v${cons.version}`}</span>
                        </Text>
                        <Text>Fork of Cinny</Text>

                        <div className="settings-about__btns">
                            <Button variant='contained' onClick={() => window.open('https://github.com/OfficialDakari/Extera')}>Source code</Button>
                            <Button variant='contained' onClick={() => window.open('https://officialdakari.ru/sponsor/')}>Support</Button>
                            <Button variant='outlined' color='error' onClick={() => initMatrix.clearCacheAndReload()}>Clear cache & reload</Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="settings-about__card">
                <MenuHeader>Credits</MenuHeader>
                <div className="settings-about__credits">
                    <ul>
                        <li>
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            <Text>The <a href="https://github.com/matrix-org/matrix-js-sdk" rel="noreferrer noopener" target="_blank">matrix-js-sdk</a> is © <a href="https://matrix.org/foundation" rel="noreferrer noopener" target="_blank">The Matrix.org Foundation C.I.C</a> used under the terms of <a href="http://www.apache.org/licenses/LICENSE-2.0" rel="noreferrer noopener" target="_blank">Apache 2.0</a>.</Text>
                        </li>
                        <li>
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            <Text>The <a href="https://github.com/mozilla/twemoji-colr" target="_blank" rel="noreferrer noopener">twemoji-colr</a> font is © <a href="https://mozilla.org/" target="_blank" rel="noreferrer noopener">Mozilla Foundation</a> used under the terms of <a href="http://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noreferrer noopener">Apache 2.0</a>.</Text>
                        </li>
                        <li>
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            <Text>The <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">Twemoji</a> emoji art is © <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">Twitter, Inc and other contributors</a> used under the terms of <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC-BY 4.0</a>.</Text>
                        </li>
                        <li>
                            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
                            <Text>The <a href="https://material.io/design/sound/sound-resources.html" target="_blank" rel="noreferrer noopener">Material sound resources</a> are © <a href="https://google.com" target="_blank" rel="noreferrer noopener">Google</a> used under the terms of <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC-BY 4.0</a>.</Text>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export const tabText = {
    APPEARANCE: getText('tab.appearance'),
    PRESENCE: getText('tab.presence'),
    NOTIFICATIONS: getText('tab.notifications'),
    EMOJI: getText('tab.emoji'),
    SECURITY: getText('tab.security'),
    EXTERA: getText('tab.extera'),
    ABOUT: getText('tab.about'),
};
const tabItems = [{
    text: tabText.APPEARANCE,
    iconSrc: mdiCog,
    disabled: false,
    render: () => <AppearanceSection />,
}, {
    text: tabText.PRESENCE,
    iconSrc: mdiEye,
    disabled: false,
    render: () => <PresenceSection />,
}, {
    text: tabText.NOTIFICATIONS,
    iconSrc: mdiBell,
    disabled: false,
    render: () => <NotificationsSection />,
}, {
    text: tabText.EMOJI,
    iconSrc: mdiEmoticon,
    disabled: false,
    render: () => <EmojiSection />,
}, {
    text: tabText.SECURITY,
    iconSrc: mdiLock,
    disabled: false,
    render: () => <SecuritySection />,
}, {
    text: tabText.EXTERA,
    iconSrc: mdiStar,
    disabled: false,
    render: () => <ExteraSection />,
}, {
    text: tabText.ABOUT,
    iconSrc: mdiInformationSlabCircle,
    disabled: false,
    render: () => <AboutSection />,
}];

function useWindowToggle(setSelectedTab) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const openSettings = (tab) => {
            const tabItem = tabItems.find((item) => item.text === tab);
            if (tabItem) setSelectedTab(tabItem);
            setIsOpen(true);
        };
        navigation.on(cons.events.navigation.SETTINGS_OPENED, openSettings);
        return () => {
            navigation.removeListener(cons.events.navigation.SETTINGS_OPENED, openSettings);
        };
    }, []);

    const requestClose = () => setIsOpen(false);

    return [isOpen, requestClose];
}

function Settings() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [isOpen, requestClose] = useWindowToggle(setSelectedTab);
    const exteraProfileEvent = useAccountData('ru.officialdakari.extera_profile');
    const screenSize = useScreenSize();

    const mx = useMatrixClient();

    const handleTabChange = (tabItem) => setSelectedTab(tabItem);
    const handleLogout = async () => {
        if (await confirmDialog(getText('logout.title'), getText('logout.confirm'), getText('btn.logout.confirm'), 'error')) {
            initMatrix.logout();
        }
    };

    const [bannerSrc, setBannerSrc] = useState('');

    useEffect(() => {
        const exteraProfile = exteraProfileEvent ? exteraProfileEvent.getContent() : {};
        console.log(exteraProfile);
        if (typeof exteraProfile.banner_url === 'string') {
            console.log(exteraProfile.banner_url);
            setBannerSrc(exteraProfile.banner_url);
        }
    }, [mx, exteraProfileEvent]);

    const handleBannerChange = async (src) => {
        try {
            await mx.setAccountData('ru.officialdakari.extera_profile', {
                banner_url: src
            });
            setBannerSrc(src);
        } catch (error) {
            alert(error.message); // TODO Better error handling
        }
    };

    const uploadImageRef = useRef(null);
    const [uploadPromise, setUploadPromise] = useState(null);

    async function uploadImage(e) {
        const file = e.target.files.item(0);
        if (file === null) return;
        try {
            const uPromise = mx.uploadContent(file);
            setUploadPromise(uPromise);

            const res = await uPromise;
            if (typeof res?.content_uri === 'string') handleBannerChange(res.content_uri);
            setUploadPromise(null);
        } catch {
            setUploadPromise(null);
        }
        uploadImageRef.current.value = null;
    }

    function handleClick() {
        if (uploadPromise !== null) return;
        uploadImageRef.current?.click();
    };

    const handleBannerRemove = async () => {
        try {
            if (await confirmDialog(getText('remove_banner.title'), getText('remove_banner.desc'), getText('btn.remove_banner.confirm'), 'primary')) {
                await mx.setAccountData('ru.officialdakari.extera_profile', {
                    banner_url: null
                });
                setBannerSrc(null);
            }
        } catch (error) {
            alert(error.message); // TODO Better error handling
        }
    };

    const theme = useTheme();
    const bannerUrl = useMemo(() => {
        return mx.mxcUrlToHttp(bannerSrc, null, null, null, false, true, true);
    }, [mx, bannerSrc]);

    useBackButton(requestClose);

    return (
        <Dialog
            open={isOpen}
            onClose={requestClose}
            fullScreen={screenSize === ScreenSize.Mobile}
            scroll={screenSize === ScreenSize.Mobile ? 'body' : 'paper'}
            sx={{ overscrollBehaviorY: 'none' }}
        >
            <input type='file' accept='image/*' onChange={uploadImage} ref={uploadImageRef} style={{ display: 'none' }} />
            {isOpen && (
                <AppBar
                    position='sticky'
                    sx={bannerSrc && {
                        background: `url(${bannerUrl}), #00000060`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        backgroundBlendMode: 'darken'
                    }}
                >
                    <ProminientToolbar>
                        {/* {
                            bannerSrc ?
                                <Banner noBorder={true} url={bannerSrc} onUpload={handleBannerChange} /> :
                                <Banner noBorder={true} emptyBanner='transparent' onUpload={handleBannerChange} />
                        } */}
                        <Box grow='Yes'>
                            <ProfileEditor userId={initMatrix.matrixClient.getUserId()} />
                        </Box>
                        <IconButton
                            size='large'
                            edge='end'
                            onClick={() => uploadImageRef.current?.click()}
                        >
                            <Image />
                        </IconButton>
                        <IconButton
                            size='large'
                            edge='end'
                            color='error'
                            onClick={handleBannerRemove}
                        >
                            <HideImage />
                        </IconButton>
                        <IconButton
                            size='large'
                            edge='end'
                            color='error'
                            onClick={handleLogout}
                        >
                            <Logout />
                        </IconButton>
                        <IconButton
                            size='large'
                            edge='end'
                            onClick={requestClose}
                        >
                            <Close />
                        </IconButton>
                    </ProminientToolbar>
                </AppBar>
            )}
            {isOpen && (
                <div className="settings-window__content">
                    <Box style={{ borderBottom: '1px', borderColor: theme.palette.divider }}>
                        <Tabs
                            value={selectedTab}
                            onChange={handleTabChange}
                            variant='scrollable'
                            scrollButtons='auto'
                        >
                            {tabItems.map((tabItem, index) => (
                                <Tab label={tabItem.text} {...a11yProps(index)} onClick={() => handleTabChange(index)} />
                            ))}
                        </Tabs>
                    </Box>
                    <div className="settings-window__cards-wrapper">
                        {tabItems[selectedTab].render()}
                    </div>
                </div>
            )}
        </Dialog>
    );
}

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export default Settings;
