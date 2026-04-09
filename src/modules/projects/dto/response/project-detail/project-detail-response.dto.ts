import { ApiProperty } from "@nestjs/swagger";
import { UserBaseDto } from "../../../../users/dto/user-base.dto";

export class ProjectDetailResponseDto {
    @ApiProperty({ example: 1, description: "Project ID" })
    public id!: number;

    @ApiProperty({ example: "Q4 Product Launch", description: "Project title" })
    public title!: string;

    @ApiProperty({ example: "Description here", nullable: true })
    public description!: string | null;

    @ApiProperty({ example: 42 })
    public ownerId!: number;

    @ApiProperty({ type: UserBaseDto })
    public owner!: UserBaseDto;

    @ApiProperty({ type: [UserBaseDto] })
    public members!: UserBaseDto[];

    @ApiProperty({ example: 23 })
    public taskCount!: number;

    @ApiProperty({ example: "2024-01-15T10:30:00Z" })
    public createdAt!: Date;
}