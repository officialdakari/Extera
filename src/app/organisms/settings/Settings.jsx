import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Settings.scss';

// Holy shit this code will be worser than yandere simulator's :catstare:
import '../profile-viewer/Banner.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import navigation from '../../../client/state/navigation';
import { Button as FoldsButton, IconButton as FoldsIconButton, Text as FoldsText } from 'folds';
import {
    toggleSystemTheme,
    toggleNotifications, toggleNotificationSounds,
} from '../../../client/action/settings';
import { usePermission } from '../../hooks/usePermission';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Toggle from '../../atoms/button/Toggle';
import Tabs from '../../atoms/tabs/Tabs';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow from '../../molecules/popup-window/PopupWindow';
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

import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { isMacOS } from '../../utils/user-agent';
import { KeySymbol } from '../../utils/key-symbol';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Box, config, Dialog, Header, Input, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
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
                        <Toggle
                            isActive={settings.useSystemTheme}
                            onToggle={() => { toggleSystemTheme(); updateState({}); }}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.system_theme.desc')}</Text>}
                />
                <SettingTile
                    title="Theme"
                    content={(
                        <SegmentedControls
                            selected={settings.useSystemTheme ? -1 : settings.getThemeIndex()}
                            segments={[
                                { text: 'Light' },
                                { text: 'Silver' },
                                { text: 'Dark' },
                                { text: 'Butter' },
                                { text: 'Purple Dark' },
                            ]}
                            onSelect={(index) => {
                                if (settings.useSystemTheme) toggleSystemTheme();
                                settings.setTheme(index);
                                updateState({});
                            }}
                        />
                    )}
                />
                <SettingTile
                    title={getText('settings.twemoji.title')}
                    options={(
                        <Toggle
                            isActive={twitterEmoji}
                            onToggle={() => setTwitterEmoji(!twitterEmoji)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.twemoji.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.wallpaper.title')}
                    options={(
                        <>
                            <Button
                                variant='primary'
                                onClick={handleSetWallpaper}
                            >{getText(wallpaperURL ? 'btn.settings.wallpaper.change' : 'btn.settings.wallpaper.add')}</Button>
                            {wallpaperURL && <>&nbsp;<Button
                                variant='danger'
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
                        <SegmentedControls
                            selected={messageLayout}
                            segments={[
                                { text: getText('settings.msg_layout.modern') },
                                { text: getText('settings.msg_layout.compact') },
                                { text: getText('settings.msg_layout.bubble') },
                            ]}
                            onSelect={(index) => setMessageLayout(index)}
                        />
                    }
                />
                <SettingTile
                    title={getText('settings.msg_spacing.title')}
                    content={
                        <SegmentedControls
                            selected={spacings.findIndex((s) => s === messageSpacing)}
                            segments={[
                                { text: 'No' },
                                { text: 'XXS' },
                                { text: 'XS' },
                                { text: 'S' },
                                { text: 'M' },
                                { text: 'L' },
                            ]}
                            onSelect={(index) => {
                                setMessageSpacing(spacings[index])
                            }}
                        />
                    }
                />
                <SettingTile
                    title={getText('settings.enter_newline.title')}
                    options={(
                        <Toggle
                            isActive={enterForNewline}
                            onToggle={() => setEnterForNewline(!enterForNewline)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.enter_newline.desc', isMacOS() ? KeySymbol.Command : 'Ctrl')}</Text>}
                />
                <SettingTile
                    title={getText('settings.voice_messages.title')}
                    options={(
                        <Toggle
                            isActive={voiceMessages}
                            onToggle={() => setVoiceMessages(!voiceMessages)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.voice_messages.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.new_design_input.title')}
                    options={(
                        <Toggle
                            isActive={newDesignInput}
                            onToggle={() => setNewDesignInput(!newDesignInput)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.new_design_input.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.md_formatting.title')}
                    options={(
                        <Toggle
                            isActive={isMarkdown}
                            onToggle={() => setIsMarkdown(!isMarkdown)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.md_formatting.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hide_membership.title')}
                    options={(
                        <Toggle
                            isActive={hideMembershipEvents}
                            onToggle={() => setHideMembershipEvents(!hideMembershipEvents)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_membership.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hide_profile.title')}
                    options={(
                        <Toggle
                            isActive={hideNickAvatarEvents}
                            onToggle={() => setHideNickAvatarEvents(!hideNickAvatarEvents)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_profile.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.no_media_autoload.title')}
                    options={(
                        <Toggle
                            isActive={!mediaAutoLoad}
                            onToggle={() => setMediaAutoLoad(!mediaAutoLoad)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.no_media_autoload.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.url_preview.title')}
                    options={(
                        <Toggle
                            isActive={urlPreview}
                            onToggle={() => setUrlPreview(!urlPreview)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.url_preview.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.url_preview_enc.title')}
                    options={(
                        <Toggle
                            isActive={encUrlPreview}
                            onToggle={() => setEncUrlPreview(!encUrlPreview)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.url_preview_enc.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.hidden_events.title')}
                    options={(
                        <Toggle
                            isActive={showHiddenEvents}
                            onToggle={() => setShowHiddenEvents(!showHiddenEvents)}
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
    const [statusMsg, setStatusMsg] = useSetting(settingsAtom, 'extera_status_message');
    const [ghostMode, setGhostMode] = useSetting(settingsAtom, 'extera_ghostMode');

    const updateStatusMessage = (evt) => {
        evt.preventDefault();
        const { statusInput } = evt.target.elements;
        const value = statusInput.value.trim();
        if (value === '') return;
        setStatusMsg(value);
        mx.setPresence({
            status_msg: statusMsg
        });
    };

    return <div className="settings-presence settings-presence__card">
        <MenuHeader>{getText('settings.status.title')}</MenuHeader>
        <SettingTile
            title={getText('settings.presence.title')}
            content={(
                <SegmentedControls
                    selected={status}
                    segments={[
                        { text: getText('settings.status.online') },
                        { text: getText('settings.status.offline') },
                        { text: getText('settings.status.unavailable') }
                    ]}
                    onSelect={(index) => {
                        const statuses = [
                            'online', 'offline', 'unavailable'
                        ];
                        mx.setSyncPresence(statuses[index]);
                        mx.setPresence({
                            presence: statuses[index],
                            status_msg: index != 1 ? statusMsg : undefined
                        }).then(() => {
                            console.log('Presence updated');
                        }).catch(err => {
                            console.error('Could not update presence: ', err);
                        });
                        setStatus(index);
                    }}
                />
            )}
        />
        <SettingTile
            title={getText('settings.ghost.title')}
            options={(
                <Toggle
                    isActive={ghostMode}
                    onToggle={() => setGhostMode(!ghostMode)}
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
                        <Input required name="statusInput" placeholder={statusMsg} />
                        <Button variant="primary" type="submit">{getText('btn.status_message.set')}</Button>
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
    const [replyFallbacks, setReplyFallbacks] = useSetting(settingsAtom, 'replyFallbacks');

    return (
        <div className="settings-extera">
            <div className="settings-extera__card">
                <MenuHeader>{getText('settings.extera.header')}</MenuHeader>
                <SettingTile
                    title={getText('settings.hide_ads.title')}
                    options={(
                        <Toggle
                            isActive={hideTgAds}
                            onToggle={() => setHideTgAds(!hideTgAds)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.hide_ads.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.captions.title')}
                    options={(
                        <Toggle
                            isActive={enableCaptions}
                            onToggle={() => setEnableCaptions(!enableCaptions)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.captions.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.smooth_scroll.title')}
                    options={(
                        <Toggle
                            isActive={smoothScroll}
                            onToggle={() => setSmoothScroll(!smoothScroll)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.smooth_scroll.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.msc3382.title')}
                    options={(
                        <div style={{ opacity: 0.5 }}><Toggle disabled={true} /></div>
                    )}
                    content={<Text variant="b3">{getText('settings.msc3382.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.rename_tg_bot.title')}
                    options={(
                        <Toggle
                            isActive={renameTgBot}
                            onToggle={() => setRenameTgBot(!renameTgBot)}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.rename_tg_bot.desc')}</Text>}
                />
                <SettingTile
                    title={getText('settings.reply_fallbacks.title')}
                    options={(
                        <Toggle
                            isActive={replyFallbacks}
                            onToggle={() => setReplyFallbacks(!replyFallbacks)}
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
                <Toggle
                    isActive={settings._showNotifications}
                    onToggle={() => {
                        toggleNotifications();
                        setPermission(window.Notification?.permission);
                        updateState({});
                    }}
                />
            );
        }

        return (
            <Button
                variant="primary"
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
                        <Toggle
                            isActive={settings.isNotificationSounds}
                            onToggle={() => { toggleNotificationSounds(); updateState({}); }}
                        />
                    )}
                    content={<Text variant="b3">{getText('settings.notification_sound.desc')}</Text>}
                />
                <SettingTile
                    title='Push Notifications'
                    options={(
                        <Toggle
                            isActive={pushes}
                            onToggle={() => { togglePushes(); }}
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
            <Overlay open={open} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                    <FocusTrap
                        focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: handleClose,
                            clickOutsideDeactivates: true,
                        }}
                    >
                        <Dialog variant="Surface">
                            <Header
                                style={{
                                    padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                                    borderBottomWidth: config.borderWidth.B300,
                                }}
                                variant="Surface"
                                size="500"
                            >
                                <Box grow="Yes">
                                    <Text size="H4">{getText('change_password.header')}</Text>
                                </Box>
                                <FoldsIconButton size="300" onClick={handleClose} radii="300">
                                    <Icon size={1} path={mdiClose} />
                                </FoldsIconButton>
                            </Header>
                            <Box
                                as="form"
                                style={{ padding: config.space.S400 }}
                                direction="Column"
                                gap="400"
                                onSubmit={changePassword}
                            >
                                <Box direction="Column" gap="100">
                                    <Input name="passwordInput" placeholder={getText('change_password.title')} type='password' variant="Secondary" autoComplete='off' />
                                </Box>
                                <FoldsButton
                                    type="submit"
                                    variant="Critical"
                                    disabled={disableBtn}
                                >
                                    {getText('change_password.btn')}
                                </FoldsButton>
                            </Box>
                        </Dialog>
                    </FocusTrap>
                </OverlayCenter>
            </Overlay>
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
                            <Button onClick={openChangePassword} variant='danger'>{getText('change_password.btn')}</Button>
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
                            <Button onClick={() => window.open('https://git.cycloneteam.space/OfficialDakari/Extera')}>Source code</Button>
                            <Button onClick={() => window.open('https://extera.officialdakari.ru/static/#sponsor')}>Support</Button>
                            <Button onClick={() => initMatrix.clearCacheAndReload()} variant="danger">Clear cache & reload</Button>
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
    const [selectedTab, setSelectedTab] = useState(tabItems[0]);
    const [isOpen, requestClose] = useWindowToggle(setSelectedTab);

    const mx = useMatrixClient();

    const handleTabChange = (tabItem) => setSelectedTab(tabItem);
    const handleLogout = async () => {
        if (await confirmDialog(getText('logout.title'), getText('logout.confirm'), getText('btn.logout.confirm'), 'danger')) {
            initMatrix.logout();
        }
    };

    const [bannerSrc, setBannerSrc] = useState('');

    useEffect(() => {
        const exteraProfileEvent = mx.getAccountData('ru.officialdakari.extera_profile');
        const exteraProfile = exteraProfileEvent ? exteraProfileEvent.getContent() : {};
        console.log(exteraProfile);
        if (typeof exteraProfile.banner_url === 'string') {
            console.log(exteraProfile.banner_url);
            setBannerSrc(exteraProfile.banner_url);
        }
    }, [mx]);

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

    useBackButton(requestClose);

    return (
        <PopupWindow
            isOpen={isOpen}
            className="settings-window"
            title={<Text variant="s1" weight="medium" primary>{getText('settings.title')}</Text>}
            contentOptions={(
                <>
                    {bannerSrc && <Button variant='surface' iconSrc={mdiClose} onClick={handleBannerRemove}>
                        {getText('btn.remove_banner')}
                    </Button>}
                    <Button variant="danger" iconSrc={mdiArrowLeft} onClick={handleLogout}>
                        {getText('btn.logout_session')}
                    </Button>
                    <IconButton src={mdiClose} onClick={requestClose} tooltip="Close" />
                </>
            )}
            onRequestClose={requestClose}
        >
            {isOpen && (
                <div className="settings-window__content">
                    {
                        bannerSrc ?
                            <Banner noBorder={true} url={bannerSrc} onUpload={handleBannerChange} /> :
                            <Banner noBorder={true} emptyBanner='black' onUpload={handleBannerChange} />
                    }
                    <ProfileEditor userId={initMatrix.matrixClient.getUserId()} />
                    <Tabs
                        items={tabItems}
                        defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
                        onSelect={handleTabChange}
                    />
                    <div className="settings-window__cards-wrapper">
                        {selectedTab.render()}
                    </div>
                </div>
            )}
        </PopupWindow>
    );
}

export default Settings;
