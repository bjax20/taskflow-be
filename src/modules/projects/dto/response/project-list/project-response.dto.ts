import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for project list responses
 * Used when listing projects (lightweight version)
 */
export class ProjectResponseDto {
    @ApiProperty({ example: 1, description: "Project ID" })
    public id!: number;

    @ApiProperty({ example: "Q4 Product Launch", description: "Project title" })
    public title!: string;

    @ApiProperty({
        example: "Platform overhaul and feature expansion",
        description: "Project description",
        nullable: true,
    })
    public description!: string | null;

    @ApiProperty({ example: 42, description: "ID of the project owner" })
    public ownerId!: number;

    @ApiProperty({
        example: 5,
        description: "Number of team members including owner",
    })
    public memberCount!: number;

    @ApiProperty({
        example: 23,
        description: "Number of tasks in the project",
    })
    public taskCount!: number;

    @ApiProperty({
        example: "2024-01-15T10:30:00Z",
        description: "Project creation timestamp",
    })
    public createdAt!: Date;
}
