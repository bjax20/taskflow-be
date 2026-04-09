export interface AddMemberResponse {
    message: string;
    member: {
        userId: number;
        projectId: number;
        user: {
            id: number;
            email: string;
            fullName: string;
        };
    };
}