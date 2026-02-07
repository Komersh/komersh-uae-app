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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {invitationsLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Loading...
              </TableCell>
            </TableRow>
          ) : !invitations?.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                    </Badge>
                  ) : new Date(inv.expiresAt) < new Date() ? (
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/20"
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Expired
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
