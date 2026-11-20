import type { ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import ErrorIcon from '@/assets/icons/error.svg?react';
import RefreshIcon from '@/assets/icons/refresh.svg?react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { isHTTPError } from 'ky';
import { COMMON_ERROR_MESSAGE } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';

function ErrorComponent({ error }: ErrorComponentProps) {
    const router = useRouter();
    const queryErrorResetBoundary = useQueryErrorResetBoundary();

    useEffect(
        function resetErrorBoundary() {
            queryErrorResetBoundary.reset();
        },
        [queryErrorResetBoundary]
    );

    return (
        <EmptyState
            icon={<ErrorIcon />}
            title="Error"
            description={(() => {
                if (
                    isHTTPError(error) &&
                    error.data &&
                    typeof error.data === 'object' &&
                    'message' in error.data &&
                    typeof error.data.message === 'string'
                ) {
                    // TODO: The API error messages should be aligned with BE engineers
                    return error.data.message;
                }

                if (error instanceof Error) {
                    return error.message;
                }

                return COMMON_ERROR_MESSAGE;
            })()}
        >
            <Button
                startIcon={<RefreshIcon />}
                onClick={() => {
                    router.invalidate();
                }}
            >
                Retry
            </Button>
        </EmptyState>
    );
}

export { ErrorComponent };
