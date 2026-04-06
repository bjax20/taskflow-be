import { ApiProperty } from "@nestjs/swagger";

export class ProjectMemberInDetailDto {
    @ApiProperty({ example: 2, description: "User ID" })
    public id!: number;

    @ApiProperty({ example: "bob@company.com", description: "User email" })
    public email!: string;
}