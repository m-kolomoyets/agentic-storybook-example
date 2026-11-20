import ArrowForwardIcon from '@/assets/icons/arrow-forward.svg?react';
import GridViewIcon from '@/assets/icons/grid-view.svg?react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/Button';

const routeApi = getRouteApi('/_public/');

function Home() {
    const isAuthenticated = routeApi.useRouteContext({
        select(context) {
            return context.auth.isAuthenticated;
        },
    });

    return (
        <main className="min-h-screen bg-linear-to-br from-surface-ground via-surface-ground to-surface-secondary">
            <section className="relative overflow-hidden">
                <div className="relative mx-auto max-w-7xl px-3xl py-8xl lg:px-4xl">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-6xl flex justify-center">
                            <img src="/images/logo-white.svg" alt="Phenomenon Logo" className="h-8xl w-auto" />
                        </div>
                        <h1 className="text-heading-l text-text-general-strong">
                            Welcome to the
                            <span className="block text-text-link-primary-default">Template Admin Panel</span>
                        </h1>
                        <div className="mx-auto mt-4xl max-w-4xl">
                            <p className="mb-4xl text-body-m text-text-general-medium">
                                Vite, React, TypeScript, Tailwind CSS, Base UI, TanStack Router, TanStack Query, Ky,
                                TanStack Form, Zod
                            </p>
                        </div>
                        <div className="mt-6xl flex flex-col items-center justify-center gap-xl sm:flex-row">
                            {isAuthenticated ? (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    endIcon={<GridViewIcon />}
                                    render={<Link to="/dashboard" />}
                                >
                                    Dashboard
                                </Button>
                            ) : (
                                <Button size="lg" endIcon={<ArrowForwardIcon />} render={<Link to="/login" />}>
                                    Login
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export { Home };
