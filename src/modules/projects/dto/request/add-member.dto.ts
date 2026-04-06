import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

/**
 * Data Transfer Object for adding a member to a project
 */
export class AddMemberDto {
    @ApiProperty({
        description: "The ID of the user to add as a member",
        example: 42,
        type: Number,
        minimum: 1,
    })
    @IsInt({ message: "userId must be an integer" })
    @Min(1, { message: "userId must be at least 1" })
    public userId!: number;
}
