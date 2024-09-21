import {
    Box,
    Input,
    Overlay,
    OverlayBackdrop,
    OverlayCenter,
    Spinner,
    Text,
    color,
} from 'folds';
import React, { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import {
    AuthDict,
    AuthType,
    IAuthData,
    MatrixError,
    RegisterRequest,
    UIAFlow,
    createClient,
} from 'matrix-js-sdk';
import { PasswordInput } from '../../../components/password-input/PasswordInput';
import {
    getLoginTermUrl,
    getUIAFlowForStages,
    hasStageInFlows,
    requiredStageInFlows,
} from '../../../utils/matrix-uia';
import { useUIACompleted, useUIAFlow, useUIAParams } from '../../../hooks/useUIAFlows';
import { AsyncState, AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { RegisterError, RegisterResult, register, useRegisterComplete } from './registerUtil';
import { FieldError } from '../FiledError';
import {
    AutoDummyStageDialog,
    AutoTermsStageDialog,
    EmailStageDialog,
    ReCaptchaStageDialog,
    RegistrationTokenStageDialog,
} from '../../../components/uia-stages';
import { useRegisterEmail } from '../../../hooks/useRegisterEmail';
import { ConfirmPasswordMatch } from '../../../components/ConfirmPasswordMatch';
import { UIAFlowOverlay } from '../../../components/UIAFlowOverlay';
import { RequestEmailTokenCallback, RequestEmailTokenResponse } from '../../../hooks/types';
import { getText } from '../../../../lang';
import cons from '../../../../client/state/cons';
import { Button, Checkbox, FormControlLabel, TextField } from '@mui/material';

export const SUPPORTED_REGISTER_STAGES = [
    AuthType.RegistrationToken,
    AuthType.Terms,
    AuthType.Recaptcha,
    AuthType.Email,
    AuthType.Dummy,
];
type RegisterFormInputs = {
    usernameInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    confirmPasswordInput: HTMLInputElement;
    tokenInput?: HTMLInputElement;
    emailInput?: HTMLInputElement;
    termsInput?: HTMLInputElement;
};

type FormData = {
    username: string;
    password: string;
    token?: string;
    email?: string;
    terms?: boolean;
    clientSecret: string;
};

const pickStages = (uiaFlows: UIAFlow[], formData: FormData): string[] => {
    const pickedStages: string[] = [];
    if (formData.token) pickedStages.push(AuthType.RegistrationToken);
    if (formData.email) pickedStages.push(AuthType.Email);
    if (formData.terms) pickedStages.push(AuthType.Terms);
    if (hasStageInFlows(uiaFlows, AuthType.Recaptcha)) {
        pickedStages.push(AuthType.Recaptcha);
    }

    return pickedStages;
};

type RegisterUIAFlowProps = {
    formData: FormData;
    flow: UIAFlow;
    authData: IAuthData;
    registerEmailState: AsyncState<RequestEmailTokenResponse, MatrixError>;
    registerEmail: RequestEmailTokenCallback;
    onRegister: (registerReqData: RegisterRequest) => void;
};
function RegisterUIAFlow({
    formData,
    flow,
    authData,
    registerEmailState,
    registerEmail,
    onRegister,
}: RegisterUIAFlowProps) {
    const completed = useUIACompleted(authData);
    const { getStageToComplete } = useUIAFlow(authData, flow);

    const stageToComplete = getStageToComplete();

    const handleAuthDict = useCallback(
        (authDict: AuthDict) => {
            const { password, username } = formData;
            onRegister({
                auth: authDict,
                password,
                username,
                initial_device_display_name: `${cons.name} Web`,
            });
        },
        [onRegister, formData]
    );

    const handleCancel = useCallback(() => {
        window.location.reload();
    }, []);

    if (!stageToComplete) return null;
    return (
        <UIAFlowOverlay
            currentStep={completed.length + 1}
            stepCount={flow.stages.length}
            onCancel={handleCancel}
        >
            {stageToComplete.type === AuthType.RegistrationToken && (
                <RegistrationTokenStageDialog
                    token={formData.token}
                    stageData={stageToComplete}
                    submitAuthDict={handleAuthDict}
                    onCancel={handleCancel}
                />
            )}
            {stageToComplete.type === AuthType.Terms && (
                <AutoTermsStageDialog
                    stageData={stageToComplete}
                    submitAuthDict={handleAuthDict}
                    onCancel={handleCancel}
                />
            )}
            {stageToComplete.type === AuthType.Recaptcha && (
                <ReCaptchaStageDialog
                    stageData={stageToComplete}
                    submitAuthDict={handleAuthDict}
                    onCancel={handleCancel}
                />
            )}
            {stageToComplete.type === AuthType.Email && (
                <EmailStageDialog
                    email={formData.email}
                    clientSecret={formData.clientSecret}
                    stageData={stageToComplete}
                    requestEmailToken={registerEmail}
                    emailTokenState={registerEmailState}
                    submitAuthDict={handleAuthDict}
                    onCancel={handleCancel}
                />
            )}
            {stageToComplete.type === AuthType.Dummy && (
                <AutoDummyStageDialog
                    stageData={stageToComplete}
                    submitAuthDict={handleAuthDict}
                    onCancel={handleCancel}
                />
            )}
        </UIAFlowOverlay>
    );
}

type PasswordRegisterFormProps = {
    authData: IAuthData;
    uiaFlows: UIAFlow[];
    defaultUsername?: string;
    defaultEmail?: string;
    defaultRegisterToken?: string;
};
export function PasswordRegisterForm({
    authData,
    uiaFlows,
    defaultUsername,
    defaultEmail,
    defaultRegisterToken,
}: PasswordRegisterFormProps) {
    const serverDiscovery = useAutoDiscoveryInfo();
    const baseUrl = serverDiscovery['m.homeserver'].base_url;
    const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);
    const params = useUIAParams(authData);
    const termUrl = getLoginTermUrl(params);
    const [formData, setFormData] = useState<FormData>();

    const [ongoingFlow, setOngoingFlow] = useState<UIAFlow>();

    const [registerEmailState, registerEmail] = useRegisterEmail(mx);

    const [registerState, handleRegister] = useAsyncCallback<
        RegisterResult,
        MatrixError,
        [RegisterRequest]
    >(useCallback(async (registerReqData) => register(mx, registerReqData), [mx]));
    const [ongoingAuthData, customRegisterResp] =
        registerState.status === AsyncStatus.Success ? registerState.data : [];
    const registerError =
        registerState.status === AsyncStatus.Error ? registerState.error : undefined;

    useRegisterComplete(customRegisterResp);

    const handleSubmit: ChangeEventHandler<HTMLFormElement> = (evt) => {
        evt.preventDefault();
        const {
            usernameInput,
            passwordInput,
            confirmPasswordInput,
            emailInput,
            tokenInput,
            termsInput,
        } = evt.target as HTMLFormElement & RegisterFormInputs;
        const token = tokenInput?.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (password !== confirmPassword) {
            return;
        }
        const email = emailInput?.value.trim();
        const terms = termsInput?.value === 'on';

        if (!username) {
            usernameInput.focus();
            return;
        }

        const fData: FormData = {
            username,
            password,
            token,
            email,
            terms,
            clientSecret: mx.generateClientSecret(),
        };
        const pickedStages = pickStages(uiaFlows, fData);
        const pickedFlow = getUIAFlowForStages(uiaFlows, pickedStages);
        setOngoingFlow(pickedFlow);
        setFormData(fData);
        handleRegister({
            username,
            password,
            auth: {
                session: authData.session,
            },
            initial_device_display_name: `${cons.name} Web`,
        });
    };

    return (
        <>
            <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
                <Box direction="Column" gap="100">
                    <TextField
                        variant='filled'
                        name='usernameInput'
                        defaultValue={defaultUsername}
                        label={getText('form.username')}
                        required
                    />
                    {registerError?.errcode === RegisterError.UserTaken && (
                        <FieldError message={getText('error.register.user_taken')} />
                    )}
                    {registerError?.errcode === RegisterError.UserInvalid && (
                        <FieldError message={getText('error.register.user_invalid')} />
                    )}
                    {registerError?.errcode === RegisterError.UserExclusive && (
                        <FieldError message={getText('error.register.user_exclusive')} />
                    )}
                </Box>
                <ConfirmPasswordMatch initialValue>
                    {(match, doMatch, passRef, confPassRef) => (
                        <>
                            <Box direction="Column" gap="100">
                                <TextField
                                    variant='filled'
                                    name='passwordInput'
                                    type='password'
                                    label={getText('form.password')}
                                    onChange={doMatch}
                                    required
                                    ref={passRef}
                                />
                                {registerError?.errcode === RegisterError.PasswordWeak && (
                                    <FieldError
                                        message={
                                            registerError.data.error ??
                                            getText('error.register.password_weak')
                                        }
                                    />
                                )}
                                {registerError?.errcode === RegisterError.PasswordShort && (
                                    <FieldError
                                        message={
                                            registerError.data.error ??
                                            getText('error.register.password_short')
                                        }
                                    />
                                )}
                            </Box>
                            <Box direction="Column" gap="100">
                                <TextField
                                    variant='filled'
                                    name='confirmPasswordInput'
                                    type='password'
                                    label={getText('form.confirm_password')}
                                    required
                                    onChange={doMatch}
                                    color={match ? 'primary' : 'error'}
                                    ref={confPassRef}
                                />
                            </Box>
                        </>
                    )}
                </ConfirmPasswordMatch>
                {hasStageInFlows(uiaFlows, AuthType.RegistrationToken) && (
                    <Box direction="Column" gap="100">
                        <TextField
                            variant='filled'
                            name='tokenInput'
                            defaultValue={defaultRegisterToken}
                            required={requiredStageInFlows(uiaFlows, AuthType.Email)}
                            label={requiredStageInFlows(uiaFlows, AuthType.RegistrationToken)
                                ? getText('form.register.token')
                                : getText('form.register.token_optional')}
                        />
                    </Box>
                )}
                {hasStageInFlows(uiaFlows, AuthType.Email) && (
                    <Box direction="Column" gap="100">
                        <TextField
                            variant='filled'
                            name='emailInput'
                            type='email'
                            defaultValue={defaultEmail}
                            required={requiredStageInFlows(uiaFlows, AuthType.Email)}
                            label={requiredStageInFlows(uiaFlows, AuthType.Email) ? getText('form.register.email') : getText('form.register.email_optional')}
                        />
                    </Box>
                )}

                {hasStageInFlows(uiaFlows, AuthType.Terms) && termUrl && (
                    <Box>
                        <FormControlLabel
                            required
                            label={(
                                <span>
                                    {getText('form.register.accept_tos_1')}
                                    <a href={termUrl} target="_blank" rel="noreferrer">
                                        {getText('form.register.accept_tos_link')}
                                    </a>
                                    {getText('form.register.accept_tos_2')}
                                </span>
                            )}
                            control={<Checkbox name='termsInput' />}
                        />
                    </Box>
                )}
                {registerError?.errcode === RegisterError.RateLimited && (
                    <FieldError message={getText('error.register.rate_limited')} />
                )}
                {registerError?.errcode === RegisterError.Forbidden && (
                    <FieldError message={getText('error.register.forbidden')} />
                )}
                {registerError?.errcode === RegisterError.InvalidRequest && (
                    <FieldError message={getText('error.register.invalid_request')} />
                )}
                {registerError?.errcode === RegisterError.Unknown && (
                    <FieldError message={registerError.data.error ?? getText('error.register.unknown_reason')} />
                )}
                <span data-spacing-node />
                <Button variant='contained' type="submit">
                    {getText('register.register_button')}
                </Button>
            </Box>
            {registerState.status === AsyncStatus.Success &&
                formData &&
                ongoingFlow &&
                ongoingAuthData && (
                    <RegisterUIAFlow
                        formData={formData}
                        flow={ongoingFlow}
                        authData={ongoingAuthData}
                        registerEmail={registerEmail}
                        registerEmailState={registerEmailState}
                        onRegister={handleRegister}
                    />
                )}
            {registerState.status === AsyncStatus.Loading && (
                <Overlay open backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                        <Spinner variant="Secondary" size="600" />
                    </OverlayCenter>
                </Overlay>
            )}
        </>
    );
}
