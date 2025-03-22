import React from 'react';
import './Avatar.scss';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';

import ImageBrokenSVG from '../../../../public/res/svg/image-broken.svg';
import { avatarInitials } from '../../../util/common';

type AvatarProps = {
	text?: string | null;
	bgColor?: string;
	iconSrc?: string | null;
	iconColor?: string | null;
	imageSrc?: string | null;
	size?: 'large' | 'normal' | 'small' | 'extra-small';
	style?: React.CSSProperties;
	avatarClassName?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({
	text = null,
	bgColor = 'transparent',
	iconSrc = null,
	iconColor = null,
	imageSrc = null,
	size = 'normal',
	style,
	avatarClassName
}, ref) => {
	let textSize = 's1';
	if (size === 'large') textSize = 'h1';
	if (size === 'small') textSize = 'b1';
	if (size === 'extra-small') textSize = 'b3';

	return (
		<div ref={ref} style={style} className={`avatar-container avatar-container__${size} noselect${avatarClassName ? ` ${avatarClassName}` : ''}`}>
			{imageSrc !== null ? (
				<img
					draggable={false}
					src={imageSrc}
					onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
						e.currentTarget.src = ImageBrokenSVG;
					}}
					alt=""
				/>
			) : (
				<span
					style={{ backgroundColor: iconSrc === null ? bgColor : 'transparent' }}
					className={`avatar__border${iconSrc !== null ? '--active' : ''}`}
				>
					{iconSrc !== null ? (
						<RawIcon size={size} src={iconSrc} color={iconColor} />
					) : (
						text !== null && (
							<Text variant={textSize} primary>
								{avatarInitials(text)}
							</Text>
						)
					)}
				</span>
			)}
		</div>
	);
});

export default Avatar;
