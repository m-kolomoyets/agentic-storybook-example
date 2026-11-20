import type { FallbackProps } from 'react-error-boundary';
import ErrorIcon from '@/assets/icons/error.svg?react';
import RefreshIcon from '@/assets/icons/refresh.svg?react';
import { getErrorMessage } from 'react-error-boundary';
import { COMMON_ERROR_MESSAGE } from '@/lib/constants';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';

function GlobalError({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <EmptyState icon={<ErrorIcon />} title="Error" description={getErrorMessage(error) || COMMON_ERROR_MESSAGE}>
            <Button startIcon={<RefreshIcon />} onClick={resetErrorBoundary}>
                Retry
            </Button>
        </EmptyState>
    );
}

export { GlobalError };
