import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ResilocIndicator } from "../../resiloc-indicators/entities/resiloc-indicator.entity";
import { ResilocProxy } from "../../resiloc-proxies/entities/resiloc-proxy.entity";
import { Scenario } from "../../scenarios/entities/scenario.entity";
import { StaticProxy } from "../../static-proxies/entities/static-proxy.entity";
import { IndicatorVisibility } from "../enum/indicator-visibility.enum";

@Entity()
export class Indicator {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @ApiProperty()
    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateCreated: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    dateModified: Date;

    @ApiProperty({
        enum: IndicatorVisibility,
        enumName: 'IndicatorVisibility'
    })
    @Column({ type: 'enum', enum: IndicatorVisibility, default: IndicatorVisibility.Draft })
    visibility: IndicatorVisibility;

    @ApiProperty({ type: () => ResilocIndicator })
    @ManyToOne(type => ResilocIndicator, resilocIndicator => resilocIndicator.indicators, { eager: true })
    @JoinColumn({ name: "resilocIndicator_id" })
    resilocIndicator: ResilocIndicator;

    @ApiProperty()
    @ManyToMany(type => Scenario)
    scenarios: Scenario[];

    @ApiProperty()
    @ManyToMany(type => StaticProxy)
    @JoinTable()
    staticProxies: StaticProxy[];
}