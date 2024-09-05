import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ResilocIndicator } from "../../resiloc-indicators/entities/resiloc-indicator.entity";
import { Scenario } from "../../scenarios/entities/scenario.entity";
import { ResilocScenarioProxyFormulaType as ResilocScenarioFormulaType } from "../enum/resiloc-scenario-associated-proxy.enum";
import { ResilocScenarioMetadataMandatory, ResilocScenarioMetadataType } from "../enum/resiloc-scenario-metadata.enum";
import { ResilocScenarioStatus } from "../enum/resiloc-scenario-status.enum";
import { ResilocScenarioVisibility } from "../enum/resiloc-scenario-visibility.enum";

export class ResilocScenarioMetaData {
    name: string;
    type: ResilocScenarioMetadataType;
    mandatory: ResilocScenarioMetadataMandatory;
    value: string | number;
}

@Entity()
export class ResilocScenario {
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
        enum: ResilocScenarioVisibility,
        enumName: 'ResilocScenarioVisibility'
    })
    @Column({ type: 'enum', enum: ResilocScenarioVisibility, default: ResilocScenarioVisibility.Draft })
    visibility: ResilocScenarioVisibility;

    @ApiProperty({
        enum: ResilocScenarioStatus,
        enumName: 'ResilocScenarioStatus'
    })
    @Column({ type: 'enum', enum: ResilocScenarioStatus, default: ResilocScenarioStatus.Verified })
    status: ResilocScenarioStatus;

    @ApiProperty({
        enum: ResilocScenarioFormulaType,
        enumName: 'FormulaType'
    })
    @Column({ type: 'enum', enum: ResilocScenarioFormulaType, nullable: true })
    formula: ResilocScenarioFormulaType;

    @Exclude()
    @ApiProperty()
    @Column({ type: 'json', default: "[]" })
    metadata: ResilocScenarioMetaData[];

    @ApiProperty()
    @ManyToMany(type => ResilocIndicator)
    @JoinTable()
    resilocIndicators: ResilocIndicator[];

    @OneToMany(type => Scenario, scenario => scenario.resilocScenario)
    scenarios: Scenario[];

    @BeforeInsert()
    textToLowwerCaseInsert() {
        for (let i = 0; i < this.metadata.length; i++) {
            this.metadata[i].name = this.metadata[i].name.replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }

    @BeforeUpdate()
    textToLowwerCaseUpdate() {
        for (let i = 0; i < this.metadata.length; i++) {
            this.metadata[i].name = this.metadata[i].name.replace(/\s\s+/g, ' ').trim().toLowerCase();
        }
    }
}