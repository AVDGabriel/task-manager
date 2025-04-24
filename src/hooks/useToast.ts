import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { FirebaseError } from 'firebase/app';

export function useToast() {
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    console.error(error);
    
    if (error instanceof FirebaseError) {
      // Handle Firebase/Firestore errors
      switch (error.code) {
        // Permission errors
        case 'permission-denied':
          toast.error('You don\'t have permission to perform this action');
          break;
        
        // Document errors
        case 'not-found':
          toast.error('The requested resource was not found');
          break;
        
        // Network errors
        case 'unavailable':
          toast.error('The service is currently unavailable. Please check your internet connection');
          break;
        case 'network-request-failed':
          toast.error('Network error. Please check your internet connection');
          break;
        
        // Data errors
        case 'invalid-argument':
          toast.error('Invalid data provided. Please check your input');
          break;
        case 'failed-precondition':
          toast.error('Operation failed. The system is not in the correct state');
          break;
        
        // Internal errors
        case 'internal':
          toast.error('An internal error occurred. Please try again later');
          break;
        case 'data-loss':
          toast.error('Critical error: Data loss occurred. Please contact support');
          break;
        
        // Operation errors
        case 'deadline-exceeded':
          toast.error('The operation timed out. Please try again');
          break;
        case 'cancelled':
          // Don't show toast for cancelled operations
          break;
        case 'already-exists':
          toast.error('This item already exists');
          break;
        case 'resource-exhausted':
          toast.error('Too many requests. Please try again later');
          break;
        
        // Unhandled Firebase errors
        default:
          toast.error(customMessage || 'An error occurred while processing your request');
          // Log unhandled Firebase errors for monitoring
          console.warn('Unhandled Firebase error:', error.code, error.message);
      }
    } else if (error instanceof Error) {
      // Handle standard JavaScript errors
      toast.error(customMessage || error.message);
    } else {
      // Handle unknown errors
      toast.error(customMessage || 'An unexpected error occurred');
      // Log unknown errors for monitoring
      console.warn('Unknown error type:', error);
    }
  }, []);

  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  return { handleError, showSuccess };
} 