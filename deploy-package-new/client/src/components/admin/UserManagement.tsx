import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

type User = {
  id: number;
  name: string;
  email: string;
  username: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
};

export function UserManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | "delete" | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch all users
  const {
    data: users,
    isLoading,
    isError,
  } = useQuery<{ success: boolean; users: User[] }>({
    queryKey: ["/api/admin/users"],
    throwOnError: false,
  });

  // Pending users calculation
  const pendingUsers = users?.users.filter(user => user.approvalStatus === "pending") || [];
  const approvedUsers = users?.users.filter(user => user.approvalStatus === "approved") || [];
  const rejectedUsers = users?.users.filter(user => user.approvalStatus === "rejected") || [];

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: t("admin.user_approved"),
        description: t("admin.user_approved_desc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("error.title"),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: t("admin.user_rejected"),
        description: t("admin.user_rejected_desc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("error.title"),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: t("admin.user_deleted"),
        description: t("admin.user_deleted_desc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("error.title"),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle user action
  const handleUserAction = (user: User, action: "approve" | "reject" | "delete") => {
    setSelectedUser(user);
    setDialogAction(action);
    setShowDialog(true);
  };

  // Execute action when confirmed
  const confirmAction = () => {
    if (!selectedUser) return;
    
    switch (dialogAction) {
      case "approve":
        approveMutation.mutate(selectedUser.id);
        break;
      case "reject":
        rejectMutation.mutate(selectedUser.id);
        break;
      case "delete":
        deleteMutation.mutate(selectedUser.id);
        break;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get dialog title and content based on action
  const getDialogContent = () => {
    if (!selectedUser) return { title: "", content: "" };
    
    switch (dialogAction) {
      case "approve":
        return {
          title: t("admin.approve_user_title"),
          content: t("admin.approve_user_content", { name: selectedUser.name || selectedUser.email }),
        };
      case "reject":
        return {
          title: t("admin.reject_user_title"),
          content: t("admin.reject_user_content", { name: selectedUser.name || selectedUser.email }),
        };
      case "delete":
        return {
          title: t("admin.delete_user_title"),
          content: t("admin.delete_user_content", { name: selectedUser.name || selectedUser.email }),
        };
      default:
        return { title: "", content: "" };
    }
  };

  // Get badge for user status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> {t("admin.status_pending")}</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> {t("admin.status_approved")}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" /> {t("admin.status_rejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">{t("common.loading")}</div>;
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        {t("error.loading_data")}
      </div>
    );
  }

  const dialogContent = getDialogContent();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users_management")}</CardTitle>
          <CardDescription>
            {t("admin.users_management_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{t("admin.pending_approvals")}</h3>
            <Table>
              <TableCaption>{t("admin.pending_approvals_caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("admin.email")}</TableHead>
                  <TableHead>{t("admin.registered_on")}</TableHead>
                  <TableHead>{t("admin.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("admin.no_pending_users")}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(user.approvalStatus)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-2 text-green-600 hover:text-green-800 hover:bg-green-100"
                          onClick={() => handleUserAction(user, "approve")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> {t("admin.approve")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          onClick={() => handleUserAction(user, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> {t("admin.reject")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{t("admin.approved_users")}</h3>
            <Table>
              <TableCaption>{t("admin.approved_users_caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("admin.email")}</TableHead>
                  <TableHead>{t("admin.registered_on")}</TableHead>
                  <TableHead>{t("admin.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("admin.no_approved_users")}
                    </TableCell>
                  </TableRow>
                ) : (
                  approvedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(user.approvalStatus)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          onClick={() => handleUserAction(user, "delete")}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> {t("admin.delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">{t("admin.rejected_users")}</h3>
            <Table>
              <TableCaption>{t("admin.rejected_users_caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("admin.email")}</TableHead>
                  <TableHead>{t("admin.registered_on")}</TableHead>
                  <TableHead>{t("admin.status")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("admin.no_rejected_users")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rejectedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(user.approvalStatus)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-2 text-green-600 hover:text-green-800 hover:bg-green-100"
                          onClick={() => handleUserAction(user, "approve")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> {t("admin.approve")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          onClick={() => handleUserAction(user, "delete")}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> {t("admin.delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.content}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={
                dialogAction === "approve" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {dialogAction === "approve" 
                ? t("admin.confirm_approve") 
                : dialogAction === "reject" 
                  ? t("admin.confirm_reject") 
                  : t("admin.confirm_delete")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}