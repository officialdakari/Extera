import React from "react";

import './Themes.scss';

import { useSetting } from "../../state/hooks/settings";
import { settingsAtom } from "../../state/settings";
import SettingTile from "../../molecules/setting-tile/SettingTile";
import { Button, IconButton, Switch, TextField } from "@mui/material";
import { Close } from "@mui/icons-material";
import { getText } from "../../../lang";
import { Box } from "folds";
import { useMatrixClient } from "../../hooks/useMatrixClient";

function Theme({ theme, onToggle, onRemove }) {
    return (
        <SettingTile
            title={theme.name}
            options={
                <>
                    <IconButton
                        onClick={onRemove}
                        color='error'
                    >
                        <Close />
                    </IconButton>
                    <Switch checked={theme.enabled} onClick={onToggle} />
                </>
            }
        />
    );
}

export default function Themes() {
    const mx = useMatrixClient();
    const [themes, setThemes] = useSetting(settingsAtom, 'themes');

    const onRemove = (theme) => {
        setThemes(themes.filter(x => x.url !== theme.url));
    };

    const onToggle = (theme) => {
        setThemes((themes) => {
            theme.enabled = !theme.enabled;
            const newThemes = [
                ...themes.filter(x => x.url !== theme.url),
                theme
            ];
            return newThemes;
        });
    };

    const onAdd = (evt) => {
        evt.preventDefault();
        const { name, url } = evt.target.elements;
        const cssUrl = mx.mxcUrlToHttp(url.value, false, false, false, true, true);
        setThemes([
            ...themes,
            {
                name: name.value,
                url: cssUrl,
                enabled: false
            }
        ]);
    };

    return (
        <>
            {themes.map(theme => (
                <Theme
                    theme={theme}
                    onRemove={() => onRemove(theme)}
                    onToggle={() => onToggle(theme)}
                />
            ))}
            <SettingTile
                title={getText('title.add_theme')}
                content={
                    <form onSubmit={onAdd}>
                        <Box gap='200'>
                            <TextField autoComplete='off' name='name' size='small' variant='outlined' label={getText('label.theme_name')} />
                            <TextField autoComplete='off' name='url' size='small' variant='outlined' sx={{ flexGrow: 1 }} label={getText('label.theme_url')} />
                            <Button
                                variant='contained'
                                size='small'
                                type='submit'
                            >
                                {getText('btn.add_theme')}
                            </Button>
                        </Box>
                    </form>
                }
            />
        </>
    );
}