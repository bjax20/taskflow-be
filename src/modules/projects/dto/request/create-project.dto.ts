import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";


/**
 * Data Transfer Object for creating a project
 */
export class CreateProjectDto {
    @ApiProperty({
        description: "Project title",
        example: "Q4 Product Launch",
        minLength: 3,
        maxLength: 100,
    })
    @IsString()
    @MinLength(3, { message: "Title must be at least 3 characters long" })
    @MaxLength(100, { message: "Title cannot exceed 100 characters" })
    public title!: string;

    @ApiProperty({
        description: "Project description (optional)",
        example: "Platform overhaul and feature expansion for Q4",
        maxLength: 500,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, {
        message: "Description cannot exceed 500 characters",
    })
    public description?: string;
}
