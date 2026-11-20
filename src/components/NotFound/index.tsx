import ArrowBackIcon from '@/assets/icons/arrow-back.svg?react';
import SearchIcon from '@/assets/icons/search.svg?react';
import { Link } from '@tanstack/react-router';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';

function NotFound() {
    return (
        <EmptyState icon={<SearchIcon />} title="404" description="Page Not Found">
            <Button startIcon={<ArrowBackIcon />} render={<Link to="/dashboard" />}>
                Go back to the main page
            </Button>
        </EmptyState>
    );
}

export { NotFound };
