import React, {
	useEffect,
	useRef,
} from 'react';

import { TextField } from 'react-you-ui';
import { getText } from '../../../lang';

export default function ServerPicker({
	server,
	// serverList,
	onServerChange,
}: {
	server: string;
	// serverList: string[];
	onServerChange: (server: string) => void;
}) {
	const serverInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		// sync input with it outside server changes
		if (serverInputRef.current && serverInputRef.current.value !== server) {
			serverInputRef.current.value = server;
		}
	}, [server]);

	return (
		<TextField
			ref={serverInputRef as any}
			style={{ display: 'flex', flexGrow: 1, width: '100%' }}
			variant='filled'
			label={getText('form.homeserver')}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					onServerChange(serverInputRef.current?.value ?? '');
				}
			}}
		/>
	);
}