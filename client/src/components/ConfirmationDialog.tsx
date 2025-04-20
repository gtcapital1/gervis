import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmVariant?: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link";
  icon?: React.ReactNode;
  showWarningIcon?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  onConfirm,
  onCancel,
  confirmVariant = "default",
  icon,
  showWarningIcon = false,
}: ConfirmationDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {showWarningIcon && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-md text-red-600 mb-4">
            <AlertTriangle className="h-5 w-5" />
            <div className="text-sm">{description}</div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button 
            variant={confirmVariant} 
            onClick={handleConfirm}
          >
            {icon && <span className="mr-2">{icon}</span>}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 