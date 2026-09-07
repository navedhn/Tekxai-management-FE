import React from 'react';
import { cn } from '@/utils/cn';

type HeadingLevel = 1 | 2 | 3 | 4;

const HEADING_CLASS: Record<HeadingLevel, string> = {
  1: 'text-h1',
  2: 'text-h2',
  3: 'text-h3',
  4: 'text-h4',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel;
  as?: keyof JSX.IntrinsicElements;
}

export const Heading: React.FC<HeadingProps> = ({ level, as, className, children, ...rest }) => {
  const Tag = (as ?? (`h${level}` as keyof JSX.IntrinsicElements)) as any;
  return (
    <Tag className={cn(HEADING_CLASS[level], 'text-(--color-text-primary)', className)} {...rest}>
      {children}
    </Tag>
  );
};

type TextVariant = 'body' | 'small' | 'label' | 'table-header' | 'button' | 'badge';

const TEXT_CLASS: Record<TextVariant, string> = {
  body: 'text-body',
  small: 'text-small',
  label: 'text-label uppercase tracking-wide',
  'table-header': 'text-table-header uppercase tracking-wide',
  button: 'text-button',
  badge: 'text-badge uppercase tracking-wide',
};

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TextVariant;
  as?: keyof JSX.IntrinsicElements;
  muted?: boolean;
}

export const Text: React.FC<TextProps> = ({ variant = 'body', as, muted, className, children, ...rest }) => {
  const Tag = (as ?? 'span') as any;
  return (
    <Tag
      className={cn(TEXT_CLASS[variant], muted ? 'text-(--color-text-secondary)' : 'text-(--color-text-primary)', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};
