import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, UserPlus, Mail, Shield, CheckCircle, XCircle, Clock, Send, MoreVertical, Edit, UserX, UserCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCw } from "lucide-react";
import { useState } from "react"
import type { User, Invitation } from "@shared/models/auth";

const ROLES = ["admin", "founder", "marketing", "warehouse", "viewer"] as const;

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(ROLES),
});

export default function UsersPage() {

  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
  });

  // ✅ هون بالزبط الصق كود resendInvitation
  const resendInvitation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/invitations/${id}/resend`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation email has been resent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    },
  });
  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiRequest("PUT", `/api/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Updated", description: "User role has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    }
  });

  const deactivateUser = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/users/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Deactivated", description: "User access has been revoked." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to deactivate user.", variant: "destructive" });
    }
  });

  const reactivateUser = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/users/${id}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Reactivated", description: "User access has been restored." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reactivate user.", variant: "destructive" });
    }
  });

  const activeUsers = users?.filter(u => u.isActive) || [];
  const pendingInvitations = invitations?.filter(i => !i.used) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-2">Manage team access and send invitations.</p>
          </div>
          <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">{activeUsers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Invitations</p>
                <p className="text-2xl font-bold text-foreground">{pendingInvitations.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold text-foreground">{users?.filter(u => u.role === 'admin' || u.role === 'founder').length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Users with access to this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : !users?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              className="h-8 w-8 rounded-full bg-primary/20 object-cover"
                              src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=9333ea&color=fff`}
                              alt=""
                            />
                            <span className="font-medium">{user.firstName} {user.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <RoleBadge role={user.role || "viewer"} />
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                              <XCircle className="h-3 w-3 mr-1" /> Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem 
                                className="text-foreground cursor-pointer"
                                onClick={() => updateUserRole.mutate({ id: user.id, role: "admin" })}
                                disabled={user.role === "admin"}
                              >
                                <Shield className="h-4 w-4 mr-2 text-red-500" /> Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-foreground cursor-pointer"
                                onClick={() => updateUserRole.mutate({ id: user.id, role: "marketing" })}
                                disabled={user.role === "marketing"}
                              >
                                <Edit className="h-4 w-4 mr-2 text-blue-500" /> Set as Marketing
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-foreground cursor-pointer"
                                onClick={() => updateUserRole.mutate({ id: user.id, role: "warehouse" })}
                                disabled={user.role === "warehouse"}
                              >
                                <Edit className="h-4 w-4 mr-2 text-orange-500" /> Set as Warehouse
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-foreground cursor-pointer"
                                onClick={() => updateUserRole.mutate({ id: user.id, role: "viewer" })}
                                disabled={user.role === "viewer"}
                              >
                                <Edit className="h-4 w-4 mr-2 text-gray-500" /> Set as Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.isActive ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive cursor-pointer"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <UserX className="h-4 w-4 mr-2" /> Deactivate
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to deactivate {user.firstName} {user.lastName}? They will lose access to the application.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deactivateUser.mutate(user.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <DropdownMenuItem 
                                  className="text-emerald-500 cursor-pointer"
                                  onClick={() => reactivateUser.mutate(user.id)}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" /> Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Invitations awaiting acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : !invitations?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pending invitations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {inv.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
  <Button
    variant="outline"
    size="sm"
    onClick={() => resendInvitation.mutate(inv.id)}
    disabled={resendInvitation.isPending}
  >
    Resend
  </Button>
</TableCell>

                        <TableCell>
                          <RoleBadge role={inv.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.createdAt ? format(new Date(inv.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.expiresAt ? format(new Date(inv.expiresAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {inv.used ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                            </Badge>
                          ) : new Date(inv.expiresAt) < new Date() ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                              <XCircle className="h-3 w-3 mr-1" /> Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    admin: "bg-red-500/10 text-red-600 border-red-500/20",
    founder: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    marketing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    warehouse: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    viewer: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };
  
  return (
    <Badge variant="outline" className={colorMap[role] || colorMap.viewer}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}

function InviteUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const inviteUser = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      return apiRequest("POST", "/api/invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({ title: "Invitation Sent", description: "User will receive an email invitation." });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
    }
  });
  
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    }
  });

  const onSubmit = (data: z.infer<typeof inviteSchema>) => {
    inviteUser.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90" data-testid="button-invite-user">
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Send an invitation email to add a new team member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address *</label>
            <Input 
              type="email" 
              placeholder="colleague@company.com"
              {...form.register("email")} 
              data-testid="input-invite-email" 
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select onValueChange={(val: any) => form.setValue("role", val)} defaultValue="viewer">
              <SelectTrigger data-testid="select-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                <SelectItem value="warehouse">Warehouse - Inventory management</SelectItem>
                <SelectItem value="marketing">Marketing - Marketing & content</SelectItem>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="founder">Founder - Owner privileges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={inviteUser.isPending} data-testid="button-submit-invite">
              <Send className="mr-2 h-4 w-4" />
              {inviteUser.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
