import { TaskStatus } from "../../../../generated/client";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateTaskStatusDto {
    @IsEnum(TaskStatus)
    @IsNotEmpty()
    public status!: TaskStatus;
}
