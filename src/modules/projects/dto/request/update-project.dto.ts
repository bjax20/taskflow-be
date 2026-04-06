import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";


/**
 * Data Transfer Object for updating a project
 * All fields are optional - at least one must be provided
 */
export class UpdateProjectDto {
    @ApiProperty({
        description: "New project title",
        example: "Q4 Product Launch - Updated",
        minLength: 3,
        maxLength: 100,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(3, { message: "Title must be at least 3 characters long" })
    @MaxLength(100, { message: "Title cannot exceed 100 characters" })
    public title?: string;

    @ApiProperty({
        description: "New project description",
        example: "Updated scope with extended timeline",
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
