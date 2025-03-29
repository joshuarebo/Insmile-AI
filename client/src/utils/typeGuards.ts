import { ApiError, ErrorResponse } from '@/types/common';

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'status' in error
  );
};

export const isErrorResponse = (error: unknown): error is ErrorResponse => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
};

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number';
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
}; 