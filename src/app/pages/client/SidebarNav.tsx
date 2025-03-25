import React, { useRef } from 'react';

import { Divider, List, ListItemButton, ListItemIcon, ListItemText, SwipeableDrawer } from '@mui/material';
import { Add } from '@mui/icons-material';
import { DirectTab, HomeTab, SpaceTabs, InboxTab, ExploreTab, UserTab } from './sidebar';
import { openCreateRoom } from '../../../client/action/navigation';
import { getText } from '../../../lang';
import { useNavHidden } from '../../hooks/useHideableNav';

export function SidebarNav() {
	const [navHidden, setNavHidden] = useNavHidden();
	const scrollRef = useRef<HTMLDivElement>(null);
	const onClose = () => setNavHidden(true);

	return (
		<SwipeableDrawer
			open={!navHidden}
			onClose={onClose}
			onOpen={() => setNavHidden(false)}
			ref={scrollRef}
		>
			<nav>
				<List>
					<UserTab onClose={onClose} />
				</List>
			</nav>
			<Divider />
			<nav aria-label='Default tabs'>
				<List>
					<HomeTab />
					<DirectTab />
				</List>
			</nav>
			<Divider />
			<nav aria-label='Spaces'>
				<List>
					<SpaceTabs scrollRef={scrollRef} />
				</List>
			</nav>
			<Divider />
			<nav>
				<List>
					<ListItemButton
						onClick={() => openCreateRoom(true)}
					>
						<ListItemIcon>
							<Add />
						</ListItemIcon>
						<ListItemText>
							{getText('btn.space.new_space')}
						</ListItemText>
					</ListItemButton>
				</List>
			</nav>
			<Divider />
			<nav aria-label='Personal'>
				<List>
					<ExploreTab />
					<InboxTab />
				</List>
			</nav>
		</SwipeableDrawer>
	);
}
