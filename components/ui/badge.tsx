import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors min-h-0',
  {
    variants: {
      variant: {
        default: 'bg-primary/20 text-primary-light border border-primary/30',
        secondary: 'bg-card text-foreground border border-border',
        success: 'bg-success/20 text-success border border-success/30',
        warning: 'bg-warning/20 text-warning border border-warning/30',
        destructive: 'bg-destructive/20 text-destructive border border-destructive/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
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
