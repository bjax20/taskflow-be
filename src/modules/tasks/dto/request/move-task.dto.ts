import { ApiProperty } from "@nestjs/swagger";
import { TaskStatus } from "../../../../generated/client";
import { IsEnum, IsNumber, IsOptional, Min } from "class-validator";

export class MoveTaskDto {
    @ApiProperty({ enum: TaskStatus, required: false })
    @IsEnum(TaskStatus)
    @IsOptional()
    public status?: TaskStatus;

    @ApiProperty({ required: false })
    @IsNumber()
    @Min(0)
    @IsOptional()
    public position?: number;
}
