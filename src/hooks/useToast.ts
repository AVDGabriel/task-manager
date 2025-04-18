import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';

export function useToast() {
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    console.error(error);
    
    if (error instanceof FirebaseError) {
      // Handle Firebase errors
      switch (error.code) {
        case 'permission-denied':
          toast.error('You don\'t have permission to perform this action');
          break;
        case 'not-found':
          toast.error('The requested resource was not found');
          break;
        case 'cancelled':
          // Don't show toast for cancelled operations
          break;
        default:
          toast.error(customMessage || 'An error occurred while processing your request');
      }
    } else if (error instanceof Error) {
      // Handle standard JavaScript errors
      toast.error(customMessage || error.message);
    } else {
      // Handle unknown errors
      toast.error(customMessage || 'An unexpected error occurred');
    }
  }, []);

  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  return { handleError, showSuccess };
} 