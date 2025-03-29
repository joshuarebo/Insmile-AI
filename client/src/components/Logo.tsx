import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export default function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  };

  const subtextSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg"
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className={cn(
        "relative flex items-center justify-center bg-white rounded-xl shadow-md",
        sizes[size]
      )}>
        <img
          src="/generated-icon.png"
          alt="Insmile AI Logo"
          className="w-[90%] h-[90%] object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/15 to-primary-500/10 rounded-xl"></div>
      </div>
      {showText && (
        <div className="ml-4">
          <h1 className={cn(
            "font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent tracking-tight",
            textSizes[size]
          )}>
            Insmile AI
          </h1>
          <p className={cn(
            "text-neutral-500",
            subtextSizes[size]
          )}>
            Dental AI Assistant
          </p>
        </div>
      )}
    </div>
  );
} 