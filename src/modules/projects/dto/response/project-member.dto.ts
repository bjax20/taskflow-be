import { ApiProperty } from "@nestjs/swagger";
import { UserBaseDto } from "../../../users/dto/user-base.dto";

/**
 * Data Transfer Object for project members
 * Used when retrieving the members list of a project
 */
export class ProjectMemberDto extends UserBaseDto {
    @ApiProperty({
        example: true,
        description: "Whether this user is the project owner",
    })
    public isOwner!: boolean;
}
