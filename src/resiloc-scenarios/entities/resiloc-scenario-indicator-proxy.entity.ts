import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ResilocScenarioIndicatorProxy {
     @ApiProperty()
     @PrimaryColumn()
     _id: string;

     @ApiProperty()
     @Column({ type: 'decimal', nullable: true, default: null })
     relevance: number;

     @ApiProperty()
     @Column({ type: 'decimal', nullable: true, default: null })
     direction: number;

     @ApiProperty()
     @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
     dateCreated: Date;

     @ApiProperty()
     @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
     dateModified: Date;
}