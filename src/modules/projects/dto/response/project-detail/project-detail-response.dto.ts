import { ApiProperty } from "@nestjs/swagger";
import { ProjectMemberInDetailDto } from "./project-member-in-detail.dto";
import { UserInDetailedProjectDto } from "./user-in-detailed-project.dto";


export class ProjectDetailResponseDto {
    @ApiProperty({ example: 1, description: "Project ID" })
    public id!: number;

    @ApiProperty({ example: "Q4 Product Launch", description: "Project title" })
    public title!: string;

    @ApiProperty({ example: "Description here", nullable: true })
    public description!: string | null;

    @ApiProperty({ example: 42 })
    public ownerId!: number;

    @ApiProperty({ type: UserInDetailedProjectDto })
    public owner!: UserInDetailedProjectDto;

    @ApiProperty({ type: [ProjectMemberInDetailDto] })
    public members!: ProjectMemberInDetailDto[];

    @ApiProperty({ example: 23 })
    public taskCount!: number;

    @ApiProperty({ example: "2024-01-15T10:30:00Z" })
    public createdAt!: Date;
}