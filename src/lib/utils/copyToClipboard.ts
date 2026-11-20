import { COMMON_ERROR_MESSAGE } from '@/lib/constants';
import { toast } from '@/components/ui/Toast';

export const copyToClipboard = async (value: string, successMessage?: string) => {
    try {
        await navigator.clipboard.writeText(value);
        toast.positive({ title: successMessage ?? 'Copied to clipboard' });
    } catch (error) {
        if (error instanceof DOMException) {
            toast.negative({ title: error.message });
        } else {
            toast.negative({ title: COMMON_ERROR_MESSAGE });
        }
    }
};
