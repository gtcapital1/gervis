import { useState } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

export function CalendarView({ meetings, onDeleteSuccess, onDeleteError, refetchMeetings }: CalendarViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  const handleDeleteMeeting = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    
    try {
      const response = await fetch(`/api/meetings/${meetingToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDeleteSuccess?.();
        refetchMeetings?.();
      } else {
        onDeleteError?.();
      }
    } catch (err) {
      console.error("Error deleting meeting:", err);
      onDeleteError?.();
    }
  };

  return (
    <div className="calendar-view">
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Conferma cancellazione"
        description="Sei sicuro di voler cancellare questo appuntamento? Questa operazione non può essere annullata."
        confirmLabel="Cancella appuntamento"
        onConfirm={confirmDeleteMeeting}
        confirmVariant="destructive"
        showWarningIcon={true}
      />
    </div>
  );
} 