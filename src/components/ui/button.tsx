import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight ring-offset-background transition-[color,background-color,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md active:translate-y-[0.5px]',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input/90 bg-card hover:bg-secondary/40 hover:border-primary/25',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/85',
        ghost: 'hover:bg-secondary/50 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline shadow-none',
        gold: 'bg-kenyan-gold-600 text-white shadow-sm hover:bg-kenyan-gold-700',
      },
      size: {
        default: 'min-h-11 px-5 py-2',
        sm: 'h-10 rounded-lg px-4 text-sm font-medium',
        lg: 'min-h-12 rounded-xl px-8 text-base',
        xl: 'min-h-12 rounded-xl px-10 text-base sm:text-lg',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
