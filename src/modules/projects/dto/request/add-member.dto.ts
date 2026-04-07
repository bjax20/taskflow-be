import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

/**
 * Data Transfer Object for adding a member to a project via email
 */
export class AddMemberDto {
    @ApiProperty({
        description: "The registered email address of the user to add",
        example: "colleague@company.com",
        type: String,
    })
    @IsEmail({}, { message: "Please provide a valid email address" })
    @IsNotEmpty({ message: "Email is required" })
    public email!: string;
}