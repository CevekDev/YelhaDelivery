import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors min-h-0',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-muted text-foreground border border-border',
        success: 'bg-success/10 text-success border border-success/20',
        warning: 'bg-warning/10 text-warning border border-warning/30',
        destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
        info: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
        cyan: 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
