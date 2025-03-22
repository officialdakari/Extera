/* eslint-disable react/jsx-one-expression-per-line */
import React, { useState } from 'react';
import './CrossSigning.scss';
import FileSaver from 'file-saver';
import { Formik } from 'formik';

import { Button, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { copyToClipboard } from '../../../util/common';
import { clearSecretStorageKeys } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { authRequest } from './AuthRequest';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';
import { getText, translate } from '../../../lang';
import { OrDivider } from '../../pages/auth/OrDivider';

const failedDialog = () => {
	const renderFailure = (requestClose) => (
		<>
			<DialogContent>
				<DialogContentText>
					{getText('error.crosssigning')}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={requestClose}>{getText('btn.close')}</Button>
			</DialogActions>
		</>
	);

	openReusableDialog(
		getText('btn.crosssigning.title'),
		renderFailure
	);
};

const securityKeyDialog = (key) => {
	const downloadKey = () => {
		const blob = new Blob([key.encodedPrivateKey], {
			type: 'text/plain;charset=us-ascii',
		});
		FileSaver.saveAs(blob, 'security-key.txt');
	};
	const copyKey = () => {
		copyToClipboard(key.encodedPrivateKey);
	};

	const renderSecurityKey = () => (
		<>
			<DialogContent>
				<DialogContentText>
					{getText('crosssigning.tip')}
				</DialogContentText>
				<DialogContentText>
					<code>
						{key.encodedPrivateKey}
					</code>
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => copyKey(key)}>
					{getText('btn.copy')}
				</Button>
				<Button onClick={() => downloadKey(key)}>
					{getText('btn.download')}
				</Button>
			</DialogActions>
		</>
	);

	// Download automatically.
	downloadKey();

	openReusableDialog(
		getText('crosssigning.key.title'),
		() => renderSecurityKey()
	);
};

function CrossSigningSetup() {
	const initialValues = { phrase: '', confirmPhrase: '' };
	const [genWithPhrase, setGenWithPhrase] = useState(undefined);

	const setup = async (securityPhrase = undefined) => {
		const mx = initMatrix.matrixClient;
		setGenWithPhrase(typeof securityPhrase === 'string');
		const recoveryKey = await mx.createRecoveryKeyFromPassphrase(securityPhrase);
		clearSecretStorageKeys();

		await mx.bootstrapSecretStorage({
			createSecretStorageKey: async () => recoveryKey,
			setupNewKeyBackup: true,
			setupNewSecretStorage: true,
		});

		const authUploadDeviceSigningKeys = async (makeRequest) => {
			const isDone = await authRequest(getText('crosssigning.title'), async (auth) => {
				await makeRequest(auth);
			});
			setTimeout(() => {
				if (isDone) securityKeyDialog(recoveryKey);
				else failedDialog();
			});
		};

		await mx.bootstrapCrossSigning({
			authUploadDeviceSigningKeys,
			setupNewCrossSigning: true,
		});
	};

	const validator = (values) => {
		const errors = {};
		if (values.phrase === '12345678') {
			errors.phrase = getText('error.password.12345678');
		} else if (values.phrase === '87654321') {
			errors.phrase = getText('error.password.87654321');
		}
		const PHRASE_REGEX = /^([^\s]){8,127}$/;
		if (values.phrase.length > 0 && !PHRASE_REGEX.test(values.phrase)) {
			errors.phrase = getText('error.password.8127.ns');
		}
		if (values.confirmPhrase.length > 0 && values.confirmPhrase !== values.phrase) {
			errors.confirmPhrase = getText('error.password.dontmatch');
		}
		return errors;
	};

	return (
		<>
			<DialogContent>
				<DialogContentText>
					{translate(
						'crosssigning.intro',
						<b>
							{getText('crosssigning.intro.security_key')}
						</b>
					)}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<LoadingButton
					onClick={() => setup()}
					disabled={genWithPhrase !== undefined}
					loading={genWithPhrase === false}
					fullWidth
				>
					{getText('btn.crosssigning.generate')}
				</LoadingButton>
			</DialogActions>
			<OrDivider />
			<DialogContent>
				<Formik
					initialValues={initialValues}
					onSubmit={(values) => setup(values.phrase)}
					validate={validator}
				>
					{({ values, errors, handleChange, handleSubmit }) => (
						<form
							onSubmit={handleSubmit}
							disabled={genWithPhrase !== undefined}
						>
							<DialogContentText>
								{getText('crosssigning.intro.2')}
							</DialogContentText>
							<TextField
								name="phrase"
								value={values.phrase}
								onChange={handleChange}
								label={getText('label.security_phrase')}
								type="password"
								required
								disabled={genWithPhrase !== undefined}
							/>
							{errors.phrase && (
								<DialogContentText color='error'>
									{errors.phrase}
								</DialogContentText>
							)}
							<TextField
								name="confirmPhrase"
								value={values.confirmPhrase}
								onChange={handleChange}
								label={getText('label.security_phrase.confirm')}
								type="password"
								required
								disabled={genWithPhrase !== undefined}
							/>
							{errors.confirmPhrase && (
								<DialogContentText color='error'>
									{errors.confirmPhrase}
								</DialogContentText>
							)}
							<LoadingButton loading={genWithPhrase === true} variant="contained" color='primary' type="submit" disabled={genWithPhrase !== undefined}>
								{getText('btn.set_phrase_and_generate_key')}
							</LoadingButton>
						</form>
					)}
				</Formik>
			</DialogContent>
		</>
	);
}

const setupDialog = () => {
	openReusableDialog(
		getText('crosssigning.title'),
		() => <CrossSigningSetup />
	);
};

function CrossSigningReset() {
	return (
		<>
			<DialogContent>
				<DialogContentText fontWeight={1.5}>
					{getText('reset_cross_signing.warning')}
				</DialogContentText>
				<DialogContentText>
					{getText('reset_cross_signing.warning.2')}
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button color='danger' variant='contained' onClick={setupDialog}>
					{getText('btn.reset_cross_signing')}
				</Button>
			</DialogActions>
		</>
	);
}

const resetDialog = () => {
	openReusableDialog(
		getText('reset_cross_signing.title'),
		() => <CrossSigningReset />
	);
};

function CrossSignin() {
	const isCSEnabled = useCrossSigningStatus();
	return (
		<SettingTile
			title={getText('cross_signing_tile.title')}
			content={
				<Text variant="b3">
					{getText('cross_signing_tile.desc')}
				</Text>
			}
			options={
				isCSEnabled ? (
					<Button variant='outlined' color="error" onClick={resetDialog}>
						{getText('btn.reset_cross_signing')}
					</Button>
				) : (
					<Button variant='contained' color="primary" onClick={setupDialog}>
						{getText('btn.setup_cross_signing')}
					</Button>
				)
			}
		/>
	);
}

export default CrossSignin;
