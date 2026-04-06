import { ApiProperty } from "@nestjs/swagger";

export class UserInProjectDto {
    @ApiProperty({ example: 42, description: "User ID" })
    public id!: number;

    @ApiProperty({ example: "alice@company.com", description: "User email" })
    public email!: string;
}