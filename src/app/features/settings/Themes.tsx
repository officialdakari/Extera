import React from "react";

import './Themes.scss';

import { Button, IconButton, Switch, TextField } from "@mui/material";
import { Close } from "@mui/icons-material";
import { Box } from "folds";
import { useSetting } from "../../state/hooks/settings";
import { settingsAtom, Theme } from "../../state/settings";
import SettingTile from "../../molecules/setting-tile/SettingTile";
import { getText } from "../../../lang";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { mxcUrlToHttp } from "../../utils/matrix";

function ThemeTile({ theme, onToggle, onRemove }: { theme: Theme, onToggle: () => void, onRemove: () => void }) {
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

	const onRemove = (theme: Theme) => {
		setThemes(themes.filter(x => x.url !== theme.url));
	};

	const onToggle = (theme: Theme) => {
		setThemes(() => {
			const newThemes = [
				...themes.filter(x => x.url !== theme.url),
				{
					...theme,
					enabled: !theme.enabled
				}
			];
			return newThemes;
		});
	};

	const onAdd = (evt: React.FormEvent<HTMLFormElement>) => {
		evt.preventDefault();
		const form = evt.target as HTMLFormElement;
		const name = form.elements.namedItem('name') as HTMLInputElement;
		const url = form.elements.namedItem('url') as HTMLInputElement;
		const cssUrl = mxcUrlToHttp(mx, url.value, undefined, undefined, undefined, false, true);
		if (!cssUrl) {
			return;
		}
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
				<ThemeTile
					theme={theme}
					onRemove={() => onRemove(theme)}
					onToggle={() => onToggle(theme)}
				/>
			))}
			<SettingTile
				title={getText('title.add_theme')}
				content={
					<form onSubmit={onAdd}>
						<Box style={{ width: '100%' }} gap='200'>
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