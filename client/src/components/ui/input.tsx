import { InputProps } from '@/types/components';
import { cn } from '@/lib/utils';

export const Input = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  error,
  required = false,
  className,
}: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
