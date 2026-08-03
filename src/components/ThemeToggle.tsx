import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={`gap-1.5 text-xs transition-colors border-border bg-card text-foreground hover:bg-muted hover:text-foreground ${className || ""}`}
      title={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4 text-warning" />
          <span className="hidden sm:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Dark Mode</span>
        </>
      )}
    </Button>
  );
}
