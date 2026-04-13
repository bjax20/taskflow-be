import { TaskStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateTaskStatusDto {
    @IsEnum(TaskStatus)
    @IsNotEmpty()
    public status!: TaskStatus;
}
