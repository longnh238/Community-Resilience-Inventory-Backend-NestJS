import { ApiProperty } from "@nestjs/swagger";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Indicator } from "../../indicators/entities/indicator.entity";
import { ResilocProxy } from "../../resiloc-proxies/entities/resiloc-proxy.entity";
import { ResilocScenario } from "../../resiloc-scenarios/entities/resiloc-scenario.entity";
import { ResilocIndicatorStatus } from "../enum/resiloc-indicator-status.enum";
import { ResilocIndicatorContextType, ResilocIndicatorCriteriaType, ResilocIndicatorDimensionType } from "../enum/resiloc-indicator-type.enum";
import { ResilocIndicatorVisibility } from "../enum/resiloc-indicator-visibility.enum";

@Entity()
export class ResilocIndicator {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @ApiProperty()
    @Column({ unique: true })
    name: string;

    @ApiProperty()
    @Column()
    description: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateCreated: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateModified: Date;

    @ApiProperty({
        enum: ResilocIndicatorContextType,
        enumName: 'ResilocIndicatorContextType'
    })
    @Column({ type: 'enum', enum: ResilocIndicatorContextType })
    context: ResilocIndicatorContextType;

    @ApiProperty({
        enum: ResilocIndicatorCriteriaType,
        enumName: 'ResilocIndicatorCriteriaType'
    })
    @Column({ type: 'enum', enum: ResilocIndicatorCriteriaType })
    criteria: ResilocIndicatorCriteriaType;

    @ApiProperty({
        enum: ResilocIndicatorDimensionType,
        enumName: 'ResilocIndicatorDimensionType'
    })
    @Column({ type: 'enum', enum: ResilocIndicatorDimensionType, nullable: true })
    dimension: ResilocIndicatorDimensionType;

    @ApiProperty()
    @Column("text", { array: true, default: {} })
    tags: string[];

    @ApiProperty({
        enum: ResilocIndicatorVisibility,
        enumName: 'ResilocIndicatorVisibility'
    })
    @Column({ type: 'enum', enum: ResilocIndicatorVisibility, default: ResilocIndicatorVisibility.Draft })
    visibility: ResilocIndicatorVisibility;

    @ApiProperty({
        enum: ResilocIndicatorStatus,
        enumName: 'ResilocIndicatorStatus'
    })
    @Column({ type: 'enum', enum: ResilocIndicatorStatus, default: ResilocIndicatorStatus.Requested })
    status: ResilocIndicatorStatus;

    @ApiProperty()
    @ManyToMany(type => ResilocScenario)
    resilocScenarios: ResilocScenario[];

    @ApiProperty()
    @ManyToMany(type => ResilocProxy)
    @JoinTable()
    resilocProxies: ResilocProxy[];

    @OneToMany(type => Indicator, indicator => indicator.resilocIndicator)
    indicators: Indicator[];

    @BeforeInsert()
    textToLowwerCaseInsert() {
        for (let i = 0; i < this.tags.length; i++) {
            this.tags[i] = this.tags[i].replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }

    @BeforeUpdate()
    textToLowwerCaseUpdate() {
        for (let i = 0; i < this.tags.length; i++) {
            this.tags[i] = this.tags[i].replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }
}