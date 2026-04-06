import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for project members
 * Used when retrieving the members list of a project
 */
export class ProjectMemberDto {
    @ApiProperty({ example: 42, description: "User ID" })
    public id!: number;

    @ApiProperty({ example: "alice@company.com", description: "User email" })
    public email!: string;

    @ApiProperty({
        example: true,
        description: "Whether this user is the project owner",
    })
    public isOwner!: boolean;
}
