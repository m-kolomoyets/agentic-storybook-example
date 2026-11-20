import { useMutation } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { isHTTPError } from 'ky';
import { FALLBACK_REDIRECT } from '@/lib/constants';
import { focusFirstError } from '@/lib/utils/focusFirstError';
import { loginMutationOptions } from '@/services/authExample/queries';
import { useAppForm } from '@/components/Form';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { loginSchema } from './schemas';

const routeApi = getRouteApi('/_unauthenticated/login/');

function LoginForm() {
    const navigate = routeApi.useNavigate();
    const redirectSearch = routeApi.useSearch({
        select({ redirect }) {
            return redirect;
        },
    });
    const { mutateAsync: login } = useMutation(loginMutationOptions());

    const form = useAppForm({
        defaultValues: {
            username: '',
            password: '',
        },
        validators: {
            onSubmit: loginSchema,
        },
        async onSubmit({ value, formApi }) {
            await login(
                {
                    json: {
                        ...value,
                        // NOTE: For testing purposes, set expiresInMins to 1 minute
                        expiresInMins: 1,
                    },
                },
                {
                    onSuccess() {
                        navigate({
                            to: redirectSearch || FALLBACK_REDIRECT,
                            replace: true,
                        });
                    },
                    onError(error) {
                        if (isHTTPError(error) && typeof error.data === 'object') {
                            formApi.setErrorMap({
                                onSubmit: {
                                    fields: {
                                        // TODO: The API error messages should be aligned with BE engineers
                                        username: {
                                            message: error.data.message,
                                        },
                                        password: {
                                            message: error.data.message,
                                        },
                                    },
                                },
                            });
                        } else {
                            toast.negative({ title: error.message });
                        }
                    },
                }
            );
        },
        onSubmitInvalid({ formApi }) {
            focusFirstError('#login-form', formApi.state.errorMap.onSubmit);
        },
    });

    return (
        <div className="w-full max-w-md p-3xl md:p-4xl">
            <div className="mb-3xl flex flex-col items-center text-center">
                <h1 className="text-heading-m text-text-general-strong">Welcome back</h1>
                <p className="text-body-m text-balance text-text-general-medium">Login to your account</p>
            </div>
            <form
                id="login-form"
                noValidate={true}
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
            >
                <div className="flex flex-col gap-3xl">
                    <form.AppField
                        name="username"
                        children={(field) => {
                            return (
                                <field.FormFieldWrapper label="Username">
                                    <field.InputField placeholder="emilys" autoComplete="username" />
                                </field.FormFieldWrapper>
                            );
                        }}
                    />
                    <div className="flex flex-col gap-s">
                        <form.AppField
                            name="password"
                            children={(field) => {
                                return (
                                    <field.FormFieldWrapper label="Password">
                                        <field.PasswordInputField
                                            placeholder="Enter password"
                                            autoComplete="current-password"
                                        />
                                    </field.FormFieldWrapper>
                                );
                            }}
                        />
                        <Button variant="link-secondary" size="sm" className="self-end" render={<Link to="/login" />}>
                            Forgot your password?
                        </Button>
                    </div>
                    <form.Subscribe
                        selector={(state) => {
                            return [state.canSubmit, state.isSubmitting];
                        }}
                        children={([canSubmit, isSubmitting]) => {
                            return (
                                <Button type="submit" fullWidth={true} disabled={!canSubmit} loading={isSubmitting}>
                                    Login
                                </Button>
                            );
                        }}
                    />
                </div>
            </form>
        </div>
    );
}

export { LoginForm };
