"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AutocompleteOption<T = string | number> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface AutocompleteProps<T = string | number> {
  options: AutocompleteOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * Standard WargaIn Autocomplete component.
 * Replaces native HTML `<select>` with a searchable, keyboard-navigable combobox.
 */
export function Autocomplete<T extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = "Pilih salah satu...",
  searchPlaceholder = "Cari opsi...",
  emptyText = "Tidak ditemukan hasil yang cocok.",
  className,
  disabled = false,
  allowClear = false,
}: AutocompleteProps<T>) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  const handleSelect = (optionValue: T) => {
    if (onChange) {
      onChange(optionValue);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange("" as unknown as T);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-9 px-3 text-xs font-medium rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-foreground transition-all",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate text-left">
            {selectedOption?.icon && (
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
                {selectedOption.icon}
              </span>
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && selectedOption && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 rounded-xl shadow-xl border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden bg-white dark:bg-[#0E1712]"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9 text-xs" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = String(value) === String(option.value);
                return (
                  <CommandItem
                    key={String(option.value)}
                    value={`${option.label} ${option.sublabel || ""}`}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                    className="text-xs py-2 px-2.5 flex items-center justify-between cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="shrink-0 text-emerald-600 dark:text-emerald-400">
                          {option.icon}
                        </span>
                      )}
                      <div className="flex flex-col truncate">
                        <span className={cn("truncate", isSelected && "font-semibold text-emerald-600 dark:text-emerald-400")}>
                          {option.label}
                        </span>
                        {option.sublabel && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
