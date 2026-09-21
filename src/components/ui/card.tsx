import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground border-border/80 hover:border-emerald-500/30 hover:shadow-lg dark:border-neutral-800/80 dark:bg-neutral-900/60",
        featured:
          "bg-gradient-to-b from-card to-muted/50 border-emerald-500/40 shadow-md dark:from-neutral-900 dark:to-neutral-950",
        darkForest:
          "bg-card-forest text-white border-neutral-800/80 shadow-xl",
        glass:
          "glass border border-white/20 dark:border-neutral-800/60 shadow-xl backdrop-blur-xl",
        interactive:
          "cursor-pointer hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900/60",
      },
      padding: {
        none: "p-0",
        compact: "p-4",
        default: "p-6",
        spacious: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, padding }), className)} {...props} />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xl font-bold leading-tight tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
