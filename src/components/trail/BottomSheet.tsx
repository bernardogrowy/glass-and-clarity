import type { ReactNode } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

/**
 * Folha que sobe da base (cartão da lição, seções e unidades). Usa o vaul do projeto, mas com
 * fundo suave e desfocado em vez do preto pesado do `Drawer` padrão, como no design da trilha.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lido por leitores de tela (a folha mostra o próprio título visual no conteúdo). */
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[3px]" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] max-w-md flex-col rounded-t-[2rem]",
            "bg-card outline-none",
            className,
          )}
        >
          <DrawerPrimitive.Title className="sr-only">{title}</DrawerPrimitive.Title>
          <DrawerPrimitive.Description className="sr-only">
            {description ?? title}
          </DrawerPrimitive.Description>
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-foreground/15"
          />
          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
