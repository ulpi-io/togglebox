import { getUsersApi } from '@/lib/api/users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { DeleteUserButton } from '@/components/users/delete-user-button';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await getUsersApi();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-black text-white';
      case 'developer':
        return 'bg-gray-600 text-white';
      case 'viewer':
        return 'bg-gray-300 text-black';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">Users</h1>
          <p className="text-muted-foreground">
            Manage user access and permissions
          </p>
        </div>
        <CreateUserDialog />
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-black mb-2">No Users Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first user to get started
            </p>
            <CreateUserDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-2xl font-black">
                        {user.email}
                      </CardTitle>
                      <span className={`px-3 py-1 text-xs font-black ${getRoleBadgeColor(user.role)}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-bold">User ID</div>
                    <div className="text-muted-foreground font-mono text-xs">{user.id}</div>
                  </div>

                  <div>
                    <div className="font-bold">Created</div>
                    <div className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t-2 border-black space-x-2">
                  <DeleteUserButton userId={user.id} userEmail={user.email} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
