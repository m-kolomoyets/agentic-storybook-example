import { useSuspenseQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '@/services/users/queries';
import { MainLayoutHeader } from '@/components/layouts/MainLayoutHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

function Merchants() {
    const { data } = useSuspenseQuery(usersQueryOptions());

    return (
        <>
            <MainLayoutHeader>
                <h1 className="text-heading-s">Merchants</h1>
            </MainLayoutHeader>
            <ul className="flex flex-col gap-m">
                {data.users.map((user) => {
                    return (
                        <li
                            key={user.id}
                            className="flex items-center gap-xl rounded-m border border-border-primary p-l"
                        >
                            <div className="flex items-center gap-l">
                                <Avatar src={user.image} className="size-5xl">
                                    {user.firstName[0]}
                                    {user.lastName[0]}
                                </Avatar>
                                <div className="flex flex-col gap-xxs">
                                    <span className="text-body-s-medium">
                                        {user.firstName} {user.lastName}
                                    </span>
                                    <span className="text-caption-m text-text-general-medium">{user.email}</span>
                                </div>
                            </div>
                            <Badge className="ml-auto" variant="neutral">
                                {user.role}
                            </Badge>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

export { Merchants };
