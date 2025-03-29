import { ReactNode, InputHTMLAttributes } from 'react';

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'md' | 'lg' | 'icon';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
  label?: string;
}

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
} 