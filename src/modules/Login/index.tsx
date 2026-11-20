import { Link } from '@tanstack/react-router';
import { LoginForm } from '@/components/LoginForm';

const LOGO_LINK_CLASSES =
    'flex w-fit items-center rounded-s outline-none focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-border-focused focus-visible:outline-solid';

function Login() {
    return (
        <div className="grid h-full lg:grid-cols-2">
            <div className="relative hidden flex-col justify-between bg-surface-elevated p-5xl lg:flex">
                <Link className={LOGO_LINK_CLASSES} to="/login">
                    <img className="h-3xl w-fit" src="/images/logo-white.svg" alt="Phenomenon logo" />
                </Link>
                <h3 className="text-heading-s text-text-general-strong">Where big ideas meet bold execution</h3>
            </div>
            <div className="flex flex-col gap-xl p-3xl md:p-5xl">
                <div className="flex flex-col items-center justify-center gap-m lg:hidden">
                    <Link to="/login" className={LOGO_LINK_CLASSES}>
                        <img className="h-3xl w-fit" src="/images/logo-white.svg" alt="Phenomenon logo" />
                    </Link>
                    <h3 className="text-body-m text-text-general-medium">Where big ideas meet bold execution</h3>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}

export { Login };
