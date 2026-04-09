import { ApiProperty } from "@nestjs/swagger";

export class UserBaseDto {
    @ApiProperty({ example: 42 })
    public id!: number;

    @ApiProperty({ example: "alice@company.com" })
    public email!: string;

    @ApiProperty({ example: "Alice Johnson" })
    public fullName!: string;
}