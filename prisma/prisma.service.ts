// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    public async onModuleInit() {
        let retries = 5;
        while (retries > 0) {
            try {
                await this.$connect();
                console.log("✅ Database connected");
                break;
            } catch (error: unknown) {
                retries--;

                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown database error";

                console.error(`❌ Connection failed. Retries left: ${retries}`);
                console.error(`Reason: ${errorMessage}`);

                if (retries === 0) {
                    console.error(
                        "❌ Maximum retries reached. Shutting down...",
                    );
                    throw error;
                }

                // Wait 5 seconds before the next loop iteration
                await new Promise((res) => setTimeout(res, 5000));
            }
        }
    }

    public async onModuleDestroy() {
        await this.$disconnect();
    }
}
